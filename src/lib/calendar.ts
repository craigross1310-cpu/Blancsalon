import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Db } from "./db/client";
import { formatGBP } from "./core/money";
import { listBookings } from "./repo";
import { getSettings, saveSettings, siteUrl } from "./settings";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "./status";
import type { Booking } from "./types";

/** Returns the owner's calendar-feed token, creating one on first use. */
export async function ensureFeedToken(db: Db, rotate = false): Promise<string> {
  const s = await getSettings(db);
  if (s.calendar.feedToken && !rotate) return s.calendar.feedToken;
  const token = randomBytes(24).toString("base64url");
  await saveSettings(db, "calendar", { ...s.calendar, feedToken: token });
  return token;
}

export function feedUrls(token: string) {
  const https = `${siteUrl()}/api/calendar/${token}`;
  return { https, webcal: https.replace(/^https?:/, "webcal:") };
}

export async function feedTokenValid(db: Db, token: string): Promise<boolean> {
  const s = await getSettings(db);
  const a = Buffer.from(s.calendar.feedToken || "");
  const b = Buffer.from(token);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");
/** RFC 5545 line folding at 75 octets. */
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
};

function event(b: Booking): string[] {
  const pending = b.status === "pending_payment" || b.status === "pending_approval";
  const summary = `${pending ? "PENDING · " : ""}${b.customerName} — ${b.treatmentName}`;
  const desc = [
    `Ref ${b.reference} · ${BOOKING_STATUS_LABEL[b.status]}`,
    `${PAYMENT_STATUS_LABEL[b.paymentStatus]} · price ${formatGBP(b.treatmentPricePence)} · deposit ${formatGBP(b.depositDuePence)} · balance due ${formatGBP(b.outstandingPence)}`,
    `${b.customerPhone} · ${b.customerEmail}`,
    b.customerNotes ? `Client notes: ${b.customerNotes}` : "",
    `${siteUrl()}/admin/bookings/${b.id}`,
  ].filter(Boolean).join("\n");
  return [
    "BEGIN:VEVENT",
    `UID:${b.id}@blanc-salon`,
    `DTSTAMP:${stamp(b.updatedAt)}`,
    `LAST-MODIFIED:${stamp(b.updatedAt)}`,
    `SEQUENCE:${Math.floor(b.updatedAt.getTime() / 1000)}`,
    `DTSTART:${stamp(b.startsAt)}`,
    `DTEND:${stamp(b.endsAt)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(desc)}`,
    `STATUS:${pending ? "TENTATIVE" : "CONFIRMED"}`,
    `URL:${siteUrl()}/admin/bookings/${b.id}`,
    "END:VEVENT",
  ];
}

/** The owner's private diary as an iCalendar feed (subscribed from iPhone / Google Calendar). */
export async function buildOwnerFeed(db: Db, now = new Date()): Promise<string> {
  const s = await getSettings(db);
  const from = new Date(now.getTime() - 60 * 86400_000);
  const to = new Date(now.getTime() + 400 * 86400_000);
  const statuses: Booking["status"][] = ["confirmed", "completed", "no_show"];
  if (s.calendar.includePending) statuses.push("pending_payment", "pending_approval");
  const bookings = await listBookings(db, { from, to, statuses });
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BLANC Salon//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`${s.business.name} bookings`)}`,
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    ...bookings.flatMap(event),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
