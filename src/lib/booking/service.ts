import type { Db } from "../db/client";
import { calculateDeposit } from "../core/deposit";
import { generateAccessToken, generateReference } from "../core/reference";
import { localDateOf, localToUtc } from "../core/time";
import { formatGBP } from "../core/money";
import { notifyCustomer, notifyOwner } from "../notify";
import {
  addBookingEvent,
  getBooking,
  getTreatment,
  listBookings,
  upsertCustomer,
} from "../repo";
import { getSettings } from "../settings";
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from "../status";
import type { Booking, BookingStatus, PaymentKind, PaymentMethod, PaymentStatus } from "../types";
import { DIARY_STATUSES } from "../types";
import { computeAvailability } from "./availability";

export type BookingErrorCode =
  | "SLOT_UNAVAILABLE"
  | "INVALID"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "DEPOSIT_NOT_RECORDED";

export class BookingError extends Error {
  constructor(public code: BookingErrorCode, message: string) {
    super(message);
  }
}

const SLOT_TAKEN = "Sorry — that time has just been taken. Please choose another time.";
const LOCK_KEY = 727275;

function isOverlapViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23P01";
}

async function mustGet(db: Db, id: string): Promise<Booking> {
  const b = await getBooking(db, id);
  if (!b) throw new BookingError("NOT_FOUND", "Booking not found");
  return b;
}

function assertStatus(b: Booking, allowed: BookingStatus[], action: string) {
  if (!allowed.includes(b.status)) {
    throw new BookingError("INVALID_STATE", `Can't ${action} a booking that is ${b.status.replace("_", " ")}.`);
  }
}

// ── Expiry ─────────────────────────────────────────────────────

async function expireInside(db: Db, now: Date): Promise<string[]> {
  const rows = await db.query<{ id: string }>(
    `update bookings set status = 'expired', cancelled_at = $1, updated_at = now()
     where status = 'pending_payment' and payment_due_at is not null and payment_due_at <= $1
     returning id`,
    [now]
  );
  for (const r of rows) await addBookingEvent(db, r.id, "expired", "Deposit not recorded before the payment deadline");
  return rows.map((r) => r.id);
}

async function notifyExpired(db: Db, ids: string[]) {
  if (!ids.length) return;
  const settings = await getSettings(db);
  for (const id of ids) {
    const b = await getBooking(db, id);
    if (b) await notifyCustomer(db, settings, "expired", b);
  }
}

/**
 * Releases unpaid pending requests whose payment deadline has passed.
 * Runs on a schedule (/api/cron) AND lazily before every availability check /
 * booking, so the calendar is accurate even if the scheduler is delayed.
 */
export async function expireStaleBookings(db: Db, now = new Date()): Promise<string[]> {
  const ids = await db.tx((t) => expireInside(t, now));
  await notifyExpired(db, ids);
  return ids;
}

// ── Creating bookings ──────────────────────────────────────────

interface InsertArgs {
  treatmentId: string;
  start: Date;
  fullName: string;
  email: string;
  phone: string;
  customerNotes: string;
  internalNotes?: string;
  source: "online" | "admin";
  status: BookingStatus;
  pricePenceOverride?: number;
  policyVersion?: string | null;
  now: Date;
  /** Admin bookings may be placed outside working hours, but never on top of another booking. */
  checkBuffer: boolean;
}

