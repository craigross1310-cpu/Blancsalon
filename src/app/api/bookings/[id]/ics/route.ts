import { type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { getBooking } from "@/lib/repo";
import { getSettings } from "@/lib/settings";

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/[\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

/** "Add to calendar" file for the customer (requires the private booking token). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const b = await getBooking(db, id);
  if (!b || b.accessToken !== req.nextUrl.searchParams.get("t") || b.status !== "confirmed") {
    return new Response("Not found", { status: 404 });
  }
  const s = await getSettings(db);
  const loc = [s.business.addressLine1, s.business.town, s.business.postcode].filter(Boolean).join(", ");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BLANC Salon//Booking//EN", "BEGIN:VEVENT",
    `UID:${b.id}@blanc-salon`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(b.startsAt)}`, `DTEND:${icsDate(b.endsAt)}`,
    `SUMMARY:${esc(`${b.treatmentName} at BLANC`)}`, `DESCRIPTION:${esc(`Booking reference ${b.reference}`)}`,
    ...(loc ? [`LOCATION:${esc(loc)}`] : []), "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="blanc-${b.reference}.ics"` },
  });
}
