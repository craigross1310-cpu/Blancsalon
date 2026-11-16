import type { Db } from "./db/client";
import type {
  Booking,
  BookingEvent,
  BookingStatus,
  Customer,
  NotificationRecord,
  OpeningDay,
  Payment,
  TimeBlock,
  Treatment,
} from "./types";
import { DIARY_STATUSES } from "./types";

type Row = Record<string, unknown>;

export const toDate = (v: unknown): Date => (v instanceof Date ? v : new Date(String(v)));
export const toDateOrNull = (v: unknown): Date | null => (v === null || v === undefined ? null : toDate(v));
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const hhmm = (v: unknown): string => str(v).slice(0, 5);

// ── Treatments ─────────────────────────────────────────────────
export function mapTreatment(r: Row): Treatment {
  return {
    id: str(r.id),
    slug: str(r.slug),
    category: str(r.category),
    name: str(r.name),
    summary: str(r.summary),
    description: str(r.description),
    pricePence: num(r.price_pence),
    priceNote: str(r.price_note),
    durationMin: num(r.duration_min),
    depositType: r.deposit_type === "percentage" ? "percentage" : "fixed",
    depositFixedPence: num(r.deposit_fixed_pence),
    depositPercent: num(r.deposit_percent),
    preparationInfo: str(r.preparation_info),
    aftercareInfo: str(r.aftercare_info),
    imageUrl: (r.image_url as string | null) ?? null,
    active: Boolean(r.active),
    onlineBooking: Boolean(r.online_booking),
    featured: Boolean(r.featured),
    sortOrder: num(r.sort_order),
    reviewNote: str(r.review_note),
  };
}

export async function listTreatments(db: Db, opts: { activeOnly?: boolean } = {}): Promise<Treatment[]> {
  const rows = await db.query(
    `select * from treatments ${opts.activeOnly ? "where active" : ""} order by sort_order, category, name`
  );
  return rows.map(mapTreatment);
}

export async function getTreatment(db: Db, idOrSlug: string): Promise<Treatment | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const rows = await db.query(`select * from treatments where ${isUuid ? "id = $1::uuid" : "slug = $1"}`, [idOrSlug]);
  return rows[0] ? mapTreatment(rows[0]) : null;
}

export interface TreatmentInput {
  slug: string;
  category: string;
  name: string;
  summary: string;
  description: string;
  pricePence: number;
  priceNote: string;
  durationMin: number;
  depositType: "fixed" | "percentage";
  depositFixedPence: number;
  depositPercent: number;
  preparationInfo: string;
  aftercareInfo: string;
  imageUrl: string | null;
  active: boolean;
  onlineBooking: boolean;
  featured: boolean;
  sortOrder: number;
  reviewNote: string;
}

const T_COLS = [
  "slug", "category", "name", "summary", "description", "price_pence", "price_note", "duration_min",
  "deposit_type", "deposit_fixed_pence", "deposit_percent", "preparation_info", "aftercare_info",
  "image_url", "active", "online_booking", "featured", "sort_order", "review_note",
] as const;

function treatmentValues(t: TreatmentInput): unknown[] {
  return [
    t.slug, t.category, t.name, t.summary, t.description, t.pricePence, t.priceNote, t.durationMin,
    t.depositType, t.depositFixedPence, t.depositPercent, t.preparationInfo, t.aftercareInfo,
    t.imageUrl, t.active, t.onlineBooking, t.featured, t.sortOrder, t.reviewNote,
  ];
}

export async function insertTreatment(db: Db, t: TreatmentInput): Promise<Treatment> {
  const ph = T_COLS.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await db.query(`insert into treatments (${T_COLS.join(", ")}) values (${ph}) returning *`, treatmentValues(t));
  return mapTreatment(rows[0]);
}

export async function updateTreatment(db: Db, id: string, t: TreatmentInput): Promise<Treatment> {
  const set = T_COLS.map((c, i) => `${c} = $${i + 2}`).join(", ");
  const rows = await db.query(`update treatments set ${set}, updated_at = now() where id = $1 returning *`, [
    id,
    ...treatmentValues(t),
  ]);
  return mapTreatment(rows[0]);
}