async function insertBooking(db: Db, a: InsertArgs): Promise<{ id: string; expired: string[] }> {
  const treatment = await getTreatment(db, a.treatmentId);
  if (!treatment) throw new BookingError("INVALID", "Treatment not found");
  const settings = await getSettings(db);
  const price = a.pricePenceOverride ?? treatment.pricePence;
  const dep = calculateDeposit(price, treatment);
  const end = new Date(a.start.getTime() + treatment.durationMin * 60_000);

  let status = a.status;
  if (status === "pending_payment" && !dep.requiresDeposit) status = "pending_approval";
  const paymentStatus: PaymentStatus = dep.requiresDeposit ? "awaiting_deposit" : "not_required";
  const dueAt =
    status === "pending_payment"
      ? new Date(Math.min(a.now.getTime() + settings.payment.deadlineHours * 3600_000, a.start.getTime()))
      : null;

  try {
    return await db.tx(async (t) => {
      // Serialise booking writes so the conflict check + insert are atomic.
      await t.query(`select pg_advisory_xact_lock(${LOCK_KEY})`);
      const expired = await expireInside(t, a.now);

      const pad = a.checkBuffer ? settings.booking.bufferMin * 60_000 : 0;
      const clash = await t.query(
        `select 1 from bookings where status in (${DIARY_STATUSES.map((_, i) => `$${i + 3}`).join(", ")})
         and starts_at < $2 and ends_at > $1 limit 1`,
        [new Date(a.start.getTime() - pad), new Date(end.getTime() + pad), ...DIARY_STATUSES]
      );
      if (clash.length) throw new BookingError("SLOT_UNAVAILABLE", SLOT_TAKEN);
      if (a.source === "online") {
        const blocked = await t.query(`select 1 from time_blocks where starts_at < $2 and ends_at > $1 limit 1`, [a.start, end]);
        if (blocked.length) throw new BookingError("SLOT_UNAVAILABLE", SLOT_TAKEN);
      }

      const customer = await upsertCustomer(t, { fullName: a.fullName, email: a.email, phone: a.phone });

      let reference = generateReference();
      for (let i = 0; i < 10; i++) {
        const exists = await t.query(`select 1 from bookings where reference = $1`, [reference]);
        if (!exists.length) break;
        reference = generateReference();
      }

      const rows = await t.query<{ id: string }>(
        `insert into bookings (
           reference, access_token, customer_id, treatment_id, treatment_name, treatment_price_pence, duration_min,
           deposit_type, deposit_fixed_pence, deposit_percent, deposit_due_pence, balance_due_pence,
           starts_at, ends_at, status, payment_status, payment_due_at, source, customer_notes, internal_notes,
           policy_agreed_at, policy_version, confirmed_at, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         returning id`,
        [
          reference,
          generateAccessToken(),
          customer.id,
          treatment.id,
          treatment.name,
          price,
          treatment.durationMin,
          treatment.depositType,
          treatment.depositFixedPence,
          treatment.depositPercent,
          dep.depositPence,
          dep.balancePence,
          a.start,
          end,
          status,
          paymentStatus,
          dueAt,
          a.source,
          a.customerNotes,
          a.internalNotes ?? "",
          a.policyVersion ? a.now : null,
          a.policyVersion ?? null,
          status === "confirmed" ? a.now : null,
          a.now,
        ]
      );
      const id = rows[0].id;
      await addBookingEvent(
        t,
        id,
        a.source === "online" ? "requested" : "created_by_owner",
        `${treatment.name} · ${formatGBP(price)} · ${dep.ruleLabel} → deposit ${formatGBP(dep.depositPence)}, balance ${formatGBP(dep.balancePence)}`,
        a.source === "online" ? "customer" : "owner"
      );
      return { id, expired };
    });
  } catch (err) {
    if (isOverlapViolation(err)) throw new BookingError("SLOT_UNAVAILABLE", SLOT_TAKEN);
    throw err;
  }
}

export interface BookingRequestInput {
  treatmentId: string;
  date: string;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  policyAgreed: boolean;
}

/** Customer submits a booking request from the website. */
export async function createBookingRequest(db: Db, input: BookingRequestInput, now = new Date()): Promise<Booking> {
  if (!input.policyAgreed) throw new BookingError("INVALID", "Please agree to the booking policies.");
  const treatment = await getTreatment(db, input.treatmentId);
  if (!treatment || !treatment.active || !treatment.onlineBooking) {
    throw new BookingError("INVALID", "This treatment can't be booked online.");
  }
  await expireStaleBookings(db, now);
  const slots = (await computeAvailability(db, treatment.durationMin, [input.date], now)).get(input.date) ?? [];
  const slot = slots.find((s) => s.time === input.time);
  if (!slot) throw new BookingError("SLOT_UNAVAILABLE", SLOT_TAKEN);

  const settings = await getSettings(db);
  const { id, expired } = await insertBooking(db, {
    treatmentId: treatment.id,
    start: slot.start,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    customerNotes: input.notes.trim(),
    source: "online",
    status: "pending_payment",
    policyVersion: settings.policies.version,
    now,
    checkBuffer: true,
  });
  await notifyExpired(db, expired);
  const booking = await mustGet(db, id);
  await notifyCustomer(db, settings, "request_received", booking);
  await notifyOwner(db, settings, "owner_new_request", booking);
  return booking;
}

