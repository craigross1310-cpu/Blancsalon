"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, requireAdmin } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  anonymiseInactiveCustomers,
  BookingError,
  cancelBooking,
  confirmBooking,
  createManualBooking,
  declineBooking,
  deletePayment,
  markAttendance,
  recordDepositAndConfirm,
  recordPayment,
  rescheduleBooking,
  updateInternalNotes,
} from "@/lib/booking/service";
import { parsePoundsToPence } from "@/lib/core/money";
import { isValidDate, localToUtc } from "@/lib/core/time";
import { slugify } from "@/lib/db/catalog";
import { getDb } from "@/lib/db/client";
import {
  deleteTimeBlock,
  deleteTreatment,
  getTreatment,
  insertTimeBlock,
  insertTreatment,
  saveOpeningHours,
  updateTreatment,
  type TreatmentInput,
} from "@/lib/repo";
import { getSettings, saveSettings } from "@/lib/settings";
import type { AllSettings } from "@/lib/settings-schema";
import { storeImage } from "@/lib/storage";
import type { OpeningDay, PaymentKind, PaymentMethod } from "@/lib/types";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const b = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const n = (fd: FormData, k: string, d = 0) => {
  const v = Number(fd.get(k));
  return Number.isFinite(v) ? v : d;
};
const back = (path: string, msg: string, kind: "msg" | "error" = "msg"): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);

async function guard<T>(path: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof BookingError || (err instanceof Error && err.message && !("digest" in err))) {
      return back(path, (err as Error).message, "error");
    }
    throw err;
  }
}

// ── Auth ───────────────────────────────────────────────────────
export async function loginAction(_: unknown, fd: FormData) {
  const r = await login(s(fd, "email"), String(fd.get("password") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function changePasswordAction(fd: FormData) {
  const admin = await requireAdmin();
  const db = await getDb();
  const path = "/admin/settings?tab=account";
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const [row] = await db.query<{ password_hash: string }>(`select password_hash from admin_users where id = $1`, [admin.id]);
  if (!(await verifyPassword(current, row?.password_hash))) back(path, "Current password is incorrect.", "error");
  if (next.length < 10) back(path, "Use at least 10 characters for the new password.", "error");
  await db.query(`update admin_users set password_hash = $2 where id = $1`, [admin.id, await hashPassword(next)]);
  back(path, "Password updated.");
}

// ── Bookings ───────────────────────────────────────────────────
const bookingPath = (id: string) => `/admin/bookings/${id}`;
function paymentFrom(fd: FormData) {
  const amount = parsePoundsToPence(s(fd, "amount"));
  if (amount === null || amount <= 0) throw new BookingError("INVALID", "Enter a valid amount, e.g. 10.00");
  const receivedOn = s(fd, "receivedOn");
  if (!isValidDate(receivedOn)) throw new BookingError("INVALID", "Enter the date the payment was received.");
  return { amountPence: amount, method: (s(fd, "method") || "bank_transfer") as PaymentMethod, receivedOn, notes: s(fd, "notes") };
}

export async function depositAndConfirmAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = s(fd, "id");
  await guard(bookingPath(id), async () => {
    await recordDepositAndConfirm(await getDb(), id, paymentFrom(fd), { id: admin.id, name: admin.name || admin.email });
  });
  revalidatePath("/admin", "layout");
  back(bookingPath(id), "Deposit recorded and booking confirmed. The client has been emailed.");
}

export async function recordPaymentAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = s(fd, "id");
  await guard(bookingPath(id), async () => {
    await recordPayment(await getDb(), id, { ...paymentFrom(fd), kind: (s(fd, "kind") || "deposit") as PaymentKind }, { id: admin.id, name: admin.name || admin.email });
  });
  revalidatePath("/admin", "layout");
  back(bookingPath(id), "Payment recorded.");
}

export async function deletePaymentAction(fd: FormData) {
  const admin = await requireAdmin("owner");
  const id = s(fd, "bookingId");
  await guard(bookingPath(id), async () => deletePayment(await getDb(), s(fd, "paymentId"), admin.name || admin.email));
  back(bookingPath(id), "Payment record removed.");
}

export async function confirmAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = s(fd, "id");
  await guard(bookingPath(id), async () =>
    confirmBooking(await getDb(), id, admin.name || admin.email, { allowWithoutDeposit: b(fd, "withoutDeposit") })
  );
  revalidatePath("/admin", "layout");
  back(bookingPath(id), "Booking confirmed. The client has been emailed.");
}