export async function deleteTreatment(db: Db, id: string): Promise<"deleted" | "deactivated"> {
  const used = await db.query(`select 1 from bookings where treatment_id = $1 limit 1`, [id]);
  if (used.length) {
    await db.query(`update treatments set active = false, updated_at = now() where id = $1`, [id]);
    return "deactivated";
  }
  await db.query(`delete from treatments where id = $1`, [id]);
  return "deleted";
}

// ── Customers ──────────────────────────────────────────────────
export function mapCustomer(r: Row): Customer {
  return {
    id: str(r.id),
    fullName: str(r.full_name),
    email: str(r.email),
    phone: str(r.phone),
    notes: str(r.notes),
    anonymisedAt: toDateOrNull(r.anonymised_at),
    createdAt: toDate(r.created_at),
  };
}

export async function upsertCustomer(db: Db, c: { fullName: string; email: string; phone: string }): Promise<Customer> {
  const existing = await db.query(
    `select * from customers where lower(email) = lower($1) and anonymised_at is null limit 1`,
    [c.email]
  );
  if (existing[0]) {
    const rows = await db.query(
      `update customers set full_name = $2, phone = case when $3 = '' then phone else $3 end, updated_at = now()
       where id = $1 returning *`,
      [existing[0].id, c.fullName, c.phone]
    );
    return mapCustomer(rows[0]);
  }
  const rows = await db.query(`insert into customers (full_name, email, phone) values ($1, $2, $3) returning *`, [
    c.fullName,
    c.email.trim(),
    c.phone,
  ]);
  return mapCustomer(rows[0]);
}

export async function listCustomers(db: Db): Promise<(Customer & { bookingCount: number; lastVisit: Date | null })[]> {
  const rows = await db.query(`
    select c.*, count(b.id)::int as booking_count, max(b.starts_at) as last_visit
    from customers c left join bookings b on b.customer_id = c.id
    group by c.id order by max(b.starts_at) desc nulls last, c.created_at desc`);
  return rows.map((r) => ({ ...mapCustomer(r), bookingCount: num(r.booking_count), lastVisit: toDateOrNull(r.last_visit) }));
}

// ── Bookings ───────────────────────────────────────────────────
const BOOKING_SELECT = `
  select b.*, c.full_name as customer_name, c.email as customer_email, c.phone as customer_phone,
    coalesce((select sum(case when p.kind = 'refund' then -p.amount_pence else p.amount_pence end)
              from payments p where p.booking_id = b.id), 0)::int as paid_pence
  from bookings b join customers c on c.id = b.customer_id`;

export function mapBooking(r: Row): Booking {
  const price = num(r.treatment_price_pence);
  const paid = num(r.paid_pence);
  return {
    id: str(r.id),
    reference: str(r.reference),
    accessToken: str(r.access_token),
    customerId: str(r.customer_id),
    treatmentId: (r.treatment_id as string | null) ?? null,
    treatmentName: str(r.treatment_name),
    treatmentPricePence: price,
    durationMin: num(r.duration_min),
    depositType: r.deposit_type === "percentage" ? "percentage" : "fixed",
    depositFixedPence: num(r.deposit_fixed_pence),
    depositPercent: num(r.deposit_percent),
    depositDuePence: num(r.deposit_due_pence),
    balanceDuePence: num(r.balance_due_pence),
    startsAt: toDate(r.starts_at),
    endsAt: toDate(r.ends_at),
    status: r.status as BookingStatus,
    paymentStatus: r.payment_status as Booking["paymentStatus"],
    paymentDueAt: toDateOrNull(r.payment_due_at),
    source: r.source === "admin" ? "admin" : "online",
    customerNotes: str(r.customer_notes),
    internalNotes: str(r.internal_notes),
    policyAgreedAt: toDateOrNull(r.policy_agreed_at),
    policyVersion: (r.policy_version as string | null) ?? null,
    cancellationRequestedAt: toDateOrNull(r.cancellation_requested_at),
    cancellationReason: str(r.cancellation_reason),
    reminderSentAt: toDateOrNull(r.reminder_sent_at),
    confirmedAt: toDateOrNull(r.confirmed_at),
    cancelledAt: toDateOrNull(r.cancelled_at),
    createdAt: toDate(r.created_at),
    updatedAt: toDate(r.updated_at),
    customerName: str(r.customer_name),
    customerEmail: str(r.customer_email),
    customerPhone: str(r.customer_phone),
    paidPence: paid,
    outstandingPence: Math.max(0, price - paid),
  };
}