export interface ManualBookingInput {
  treatmentId: string;
  date: string;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  customerNotes?: string;
  internalNotes?: string;
  status: "confirmed" | "pending_payment";
  pricePenceOverride?: number;
  notifyCustomer: boolean;
}

/** Owner adds a booking from the dashboard (e.g. taken over Instagram or the phone). */
export async function createManualBooking(db: Db, input: ManualBookingInput, actor: string, now = new Date()): Promise<Booking> {
  const start = localToUtc(input.date, input.time);
  const { id, expired } = await insertBooking(db, {
    treatmentId: input.treatmentId,
    start,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    customerNotes: input.customerNotes ?? "",
    internalNotes: input.internalNotes ?? "",
    source: "admin",
    status: input.status,
    pricePenceOverride: input.pricePenceOverride,
    now,
    checkBuffer: false,
  });
  await notifyExpired(db, expired);
  await addBookingEvent(db, id, "note", `Added manually by ${actor}`, actor);
  const booking = await mustGet(db, id);
  if (input.notifyCustomer) {
    const settings = await getSettings(db);
    await notifyCustomer(db, settings, booking.status === "confirmed" ? "confirmed" : "request_received", booking);
  }
  return booking;
}

// ── Payments (recorded manually by the owner) ──────────────────

export interface PaymentInput {
  kind: PaymentKind;
  amountPence: number;
  method: PaymentMethod;
  receivedOn: string;
  notes: string;
}

function derivePaymentStatus(b: { treatmentPricePence: number; depositDuePence: number }, net: number, refunds: number): PaymentStatus {
  if (net <= 0) {
    if (refunds > 0) return "refunded";
    return b.depositDuePence > 0 ? "awaiting_deposit" : "not_required";
  }
  if (net >= b.treatmentPricePence) return "paid_in_full";
  if (b.depositDuePence === 0) return "not_required";
  return net >= b.depositDuePence ? "deposit_received" : "awaiting_deposit";
}

async function refreshPaymentStatus(db: Db, bookingId: string) {
  const b = await mustGet(db, bookingId);
  const r = await db.query<{ refunds: number }>(
    `select coalesce(sum(amount_pence) filter (where kind = 'refund'), 0)::int as refunds from payments where booking_id = $1`,
    [bookingId]
  );
  const status = derivePaymentStatus(b, b.paidPence, Number(r[0]?.refunds ?? 0));
  await db.query(`update bookings set payment_status = $2, updated_at = now() where id = $1`, [bookingId, status]);
}

export async function recordPayment(db: Db, bookingId: string, p: PaymentInput, actor: { id?: string; name: string }) {
  if (!Number.isInteger(p.amountPence) || p.amountPence <= 0) throw new BookingError("INVALID", "Enter an amount greater than £0.");
  await db.tx(async (t) => {
    await mustGet(t, bookingId);
    await t.query(
      `insert into payments (booking_id, kind, amount_pence, method, received_on, notes, recorded_by, recorded_by_name)
       values ($1, $2, $3, $4, $5::date, $6, $7, $8)`,
      [bookingId, p.kind, p.amountPence, p.method, p.receivedOn, p.notes, actor.id ?? null, actor.name]
    );
    await addBookingEvent(
      t,
      bookingId,
      "payment_recorded",
      `${PAYMENT_KIND_LABEL[p.kind]} of ${formatGBP(p.amountPence)} by ${PAYMENT_METHOD_LABEL[p.method]} on ${p.receivedOn} — recorded manually${p.notes ? ` (${p.notes})` : ""}`,
      actor.name
    );
    await refreshPaymentStatus(t, bookingId);
  });
  return mustGet(db, bookingId);
}

export async function deletePayment(db: Db, paymentId: string, actor: string) {
  await db.tx(async (t) => {
    const rows = await t.query<{ booking_id: string; amount_pence: number; kind: PaymentKind }>(
      `delete from payments where id = $1 returning booking_id, amount_pence, kind`,
      [paymentId]
    );
    if (!rows[0]) throw new BookingError("NOT_FOUND", "Payment not found");
    await addBookingEvent(t, rows[0].booking_id, "payment_removed", `${PAYMENT_KIND_LABEL[rows[0].kind]} of ${formatGBP(Number(rows[0].amount_pence))} removed`, actor);
    await refreshPaymentStatus(t, rows[0].booking_id);
  });
}

// ── Status changes ─────────────────────────────────────────────