export async function declineAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = s(fd, "id");
  await guard(bookingPath(id), async () => declineBooking(await getDb(), id, s(fd, "reason"), admin.name || admin.email, b(fd, "notify")));
  back(bookingPath(id), "Booking declined.");
}

export async function cancelAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = s(fd, "id");
  await guard(bookingPath(id), async () => cancelBooking(await getDb(), id, s(fd, "reason"), admin.name || admin.email, b(fd, "notify")));
  back(bookingPath(id), "Booking cancelled.");
}

export async function attendanceAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = s(fd, "id");
  const outcome = s(fd, "outcome") === "no_show" ? "no_show" : "completed";
  await guard(bookingPath(id), async () => markAttendance(await getDb(), id, outcome, admin.name || admin.email));
  back(bookingPath(id), outcome === "completed" ? "Marked as completed." : "Marked as no-show.");
}

export async function rescheduleAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = s(fd, "id");
  await guard(bookingPath(id), async () =>
    rescheduleBooking(await getDb(), id, s(fd, "date"), s(fd, "time"), admin.name || admin.email, {
      ignoreHours: b(fd, "ignoreHours"),
      notify: b(fd, "notify"),
    })
  );
  back(bookingPath(id), "Appointment moved.");
}

export async function notesAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = s(fd, "id");
  await updateInternalNotes(await getDb(), id, s(fd, "internalNotes"), admin.name || admin.email);
  back(bookingPath(id), "Notes saved.");
}

export async function manualBookingAction(fd: FormData) {
  const admin = await requireAdmin();
  const path = `/admin/bookings/new?date=${s(fd, "date")}&time=${s(fd, "time")}`;
  const booking = await guard(path, async () => {
    const date = s(fd, "date");
    if (!isValidDate(date) || !/^\d{2}:\d{2}$/.test(s(fd, "time"))) throw new BookingError("INVALID", "Choose a date and time.");
    if (s(fd, "fullName").length < 2) throw new BookingError("INVALID", "Enter the client's name.");
    const priceOverride = s(fd, "price") ? parsePoundsToPence(s(fd, "price")) : null;
    const db = await getDb();
    const bk = await createManualBooking(
      db,
      {
        treatmentId: s(fd, "treatmentId"),
        date,
        time: s(fd, "time"),
        fullName: s(fd, "fullName"),
        email: s(fd, "email") || `no-email-${Date.now()}@invalid`,
        phone: s(fd, "phone"),
        customerNotes: "",
        internalNotes: s(fd, "internalNotes"),
        status: s(fd, "status") === "pending_payment" ? "pending_payment" : "confirmed",
        pricePenceOverride: priceOverride ?? undefined,
        notifyCustomer: b(fd, "notify") && !!s(fd, "email"),
      },
      admin.name || admin.email
    );
    if (b(fd, "depositPaid") && bk.depositDuePence > 0) {
      await recordPayment(db, bk.id, { kind: "deposit", amountPence: bk.depositDuePence, method: (s(fd, "method") || "bank_transfer") as PaymentMethod, receivedOn: s(fd, "receivedOn") || date, notes: "" }, { id: admin.id, name: admin.name || admin.email });
    }
    return bk;
  });
  revalidatePath("/admin", "layout");
  back(bookingPath(booking.id), "Booking added to the diary.");
}

