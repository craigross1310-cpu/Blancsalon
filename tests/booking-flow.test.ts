/**
 * End-to-end booking engine tests against a real Postgres.
 * Runs on embedded PGlite always, and on a real PostgreSQL server too when
 * TEST_DATABASE_URL is set (e.g. postgres://postgres@localhost:54329/blanc_test).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeAvailability } from "@/lib/booking/availability";
import * as svc from "@/lib/booking/service";
import { migrate, openDb, type Db } from "@/lib/db/client";
import { seedTreatments } from "@/lib/db/seed";
import { localToUtc } from "@/lib/core/time";
import { getBooking, getTreatment, insertTimeBlock, listNotifications, listPayments, updateTreatment } from "@/lib/repo";
import { getSettings, saveSettings } from "@/lib/settings";

const targets: [string, () => Promise<Db>][] = [["PGlite", () => openDb({})]];
if (process.env.TEST_DATABASE_URL) {
  targets.push([
    "PostgreSQL",
    async () => {
      const db = await openDb({ url: process.env.TEST_DATABASE_URL });
      await db.exec(`drop schema public cascade; create schema public;
        do $$ begin
          if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
          if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
        end $$;`);
      return db;
    },
  ]);
}

const NOW = new Date("2027-01-04T09:00:00Z"); // Monday 9am
const WED = "2027-01-06"; // open 09:30–17:30, break 13:00–13:30 (default hours)
const owner = { name: "Test Owner" };
const person = (n: number) => ({ fullName: `Client ${n}`, email: `client${n}@example.com`, phone: "07700 900000", notes: "" });

describe.each(targets)("booking engine on %s", (_name, open) => {
  let db: Db;
  const tid = async (slug: string) => (await getTreatment(db, slug))!.id;

  beforeAll(async () => {
    db = await open();
    await migrate(db);
    await seedTreatments(db);
    // Make timing deterministic for tests.
    const s = await getSettings(db);
    await saveSettings(db, "booking", { ...s.booking, bufferMin: 0, slotIntervalMin: 15, minNoticeHours: 24, maxAdvanceDays: 60 });
    await saveSettings(db, "notifications", { ...s.notifications, ownerEmail: "owner@example.com" });
  });
  afterAll(async () => db?.close());

  it("creates a pending request with a fixed deposit and unique reference", async () => {
    const b = await svc.createBookingRequest(db, { treatmentId: await tid("express-microdermabrasion"), date: WED, time: "10:00", ...person(1), policyAgreed: true }, NOW);
    expect(b.reference).toMatch(/^BLC-[A-Z2-9]{6}$/);
    expect(b.status).toBe("pending_payment");
    expect(b.paymentStatus).toBe("awaiting_deposit");
    expect(b.treatmentPricePence).toBe(4500);
    expect(b.depositDuePence).toBe(1000);
    expect(b.balanceDuePence).toBe(3500);
    expect(b.endsAt.getTime() - b.startsAt.getTime()).toBe(45 * 60_000);
    expect(b.paymentDueAt?.toISOString()).toBe("2027-01-05T09:00:00.000Z"); // 24h deadline
    const mails = await listNotifications(db, { bookingId: b.id });
    expect(mails.map((m) => m.template).sort()).toEqual(["owner_new_request", "request_received"]);
    const customerMail = mails.find((m) => m.template === "request_received")!;
    expect(customerMail.bodyText).toContain(b.reference);
    expect(customerMail.bodyText).toContain("£10.00");
    expect(customerMail.bodyText).toContain("NOT confirmed");
  });

  it("blocks the pending slot (and overlapping slots) for other customers", async () => {
    const treatment = await tid("express-microdermabrasion");
    const slots = (await computeAvailability(db, 45, [WED], NOW)).get(WED)!.map((s) => s.time);
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("09:30"); // 09:30–10:15 overlaps
    expect(slots).toContain("10:45");
    await expect(
      svc.createBookingRequest(db, { treatmentId: treatment, date: WED, time: "10:00", ...person(2), policyAgreed: true }, NOW)
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("the database itself rejects overlapping bookings (exclusion constraint)", async () => {
    const existing = await db.query<{ customer_id: string }>(`select customer_id from bookings limit 1`);
    await expect(
      db.query(
        `insert into bookings (reference, access_token, customer_id, treatment_name, treatment_price_pence, duration_min, deposit_type, deposit_due_pence, balance_due_pence, starts_at, ends_at, status, payment_status)
         values ('BLC-RAW001', 'x', $1, 'Raw', 1000, 30, 'fixed', 0, 1000, $2, $3, 'confirmed', 'not_required')`,
        [existing[0].customer_id, localToUtc(WED, "10:15"), localToUtc(WED, "10:45")]
      )
    ).rejects.toMatchObject({ code: "23P01" });
  });

  it("only one of two simultaneous requests for the same slot succeeds", async () => {
    const treatment = await tid("express-lets-glow");
    const results = await Promise.allSettled(
      [3, 4, 5].map((n) => svc.createBookingRequest(db, { treatmentId: treatment, date: WED, time: "14:00", ...person(n), policyAgreed: true }, NOW))
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason.code === "SLOT_UNAVAILABLE")).toBe(true);
  });

  it("percentage deposit is snapshotted — later price/deposit changes don't alter the booking", async () => {
    const slug = "lets-glow-facial"; // £80, 25%
    const t = (await getTreatment(db, slug))!;
    const b = await svc.createBookingRequest(db, { treatmentId: t.id, date: WED, time: "15:15", ...person(6), policyAgreed: true }, NOW);
    expect([b.depositDuePence, b.balanceDuePence]).toEqual([2000, 6000]);

    await updateTreatment(db, t.id, { ...t, pricePence: 9500, depositType: "fixed", depositFixedPence: 3000 });
    const after = (await getBooking(db, b.id))!;
    expect(after.treatmentPricePence).toBe(8000);
    expect(after.depositType).toBe("percentage");
    expect(after.depositPercent).toBe(25);
    expect(after.depositDuePence).toBe(2000);
    expect(after.balanceDuePence).toBe(6000);

    const next = await svc.createBookingRequest(db, { treatmentId: t.id, date: "2027-01-07", time: "11:00", ...person(7), policyAgreed: true }, NOW);
    expect([next.treatmentPricePence, next.depositDuePence, next.balanceDuePence]).toEqual([9500, 3000, 6500]);
  });

  it("no-deposit treatments go to the owner for approval", async () => {
    const b = await svc.createBookingRequest(db, { treatmentId: await tid("medical-microdermabrasion"), date: WED, time: "16:30", ...person(8), policyAgreed: true }, NOW);
    expect(b.status).toBe("pending_approval");
    expect(b.paymentStatus).toBe("not_required");
    expect(b.depositDuePence).toBe(0);
    expect(b.paymentDueAt).toBeNull();
    const c = await svc.confirmBooking(db, b.id, owner.name);
    expect(c.status).toBe("confirmed");
  });

  it("owner must record the deposit before confirming (unless overriding)", async () => {
    const [b] = await db.query<{ id: string }>(`select id from bookings where reference <> 'BLC-RAW001' and treatment_name = 'Express Microdermabrasion' and status = 'pending_payment'`);
    await expect(svc.confirmBooking(db, b.id, owner.name)).rejects.toMatchObject({ code: "DEPOSIT_NOT_RECORDED" });
    const confirmed = await svc.recordDepositAndConfirm(db, b.id, { amountPence: 1000, method: "bank_transfer", receivedOn: "2027-01-04", notes: "seen in app" }, owner);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.paymentStatus).toBe("deposit_received");
    expect(confirmed.paidPence).toBe(1000);
    expect(confirmed.outstandingPence).toBe(3500);
    const payments = await listPayments(db, { bookingId: b.id });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ kind: "deposit", amountPence: 1000, method: "bank_transfer", receivedOn: "2027-01-04", recordedByName: "Test Owner" });
    const mails = (await listNotifications(db, { bookingId: b.id })).map((m) => m.template);
    expect(mails).toContain("confirmed");
    expect(mails).toContain("owner_confirmed");

    // Balance after the appointment → paid in full → completed
    await svc.recordPayment(db, b.id, { kind: "balance", amountPence: 3500, method: "card", receivedOn: "2027-01-06", notes: "" }, owner);
    const done = await svc.markAttendance(db, b.id, "completed", owner.name);
    expect(done.paymentStatus).toBe("paid_in_full");
    expect(done.outstandingPence).toBe(0);
    expect(done.status).toBe("completed");
  });

  it("unpaid requests expire after the deadline and free the slot", async () => {
    const treatment = await tid("express-needling");
    const b = await svc.createBookingRequest(db, { treatmentId: treatment, date: "2027-01-08", time: "10:00", ...person(9), policyAgreed: true }, NOW);
    expect((await computeAvailability(db, 60, ["2027-01-08"], NOW)).get("2027-01-08")!.map((s) => s.time)).not.toContain("10:00");
    const before = await svc.expireStaleBookings(db, new Date("2027-01-05T08:59:00Z"));
    expect(before).not.toContain(b.id);
    const expired = await svc.expireStaleBookings(db, new Date("2027-01-05T09:00:01Z"));
    expect(expired).toContain(b.id);
    expect((await getBooking(db, b.id))!.status).toBe("expired");
    expect((await listNotifications(db, { bookingId: b.id })).map((m) => m.template)).toContain("expired");
    const later = new Date("2027-01-05T10:00:00Z");
    expect((await computeAvailability(db, 60, ["2027-01-08"], later)).get("2027-01-08")!.map((s) => s.time)).toContain("10:00");
    // Someone else can now book it
    const c = await svc.createBookingRequest(db, { treatmentId: treatment, date: "2027-01-08", time: "10:00", ...person(10), policyAgreed: true }, later);
    expect(c.status).toBe("pending_payment");
    // The expired one cannot be reinstated on top of the new booking
    await expect(svc.confirmBooking(db, b.id, owner.name, { allowWithoutDeposit: true })).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("respects owner-blocked time and closed days", async () => {
    await insertTimeBlock(db, { startsAt: localToUtc("2027-01-09", "00:00"), endsAt: localToUtc("2027-01-09", "23:59"), reason: "Holiday" });
    const map = await computeAvailability(db, 45, ["2027-01-09", "2027-01-10", "2027-01-11"], NOW);
    expect(map.get("2027-01-09")).toEqual([]); // blocked Saturday
    expect(map.get("2027-01-10")).toEqual([]); // Sunday closed
    expect(map.get("2027-01-11")).toEqual([]); // Monday closed
    await expect(
      svc.createBookingRequest(db, { treatmentId: await tid("express-microdermabrasion"), date: "2027-01-09", time: "10:00", ...person(11), policyAgreed: true }, NOW)
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("owner can add manual bookings, move and cancel them — never double booking", async () => {
    const treatment = await tid("morpheus8-face-and-neck");
    const m = await svc.createManualBooking(db, { treatmentId: treatment, date: "2027-01-12", time: "19:00", ...person(12), status: "confirmed", notifyCustomer: true }, owner.name, NOW);
    expect(m.status).toBe("confirmed");
    expect(m.source).toBe("admin");
    expect(m.depositDuePence).toBe(3750); // 25% of £150
    await expect(
      svc.createManualBooking(db, { treatmentId: treatment, date: "2027-01-12", time: "19:30", ...person(13), status: "confirmed", notifyCustomer: false }, owner.name, NOW)
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    const moved = await svc.rescheduleBooking(db, m.id, "2027-01-13", "11:00", owner.name, {}, NOW);
    expect(moved.startsAt.toISOString()).toBe(localToUtc("2027-01-13", "11:00").toISOString());
    expect((await listNotifications(db, { bookingId: m.id })).map((x) => x.template)).toContain("rescheduled");
    await expect(svc.rescheduleBooking(db, m.id, WED, "10:00", owner.name, { ignoreHours: true }, NOW)).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    const cancelled = await svc.cancelBooking(db, m.id, "Client unwell", owner.name);
    expect(cancelled.status).toBe("cancelled");
    expect((await computeAvailability(db, 60, ["2027-01-13"], NOW)).get("2027-01-13")!.map((s) => s.time)).toContain("11:00");
  });

  it("customers can request cancellation with their private token only", async () => {
    const b = await svc.createBookingRequest(db, { treatmentId: await tid("express-microdermabrasion"), date: "2027-01-14", time: "12:00", ...person(14), policyAgreed: true }, NOW);
    await expect(svc.requestCancellation(db, b.id, "wrong-token", "x")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const r = await svc.requestCancellation(db, b.id, b.accessToken, "Can't make it");
    expect(r.cancellationRequestedAt).not.toBeNull();
    expect(r.status).toBe("pending_payment"); // owner decides
    expect((await listNotifications(db, { bookingId: b.id })).map((x) => x.template)).toContain("owner_cancellation_request");
  });

  it("sends reminders once for confirmed bookings in the window", async () => {
    const b = await svc.createManualBooking(db, { treatmentId: await tid("express-microdermabrasion"), date: "2027-01-15", time: "10:00", ...person(15), status: "confirmed", notifyCustomer: false }, owner.name, NOW);
    const at = new Date(b.startsAt.getTime() - 20 * 3600_000);
    const sent = await svc.sendDueReminders(db, at);
    expect(sent).toBeGreaterThanOrEqual(1);
    expect(await svc.sendDueReminders(db, at)).toBe(0);
    expect((await listNotifications(db, { bookingId: b.id })).filter((x) => x.template === "reminder")).toHaveLength(1);
  });

  it("anonymises inactive clients but keeps financial records", async () => {
    const future = new Date("2030-01-01T00:00:00Z");
    const count = await svc.anonymiseInactiveCustomers(db, 24, future);
    expect(count).toBeGreaterThan(0);
    const rows = await db.query<{ full_name: string; email: string }>(`select full_name, email from customers where anonymised_at is not null limit 1`);
    expect(rows[0].full_name).toBe("Anonymised client");
    expect(rows[0].email).toMatch(/@invalid$/);
    const [{ n }] = await db.query<{ n: number }>(`select count(*)::int as n from payments`);
    expect(Number(n)).toBeGreaterThan(0);
  });

  it("rejects requests without policy agreement or for enquiry-only treatments", async () => {
    await expect(
      svc.createBookingRequest(db, { treatmentId: await tid("express-microdermabrasion"), date: WED, time: "11:00", ...person(16), policyAgreed: false }, NOW)
    ).rejects.toMatchObject({ code: "INVALID" });
    await expect(
      svc.createBookingRequest(db, { treatmentId: await tid("lash-extensions"), date: WED, time: "11:00", ...person(16), policyAgreed: true }, NOW)
    ).rejects.toMatchObject({ code: "INVALID" });
  });
});