export async function confirmBooking(
  db: Db,
  bookingId: string,
  actor: string,
  opts: { allowWithoutDeposit?: boolean; notify?: boolean } = {}
): Promise<Booking> {
  const b = await mustGet(db, bookingId);
  assertStatus(b, ["pending_payment", "pending_approval", "expired"], "confirm");
  if (b.depositDuePence > 0 && b.paidPence < b.depositDuePence && !opts.allowWithoutDeposit) {
    throw new BookingError(
      "DEPOSIT_NOT_RECORDED",
      "The deposit hasn't been recorded yet. Record the deposit first, or choose to confirm without a deposit."
    );
  }
  try {
    await db.tx(async (t) => {
      await t.query(`select pg_advisory_xact_lock(${LOCK_KEY})`);
      await t.query(
        `update bookings set status = 'confirmed', confirmed_at = now(), payment_due_at = null, cancelled_at = null, updated_at = now() where id = $1`,
        [bookingId]
      );
      await addBookingEvent(
        t,
        bookingId,
        "confirmed",
        b.paidPence < b.depositDuePence ? "Confirmed without the deposit being recorded" : "Confirmed after deposit recorded",
        actor
      );
    });
  } catch (err) {
    if (isOverlapViolation(err)) {
      throw new BookingError("SLOT_UNAVAILABLE", "This time has since been booked by someone else — reschedule it before confirming.");
    }
    throw err;
  }
  const updated = await mustGet(db, bookingId);
  if (opts.notify !== false) {
    const settings = await getSettings(db);
    await notifyCustomer(db, settings, "confirmed", updated);
    await notifyOwner(db, settings, "owner_confirmed", updated);
  }
  return updated;
}

/** The common one-tap action: "Deposit received → confirm booking". */
export async function recordDepositAndConfirm(
  db: Db,
  bookingId: string,
  p: Omit<PaymentInput, "kind">,
  actor: { id?: string; name: string }
) {
  await recordPayment(db, bookingId, { ...p, kind: "deposit" }, actor);
  return confirmBooking(db, bookingId, actor.name);
}

async function closeBooking(
  db: Db,
  bookingId: string,
  to: "declined" | "cancelled",
  reason: string,
  actor: string,
  notify: boolean
) {
  const b = await mustGet(db, bookingId);
  assertStatus(
    b,
    to === "declined" ? ["pending_payment", "pending_approval"] : ["pending_payment", "pending_approval", "confirmed"],
    to === "declined" ? "decline" : "cancel"
  );
  await db.query(
    `update bookings set status = $2, cancelled_at = now(), cancellation_reason = $3, payment_due_at = null, updated_at = now() where id = $1`,
    [bookingId, to, reason]
  );
  await addBookingEvent(db, bookingId, to, reason, actor);
  const updated = await mustGet(db, bookingId);
  if (notify) await notifyCustomer(db, await getSettings(db), to, updated, { reason: reason || undefined });
  return updated;
}

export const declineBooking = (db: Db, id: string, reason: string, actor: string, notify = true) =>
  closeBooking(db, id, "declined", reason, actor, notify);

export const cancelBooking = (db: Db, id: string, reason: string, actor: string, notify = true) =>
  closeBooking(db, id, "cancelled", reason, actor, notify);

export async function markAttendance(db: Db, bookingId: string, outcome: "completed" | "no_show", actor: string) {
  const b = await mustGet(db, bookingId);
  assertStatus(b, ["confirmed", "completed", "no_show"], "update attendance for");
  await db.query(`update bookings set status = $2, updated_at = now() where id = $1`, [bookingId, outcome]);
  await addBookingEvent(db, bookingId, outcome, "", actor);
  return mustGet(db, bookingId);
}

