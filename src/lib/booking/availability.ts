import type { Db } from "../db/client";
import { generateSlots, type Slot } from "../core/slots";
import { addDaysToDate, localToUtc, weekdayOf } from "../core/time";
import { busyBookings, getOpeningHours, listTimeBlocks } from "../repo";
import { getSettings } from "../settings";

/**
 * Computes bookable slots for each requested date in one pass
 * (one query for bookings, one for blocks).
 */
export async function computeAvailability(
  db: Db,
  durationMin: number,
  dates: string[],
  now: Date,
  opts: { excludeBookingId?: string; ownerOverride?: boolean } = {}
): Promise<Map<string, Slot[]>> {
  const result = new Map<string, Slot[]>();
  if (!dates.length) return result;
  const sorted = [...dates].sort();
  const settings = await getSettings(db);
  const hours = await getOpeningHours(db);
  const pad = settings.booking.bufferMin * 60_000;
  // The owner isn't bound by the customer notice period / advance window.
  const rules = opts.ownerOverride ? { ...settings.booking, minNoticeHours: 0, maxAdvanceDays: 3650 } : settings.booking;
  const rangeStart = localToUtc(sorted[0], "00:00");
  const rangeEnd = localToUtc(addDaysToDate(sorted[sorted.length - 1], 1), "00:00");
  const bookings = await busyBookings(
    db,
    new Date(rangeStart.getTime() - pad),
    new Date(rangeEnd.getTime() + pad),
    opts.excludeBookingId
  );
  const blocks = (await listTimeBlocks(db, rangeStart, rangeEnd)).map((b) => ({ start: b.startsAt, end: b.endsAt }));
  for (const date of dates) {
    const day = hours.find((h) => h.weekday === weekdayOf(date));
    result.set(
      date,
      day
        ? generateSlots({ date, durationMin, hours: day, bookings, blocks, rules, now })
        : []
    );
  }
  return result;
}