export async function getBooking(db: Db, id: string): Promise<Booking | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db.query(`${BOOKING_SELECT} where b.id = $1`, [id]);
  return rows[0] ? mapBooking(rows[0]) : null;
}

export async function getBookingByReference(db: Db, reference: string): Promise<Booking | null> {
  const rows = await db.query(`${BOOKING_SELECT} where b.reference = upper($1)`, [reference.trim()]);
  return rows[0] ? mapBooking(rows[0]) : null;
}

export interface BookingFilter {
  statuses?: BookingStatus[];
  from?: Date;
  to?: Date;
  search?: string;
  customerId?: string;
  order?: "asc" | "desc";
  limit?: number;
}

export async function listBookings(db: Db, f: BookingFilter = {}): Promise<Booking[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (f.statuses?.length) where.push(`b.status in (${f.statuses.map((s) => p(s)).join(", ")})`);
  if (f.from) where.push(`b.ends_at > ${p(f.from)}`);
  if (f.to) where.push(`b.starts_at < ${p(f.to)}`);
  if (f.customerId) where.push(`b.customer_id = ${p(f.customerId)}`);
  if (f.search) {
    const s = p(`%${f.search.trim().toLowerCase()}%`);
    where.push(`(lower(c.full_name) like ${s} or lower(c.email) like ${s} or lower(b.reference) like ${s} or c.phone like ${s} or lower(b.treatment_name) like ${s})`);
  }
  const sql = `${BOOKING_SELECT} ${where.length ? "where " + where.join(" and ") : ""}
    order by b.starts_at ${f.order === "desc" ? "desc" : "asc"} ${f.limit ? `limit ${Math.floor(f.limit)}` : ""}`;
  return (await db.query(sql, params)).map(mapBooking);
}

/** Intervals that occupy the diary between from/to (for availability). */
export async function busyBookings(db: Db, from: Date, to: Date, excludeId?: string) {
  const rows = await db.query<{ starts_at: unknown; ends_at: unknown }>(
    `select starts_at, ends_at from bookings
     where status in (${DIARY_STATUSES.map((_, i) => `$${i + 3}`).join(", ")})
       and starts_at < $2 and ends_at > $1 ${excludeId ? `and id <> $${DIARY_STATUSES.length + 3}` : ""}`,
    [from, to, ...DIARY_STATUSES, ...(excludeId ? [excludeId] : [])]
  );
  return rows.map((r) => ({ start: toDate(r.starts_at), end: toDate(r.ends_at) }));
}

export async function addBookingEvent(db: Db, bookingId: string, event: string, detail = "", actor = "system") {
  await db.query(`insert into booking_events (booking_id, event, detail, actor) values ($1, $2, $3, $4)`, [
    bookingId,
    event,
    detail,
    actor,
  ]);
}

export async function listBookingEvents(db: Db, bookingId: string): Promise<BookingEvent[]> {
  const rows = await db.query(`select * from booking_events where booking_id = $1 order by created_at desc`, [bookingId]);
  return rows.map((r) => ({
    id: str(r.id),
    event: str(r.event),
    detail: str(r.detail),
    actor: str(r.actor),
    createdAt: toDate(r.created_at),
  }));
}

// ── Payments ───────────────────────────────────────────────────
export function mapPayment(r: Row): Payment {
  return {
    id: str(r.id),
    bookingId: str(r.booking_id),
    kind: r.kind as Payment["kind"],
    amountPence: num(r.amount_pence),
    method: r.method as Payment["method"],
    receivedOn: str(r.received_on_text ?? r.received_on).slice(0, 10),
    notes: str(r.notes),
    recordedByName: str(r.recorded_by_name),
    createdAt: toDate(r.created_at),
    bookingReference: r.reference as string | undefined,
    customerName: r.customer_name as string | undefined,
    treatmentName: r.treatment_name as string | undefined,
  };
}

