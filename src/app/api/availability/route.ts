import { NextResponse, type NextRequest } from "next/server";
import { computeAvailability } from "@/lib/booking/availability";
import { expireStaleBookings } from "@/lib/booking/service";
import { addDaysToDate, daysInMonth, fmtTime, isValidDate } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { getTreatment } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Public availability. Returns only free start times — never any information
 * about other clients' bookings.
 *   ?treatment=<id>&month=YYYY-MM  → { days: [{ date, count }] }
 *   ?treatment=<id>&date=YYYY-MM-DD → { slots: [{ time, label }] }
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const db = await getDb();
  const treatment = await getTreatment(db, sp.get("treatment") ?? "");
  if (!treatment || !treatment.active || !treatment.onlineBooking) {
    return NextResponse.json({ error: "Unknown treatment" }, { status: 404 });
  }
  const now = new Date();
  await expireStaleBookings(db, now);

  const month = sp.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const first = `${month}-01`;
    const dates = Array.from({ length: daysInMonth(first) }, (_, i) => addDaysToDate(first, i));
    const map = await computeAvailability(db, treatment.durationMin, dates, now);
    return NextResponse.json(
      { days: dates.map((date) => ({ date, count: map.get(date)?.length ?? 0 })) },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  const date = sp.get("date") ?? "";
  if (isValidDate(date)) {
    const slots = (await computeAvailability(db, treatment.durationMin, [date], now)).get(date) ?? [];
    return NextResponse.json(
      { slots: slots.map((s) => ({ time: s.time, label: fmtTime(s.start), end: fmtTime(s.end) })) },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json({ error: "Provide month=YYYY-MM or date=YYYY-MM-DD" }, { status: 400 });
}