// ── Availability ───────────────────────────────────────────────
export async function blockTimeAction(fd: FormData) {
  await requireAdmin();
  const ret = s(fd, "return") || "/admin/availability";
  await guard(ret, async () => {
    const date = s(fd, "date");
    const endDate = s(fd, "endDate") || date;
    if (!isValidDate(date) || !isValidDate(endDate)) throw new Error("Choose a valid date.");
    const allDay = b(fd, "allDay");
    const start = localToUtc(date, allDay ? "00:00" : s(fd, "start") || "00:00");
    const end = allDay
      ? localToUtc(endDate, "23:59")
      : localToUtc(endDate, s(fd, "end") || "23:59");
    if (end <= start) throw new Error("The end must be after the start.");
    await insertTimeBlock(await getDb(), { startsAt: start, endsAt: end, reason: s(fd, "reason") });
  });
  revalidatePath("/admin", "layout");
  back(ret, "Time blocked out — clients can no longer book it.");
}

export async function deleteBlockAction(fd: FormData) {
  await requireAdmin();
  await deleteTimeBlock(await getDb(), s(fd, "id"));
  back(s(fd, "return") || "/admin/availability", "Block removed.");
}

export async function hoursAction(fd: FormData) {
  await requireAdmin("owner");
  const days: OpeningDay[] = [];
  for (let d = 0; d < 7; d++) {
    const breaks: { start: string; end: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const bs = s(fd, `break_${d}_${i}_start`);
      const be = s(fd, `break_${d}_${i}_end`);
      if (bs && be && be > bs) breaks.push({ start: bs, end: be });
    }
    const open = s(fd, `open_${d}`) || "09:00";
    const close = s(fd, `close_${d}`) || "17:00";
    if (close <= open) back("/admin/availability", "Closing time must be after opening time.", "error");
    days.push({ weekday: d, isOpen: b(fd, `isOpen_${d}`), open, close, breaks });
  }
  const db = await getDb();
  await saveOpeningHours(db, days);
  const settings = await getSettings(db);
  await saveSettings(db, "booking", {
    ...settings.booking,
    slotIntervalMin: Math.min(120, Math.max(5, n(fd, "slotIntervalMin", 15))),
    minNoticeHours: Math.max(0, n(fd, "minNoticeHours", 24)),
    maxAdvanceDays: Math.min(365, Math.max(1, n(fd, "maxAdvanceDays", 60))),
    bufferMin: Math.min(120, Math.max(0, n(fd, "bufferMin", 0))),
    reminderHoursBefore: Math.min(168, Math.max(1, n(fd, "reminderHoursBefore", 24))),
  });
  revalidatePath("/", "layout");
  back("/admin/availability", "Working hours saved.");
}

// ── Treatments ─────────────────────────────────────────────────
export async function saveTreatmentAction(fd: FormData) {
  await requireAdmin("owner");
  const id = s(fd, "id");
  const path = `/admin/treatments/${id || "new"}`;
  const saved = await guard(path, async () => {
    const db = await getDb();
    const price = parsePoundsToPence(s(fd, "price"));
    if (price === null) throw new Error("Enter a valid price, e.g. 45 or 45.00");
    const depositType = s(fd, "depositType") === "percentage" ? "percentage" : "fixed";
    const fixed = parsePoundsToPence(s(fd, "depositFixed") || "0");
    const percent = Number(s(fd, "depositPercent") || "0");
    if (depositType === "fixed" && fixed === null) throw new Error("Enter a valid deposit amount.");
    if (depositType === "percentage" && (!Number.isFinite(percent) || percent < 0 || percent > 100)) throw new Error("Deposit percentage must be between 0 and 100.");
    if (depositType === "fixed" && (fixed ?? 0) > price) throw new Error("A fixed deposit can't be more than the treatment price.");
    const duration = Math.round(n(fd, "durationMin"));
    if (duration < 5 || duration > 600) throw new Error("Duration must be between 5 and 600 minutes.");
    const name = s(fd, "name");
    if (!name) throw new Error("Enter a treatment name.");
    const existing = id ? await getTreatment(db, id) : null;
    let imageUrl = existing?.imageUrl ?? null;
    const upload = s(fd, "imageData");
    if (upload) imageUrl = await storeImage(upload);
    if (b(fd, "removeImage")) imageUrl = null;
    let slug = existing?.slug ?? slugify(name);
    if (!existing) {
      const clash = await getTreatment(db, slug);
      if (clash) slug = `${slug}-${Date.now().toString(36)}`;
    }
    const input: TreatmentInput = {
      slug,
      category: s(fd, "category") || "Treatments",
      name,
      summary: s(fd, "summary"),
      description: s(fd, "description"),
      pricePence: price,
      priceNote: s(fd, "priceNote"),
      durationMin: duration,
      depositType,
      depositFixedPence: fixed ?? 0,
      depositPercent: Math.round(percent * 100) / 100,
      preparationInfo: s(fd, "preparationInfo"),
      aftercareInfo: s(fd, "aftercareInfo"),
      imageUrl,
      active: b(fd, "active"),
      onlineBooking: b(fd, "onlineBooking"),
      featured: b(fd, "featured"),
      sortOrder: Math.round(n(fd, "sortOrder", existing?.sortOrder ?? 999)),
      reviewNote: s(fd, "reviewNote"),
    };
    return existing ? updateTreatment(db, existing.id, input) : insertTreatment(db, input);
  });
  revalidatePath("/", "layout");
  back(`/admin/treatments/${saved.id}`, "Treatment saved. Existing bookings keep the price and deposit they were made with.");
}

