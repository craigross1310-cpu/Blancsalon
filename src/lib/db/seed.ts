import type { Db } from "./client";
import { CATALOG, slugify } from "./catalog";
import { hashPassword } from "../auth/password";
import { addDaysToDate, localDateOf, weekdayOf } from "../core/time";
import { insertTreatment } from "../repo";
import { saveSettings } from "../settings";
import { DEFAULT_SETTINGS } from "../settings-schema";

export const DEMO_ADMIN_EMAIL = "owner@blanc.demo";
export const demoAdminPassword = () => process.env.DEMO_ADMIN_PASSWORD || "blanc-demo";

export async function seedTreatments(db: Db) {
  let order = 0;
  for (const c of CATALOG) {
    order += 10;
    await insertTreatment(db, {
      slug: slugify(c.name),
      category: c.category,
      name: c.name,
      summary: c.summary,
      description: c.description,
      pricePence: c.pricePence,
      priceNote: c.priceNote ?? "",
      durationMin: c.durationMin,
      depositType: c.depositType,
      depositFixedPence: c.depositFixedPence ?? 0,
      depositPercent: c.depositPercent ?? 0,
      preparationInfo: c.preparation ?? "",
      aftercareInfo: c.aftercare ?? "",
      imageUrl: c.image ?? null,
      active: true,
      onlineBooking: c.onlineBooking ?? true,
      featured: c.featured ?? false,
      sortOrder: order,
      reviewNote: c.review,
    });
  }
}

/** First-run seed for demo mode: BLANC's menu, settings, demo owner login and sample bookings. */
export async function seedIfEmpty(db: Db, opts: { sampleBookings?: boolean } = {}) {
  const [{ n }] = await db.query<{ n: number }>(`select count(*)::int as n from treatments`);
  if (Number(n) > 0) return false;

  await seedTreatments(db);
  await saveSettings(db, "notifications", { ...DEFAULT_SETTINGS.notifications, ownerEmail: DEMO_ADMIN_EMAIL });
  await db.query(
    `insert into admin_users (email, name, role, password_hash) values ($1, 'BLANC Owner (demo)', 'owner', $2)
     on conflict do nothing`,
    [DEMO_ADMIN_EMAIL, await hashPassword(demoAdminPassword())]
  );
  if (opts.sampleBookings !== false) await seedSampleBookings(db);
  return true;
}

/**
 * Sample bookings so the dashboard looks realistic when presented.
 * All clients are fictional, with example.com emails and Ofcom drama-range numbers.
 */