export async function rescheduleBooking(
  db: Db,
  bookingId: string,
  date: string,
  time: string,
  actor: string,
  opts: { ignoreHours?: boolean; notify?: boolean } = {},
  now = new Date()
): Promise<Booking> {
  const b = await mustGet(db, bookingId);
  assertStatus(b, ["pending_payment", "pending_approval", "confirmed"], "move");
  const start = localToUtc(date, time);
  if (!opts.ignoreHours) {
    const slots =
      (await computeAvailability(db, b.durationMin, [date], now, { excludeBookingId: b.id, ownerOverride: true })).get(date) ?? [];
    if (!slots.some((s) => s.time === time)) {
      throw new BookingError("SLOT_UNAVAILABLE", "That time isn't available (outside working hours, blocked, or clashes with another booking).");
    }
  }
  const end = new Date(start.getTime() + b.durationMin * 60_000);
  try {
    await db.tx(async (t) => {
      await t.query(`select pg_advisory_xact_lock(${LOCK_KEY})`);
      await t.query(`update bookings set starts_at = $2, ends_at = $3, reminder_sent_at = null, updated_at = now() where id = $1`, [
        bookingId,
        start,
        end,
      ]);
      await addBookingEvent(t, bookingId, "rescheduled", `${localDateOf(b.startsAt)} → ${date} ${time}`, actor);
    });
  } catch (err) {
    if (isOverlapViolation(err)) throw new BookingError("SLOT_UNAVAILABLE", "That time clashes with another booking.");
    throw err;
  }
  const updated = await mustGet(db, bookingId);
  if (opts.notify !== false) {
    await notifyCustomer(db, await getSettings(db), "rescheduled", updated, { previousStart: b.startsAt });
  }
  return updated;
}

export async function updateInternalNotes(db: Db, bookingId: string, notes: string, actor: string) {
  await db.query(`update bookings set internal_notes = $2, updated_at = now() where id = $1`, [bookingId, notes]);
  await addBookingEvent(db, bookingId, "notes_updated", "", actor);
}

/** Customer asks to cancel via their private booking link. Owner decides what happens. */
export async function requestCancellation(db: Db, bookingId: string, token: string, reason: string) {
  const b = await getBooking(db, bookingId);
  if (!b || b.accessToken !== token) throw new BookingError("NOT_FOUND", "Booking not found");
  assertStatus(b, ["pending_payment", "pending_approval", "confirmed"], "request cancellation of");
  if (b.cancellationRequestedAt) return b;
  await db.query(
    `update bookings set cancellation_requested_at = now(), cancellation_reason = $2, updated_at = now() where id = $1`,
    [bookingId, reason.slice(0, 1000)]
  );
  await addBookingEvent(db, bookingId, "cancellation_requested", reason, "customer");
  const updated = await mustGet(db, bookingId);
  await notifyOwner(db, await getSettings(db), "owner_cancellation_request", updated, { reason });
  return updated;
}

// ── Scheduled jobs ─────────────────────────────────────────────

export async function sendDueReminders(db: Db, now = new Date()): Promise<number> {
  const settings = await getSettings(db);
  if (!settings.notifications.reminders) return 0;
  const until = new Date(now.getTime() + settings.booking.reminderHoursBefore * 3600_000);
  const due = (await listBookings(db, { statuses: ["confirmed"], from: now, to: until })).filter(
    (b) => !b.reminderSentAt && b.startsAt > now
  );
  for (const b of due) {
    await notifyCustomer(db, settings, "reminder", b);
    await db.query(`update bookings set reminder_sent_at = now() where id = $1`, [b.id]);
    await addBookingEvent(db, b.id, "reminder_sent");
  }
  return due.length;
}

/**
 * UK GDPR storage limitation: anonymise personal data for clients with no
 * appointment in the retention period. Booking and payment amounts are kept for
 * bookkeeping, but names, contact details and free-text notes are removed.
 */
export async function anonymiseInactiveCustomers(db: Db, retentionMonths: number, now = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  return db.tx(async (t) => {
    const rows = await t.query<{ id: string }>(
      `update customers c set full_name = 'Anonymised client', email = 'anonymised-' || c.id || '@invalid',
         phone = '', notes = '', anonymised_at = now(), updated_at = now()
       where c.anonymised_at is null
         and c.created_at < $1
         and not exists (select 1 from bookings b where b.customer_id = c.id and b.ends_at >= $1)
       returning c.id`,
      [cutoff]
    );
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      await t.query(
        `update bookings set customer_notes = '', cancellation_reason = '' where customer_id = any($1::uuid[])`,
        [ids]
      );
      await t.query(
        `update notifications set body_text = '', body_html = '', recipient = 'anonymised'
         where booking_id in (select id from bookings where customer_id = any($1::uuid[]))`,
        [ids]
      );
    }
    return rows.length;
  });
}

export async function runScheduledJobs(db: Db, now = new Date()) {
  const expired = await expireStaleBookings(db, now);
  const reminders = await sendDueReminders(db, now);
  return { expired: expired.length, reminders };
}
