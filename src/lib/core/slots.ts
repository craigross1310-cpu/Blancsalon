import { addDaysToDate, diffDays, localDateOf, localToUtc, minutesToTime, timeToMinutes } from "./time";

export interface BreakPeriod {
  start: string; // "13:00"
  end: string; // "13:30"
}

export interface DayHours {
  isOpen: boolean;
  open: string; // "09:00"
  close: string; // "17:00"
  breaks: BreakPeriod[];
}

export interface Interval {
  start: Date;
  end: Date;
}

export interface BookingRules {
  slotIntervalMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  bufferMin: number;
}

export interface SlotInput {
  date: string; // YYYY-MM-DD (UK)
  durationMin: number;
  hours: DayHours;
  /** Existing active bookings (pending + confirmed). Buffer is applied around these. */
  bookings: Interval[];
  /** Owner blocked-out periods (holidays, personal appointments). No buffer applied. */
  blocks: Interval[];
  rules: BookingRules;
  now: Date;
}

export interface Slot {
  time: string; // "14:30" UK time
  start: Date;
  end: Date;
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Is the date inside the customer's booking window (today .. today + maxAdvanceDays)? */
export function isWithinBookingWindow(date: string, rules: BookingRules, now: Date): boolean {
  const today = localDateOf(now);
  const d = diffDays(date, today);
  return d >= 0 && d <= rules.maxAdvanceDays;
}

/**
 * Generates bookable start times for one day.
 * A slot is offered only if the whole appointment window [start, start + duration)
 * fits inside working hours, avoids breaks, blocked periods and other appointments
 * (plus the configured buffer), and respects the minimum notice period.
 */
export function generateSlots(input: SlotInput): Slot[] {
  const { date, durationMin, hours, rules, now } = input;
  if (!hours.isOpen || durationMin <= 0) return [];
  if (!isWithinBookingWindow(date, rules, now)) return [];

  const openMin = timeToMinutes(hours.open);
  const closeMin = timeToMinutes(hours.close);
  const step = Math.max(5, rules.slotIntervalMin);
  const earliest = now.getTime() + rules.minNoticeHours * 3600_000;
  const bufferMs = Math.max(0, rules.bufferMin) * 60_000;
  const breaks = hours.breaks.map((b) => [timeToMinutes(b.start), timeToMinutes(b.end)] as const);

  const slots: Slot[] = [];
  for (let m = openMin; m + durationMin <= closeMin; m += step) {
    if (breaks.some(([bs, be]) => overlaps(m, m + durationMin, bs, be))) continue;
    const time = minutesToTime(m);
    const start = localToUtc(date, time);
    const end = new Date(start.getTime() + durationMin * 60_000);
    if (start.getTime() < earliest) continue;
    const s = start.getTime();
    const e = end.getTime();
    if (input.blocks.some((b) => overlaps(s, e, b.start.getTime(), b.end.getTime()))) continue;
    if (input.bookings.some((b) => overlaps(s, e, b.start.getTime() - bufferMs, b.end.getTime() + bufferMs))) continue;
    slots.push({ time, start, end });
  }
  return slots;
}

/** Lists dates from `from` for `days` days. */
export function dateRange(from: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDaysToDate(from, i));
}