export async function listPayments(db: Db, opts: { bookingId?: string; from?: string; to?: string } = {}): Promise<Payment[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.bookingId) {
    params.push(opts.bookingId);
    where.push(`p.booking_id = $${params.length}`);
  }
  if (opts.from) {
    params.push(opts.from);
    where.push(`p.received_on >= $${params.length}::date`);
  }
  if (opts.to) {
    params.push(opts.to);
    where.push(`p.received_on <= $${params.length}::date`);
  }
  const rows = await db.query(
    `select p.*, p.received_on::text as received_on_text, b.reference, b.treatment_name, c.full_name as customer_name
     from payments p join bookings b on b.id = p.booking_id join customers c on c.id = b.customer_id
     ${where.length ? "where " + where.join(" and ") : ""}
     order by p.received_on desc, p.created_at desc`,
    params
  );
  return rows.map(mapPayment);
}

// ── Availability ───────────────────────────────────────────────
export async function getOpeningHours(db: Db): Promise<OpeningDay[]> {
  const rows = await db.query(`select * from opening_hours order by weekday`);
  return rows.map((r) => ({
    weekday: num(r.weekday),
    isOpen: Boolean(r.is_open),
    open: hhmm(r.open_time),
    close: hhmm(r.close_time),
    breaks: (typeof r.breaks === "string" ? JSON.parse(r.breaks) : (r.breaks as OpeningDay["breaks"])) ?? [],
  }));
}

export async function saveOpeningHours(db: Db, days: OpeningDay[]) {
  await db.tx(async (t) => {
    for (const d of days) {
      await t.query(
        `insert into opening_hours (weekday, is_open, open_time, close_time, breaks) values ($1, $2, $3::time, $4::time, $5::jsonb)
         on conflict (weekday) do update set is_open = excluded.is_open, open_time = excluded.open_time,
           close_time = excluded.close_time, breaks = excluded.breaks`,
        [d.weekday, d.isOpen, d.open, d.close, JSON.stringify(d.breaks)]
      );
    }
  });
}

export async function listTimeBlocks(db: Db, from?: Date, to?: Date): Promise<TimeBlock[]> {
  const rows = from && to
    ? await db.query(`select * from time_blocks where starts_at < $2 and ends_at > $1 order by starts_at`, [from, to])
    : await db.query(`select * from time_blocks where ends_at > now() order by starts_at`);
  return rows.map((r) => ({ id: str(r.id), startsAt: toDate(r.starts_at), endsAt: toDate(r.ends_at), reason: str(r.reason) }));
}

export async function insertTimeBlock(db: Db, b: { startsAt: Date; endsAt: Date; reason: string }) {
  await db.query(`insert into time_blocks (starts_at, ends_at, reason) values ($1, $2, $3)`, [b.startsAt, b.endsAt, b.reason]);
}

export async function deleteTimeBlock(db: Db, id: string) {
  await db.query(`delete from time_blocks where id = $1`, [id]);
}

// ── Notifications ──────────────────────────────────────────────
export function mapNotification(r: Row): NotificationRecord {
  return {
    id: str(r.id),
    bookingId: (r.booking_id as string | null) ?? null,
    channel: r.channel as NotificationRecord["channel"],
    audience: r.audience as NotificationRecord["audience"],
    template: str(r.template),
    recipient: str(r.recipient),
    subject: str(r.subject),
    bodyText: str(r.body_text),
    bodyHtml: str(r.body_html),
    status: r.status as NotificationRecord["status"],
    provider: str(r.provider),
    error: (r.error as string | null) ?? null,
    createdAt: toDate(r.created_at),
    bookingReference: (r.reference as string | null) ?? null,
  };
}

export async function listNotifications(db: Db, opts: { bookingId?: string; limit?: number } = {}) {
  const rows = await db.query(
    `select n.*, b.reference from notifications n left join bookings b on b.id = n.booking_id
     ${opts.bookingId ? "where n.booking_id = $1" : ""} order by n.created_at desc limit ${opts.limit ?? 100}`,
    opts.bookingId ? [opts.bookingId] : []
  );
  return rows.map(mapNotification);
}

export async function getNotification(db: Db, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db.query(`select n.*, b.reference from notifications n left join bookings b on b.id = n.booking_id where n.id = $1`, [id]);
  return rows[0] ? mapNotification(rows[0]) : null;
}
