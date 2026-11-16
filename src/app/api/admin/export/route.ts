import { type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/session";
import { penceToInput } from "@/lib/core/money";
import { localDateOf, localTimeOf } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { listBookings, listPayments } from "@/lib/repo";
import { BOOKING_STATUS_LABEL, PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/status";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Prevent spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** CSV exports for bookkeeping. Owner only. */
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin || admin.role !== "owner") return new Response("Unauthorised", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") === "payments" ? "payments" : "bookings";
  const from = sp.get("from") || undefined;
  const to = sp.get("to") || undefined;
  const db = await getDb();
  let body: string;
  if (type === "payments") {
    const payments = await listPayments(db, { from, to });
    body = csv([
      ["Date received", "Booking reference", "Client", "Treatment", "Type", "Method", "Amount (GBP)", "Signed amount (GBP)", "Notes", "Recorded by", "Recorded at", "Verification"],
      ...payments.map((p) => [
        p.receivedOn, p.bookingReference, p.customerName, p.treatmentName, PAYMENT_KIND_LABEL[p.kind], PAYMENT_METHOD_LABEL[p.method],
        penceToInput(p.amountPence), penceToInput(p.kind === "refund" ? -p.amountPence : p.amountPence), p.notes, p.recordedByName,
        p.createdAt.toISOString(), "Recorded manually by salon",
      ]),
    ]);
  } else {
    const bookings = await listBookings(db, {
      from: from ? new Date(`${from}T00:00:00Z`) : undefined,
      to: to ? new Date(`${to}T23:59:59Z`) : undefined,
    });
    body = csv([
      ["Reference", "Appointment date", "Time", "Client", "Email", "Mobile", "Treatment", "Duration (min)", "Status", "Payment status", "Price (GBP)", "Deposit rule", "Deposit due (GBP)", "Recorded paid (GBP)", "Outstanding (GBP)", "Source", "Created"],
      ...bookings.map((b) => [
        b.reference, localDateOf(b.startsAt), localTimeOf(b.startsAt), b.customerName, b.customerEmail, b.customerPhone, b.treatmentName,
        b.durationMin, BOOKING_STATUS_LABEL[b.status], PAYMENT_STATUS_LABEL[b.paymentStatus], penceToInput(b.treatmentPricePence),
        b.depositType === "percentage" ? `${b.depositPercent}%` : `£${penceToInput(b.depositFixedPence)} fixed`,
        penceToInput(b.depositDuePence), penceToInput(b.paidPence),
        penceToInput(["cancelled", "declined", "expired"].includes(b.status) ? 0 : b.outstandingPence), b.source, b.createdAt.toISOString(),
      ]),
    ]);
  }
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blanc-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