export async function seedSampleBookings(db: Db, realNow = new Date()) {
  const svc = await import("../booking/service");
  const { computeAvailability } = await import("../booking/availability");
  const { getTreatment } = await import("../repo");
  const t = async (name: string) => (await getTreatment(db, slugify(name)))!;
  const today = localDateOf(realNow);
  const openDays = [2, 3, 4, 5, 6];
  const nextOpen = (from: string, skip: number) => {
    let d = from;
    let count = -1;
    for (let i = 0; i < 60; i++) {
      if (openDays.includes(weekdayOf(d))) count++;
      if (count >= skip) return d;
      d = addDaysToDate(d, 1);
    }
    return d;
  };
  const owner = { name: "BLANC Owner (demo)" };
  const hoursAgo = (h: number) => new Date(realNow.getTime() - h * 3600_000);

  const request = async (
    treatment: string,
    date: string,
    slotIndex: number,
    person: [string, string, string],
    notes: string,
    createdAt: Date
  ) => {
    const tr = await t(treatment);
    const slots = (await computeAvailability(db, tr.durationMin, [date], createdAt)).get(date) ?? [];
    const slot = slots[Math.min(slotIndex, slots.length - 1)];
    if (!slot) return null;
    return svc.createBookingRequest(
      db,
      { treatmentId: tr.id, date, time: slot.time, fullName: person[0], email: person[1], phone: person[2], notes, policyAgreed: true },
      createdAt
    );
  };

  // Today's diary (added by the owner, confirmed, deposits recorded).
  const a = await svc.createManualBooking(
    db,
    { treatmentId: (await t("Express Microdermabrasion")).id, date: today, time: "10:00", fullName: "Amelia Hart (sample)", email: "amelia.sample@example.com", phone: "07700 900101", status: "confirmed", notifyCustomer: false, internalNotes: "Booked via Instagram DM" },
    owner.name,
    hoursAgo(72)
  );
  await svc.recordPayment(db, a.id, { kind: "deposit", amountPence: a.depositDuePence, method: "bank_transfer", receivedOn: localDateOf(hoursAgo(70)), notes: "" }, owner);
  const b = await svc.createManualBooking(
    db,
    { treatmentId: (await t("Morpheus8 Face & Neck")).id, date: today, time: "14:00", fullName: "Grace Okafor (sample)", email: "grace.sample@example.com", phone: "07700 900102", status: "confirmed", notifyCustomer: false },
    owner.name,
    hoursAgo(120)
  );
  await svc.recordPayment(db, b.id, { kind: "deposit", amountPence: b.depositDuePence, method: "bank_transfer", receivedOn: localDateOf(hoursAgo(118)), notes: "" }, owner);

  // Last week — attended and paid in full.
  const past = addDaysToDate(today, -7);
  const c = await svc.createManualBooking(
    db,
    { treatmentId: (await t("Let's Glow Facial")).id, date: past, time: "11:00", fullName: "Sophie Turner-Reid (sample)", email: "sophie.sample@example.com", phone: "07700 900103", status: "confirmed", notifyCustomer: false },
    owner.name,
    hoursAgo(24 * 12)
  );
  await svc.recordPayment(db, c.id, { kind: "deposit", amountPence: c.depositDuePence, method: "bank_transfer", receivedOn: addDaysToDate(past, -4), notes: "" }, owner);
  await svc.recordPayment(db, c.id, { kind: "balance", amountPence: c.balanceDuePence, method: "card", receivedOn: past, notes: "Paid on the day" }, owner);
  await svc.markAttendance(db, c.id, "completed", owner.name);

  // Online request — deposit paid, confirmed by the owner.
  const d = await request("Needling, Dermaplaning & Light Peel", nextOpen(today, 2), 2, ["Hannah Price (sample)", "hannah.sample@example.com", "07700 900104"], "", hoursAgo(30));
  if (d) await svc.recordDepositAndConfirm(db, d.id, { amountPence: d.depositDuePence, method: "bank_transfer", receivedOn: localDateOf(hoursAgo(26)), notes: "Checked in banking app" }, owner);

  // Online requests waiting for deposits.
  await request("HIFU Body — Lower Abdomen", nextOpen(today, 3), 1, ["Chloe Bennett (sample)", "chloe.sample@example.com", "07700 900105"], "First time having HIFU — can I ask some questions before?", hoursAgo(20));
  await request("Express Microdermabrasion", nextOpen(today, 4), 4, ["Isla Morgan (sample)", "isla.sample@example.com", "07700 900106"], "", hoursAgo(2));

  // No-deposit treatment awaiting owner approval.
  await request("Medical Microdermabrasion", nextOpen(today, 5), 3, ["Priya Shah (sample)", "priya.sample@example.com", "07700 900107"], "", hoursAgo(5));

  // Confirmed booking where the client has asked to cancel.
  const e = await request("Morpheus8 Face Only", nextOpen(today, 6), 0, ["Ella Watson (sample)", "ella.sample@example.com", "07700 900108"], "", hoursAgo(60));
  if (e) {
    await svc.recordDepositAndConfirm(db, e.id, { amountPence: e.depositDuePence, method: "bank_transfer", receivedOn: localDateOf(hoursAgo(50)), notes: "" }, owner);
    await svc.requestCancellation(db, e.id, e.accessToken, "Work trip has come up — could I move to the following week?");
  }

  // Request that was never paid → expires on the next check.
  await request("Express Needling", nextOpen(today, 4), 8, ["Mia Collins (sample)", "mia.sample@example.com", "07700 900109"], "", hoursAgo(50));

  // Cancelled by the owner.
  const f = await request("Express Let's Glow", nextOpen(today, 7), 2, ["Lucy Adams (sample)", "lucy.sample@example.com", "07700 900110"], "", hoursAgo(40));
  if (f) await svc.cancelBooking(db, f.id, "Client asked to cancel by Instagram DM", owner.name);

  await svc.expireStaleBookings(db, realNow);
}