export async function deleteTreatmentAction(fd: FormData) {
  await requireAdmin("owner");
  const r = await deleteTreatment(await getDb(), s(fd, "id"));
  revalidatePath("/", "layout");
  back("/admin/treatments", r === "deleted" ? "Treatment deleted." : "Treatment has bookings, so it was deactivated instead of deleted.");
}

// ── Settings ───────────────────────────────────────────────────
export async function saveSettingsAction(fd: FormData) {
  await requireAdmin("owner");
  const section = s(fd, "section") as keyof AllSettings;
  const db = await getDb();
  const current = await getSettings(db);
  const path = `/admin/settings?tab=${section}`;
  const base = current[section] as unknown as Record<string, unknown>;
  const next: Record<string, unknown> = { ...base };
  for (const [key, val] of Object.entries(base)) {
    if (key === "version") continue;
    if (typeof val === "boolean") next[key] = b(fd, key);
    else if (typeof val === "number") {
      if (fd.has(key)) next[key] = Math.max(0, n(fd, key, val));
    } else if (fd.has(key)) next[key] = String(fd.get(key) ?? "").trim();
  }
  if (section === "policies") next.version = `v-${new Date().toISOString()}`;
  if (section === "payment") {
    const sc = String(next.sortCode ?? "").replace(/\D/g, "");
    if (sc && sc.length !== 6) back(path, "Sort code should be 6 digits.", "error");
    if (sc) next.sortCode = `${sc.slice(0, 2)}-${sc.slice(2, 4)}-${sc.slice(4, 6)}`;
    const an = String(next.accountNumber ?? "").replace(/\s/g, "");
    if (an && !/^\d{8}$/.test(an)) back(path, "Account number should be 8 digits.", "error");
    next.accountNumber = an;
    next.deadlineHours = Math.min(168, Math.max(1, Number(next.deadlineHours) || 24));
  }
  await saveSettings(db, section, next as never);
  revalidatePath("/", "layout");
  back(path, "Settings saved.");
}

export async function rotateCalendarAction() {
  await requireAdmin("owner");
  const { ensureFeedToken } = await import("@/lib/calendar");
  await ensureFeedToken(await getDb(), true);
  back("/admin/settings?tab=calendar", "New calendar link created — the old one no longer works. Re-add it to your calendar.");
}

export async function anonymiseNowAction() {
  await requireAdmin("owner");
  const db = await getDb();
  const settings = await getSettings(db);
  const count = await anonymiseInactiveCustomers(db, settings.privacy.retentionMonths);
  back("/admin/settings?tab=privacy", `${count} inactive client record(s) anonymised.`);
}
