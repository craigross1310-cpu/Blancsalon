import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** The salon operates in UK time. All timestamps are stored in UTC. */
export const SALON_TZ = "Europe/London";

/** "2026-11-20" + "14:30" (UK wall-clock) -> UTC Date. Handles GMT/BST automatically. */
export function localToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time.length === 5 ? time + ":00" : time}`, SALON_TZ);
}

export function localDateOf(d: Date): string {
  return formatInTimeZone(d, SALON_TZ, "yyyy-MM-dd");
}

export function localTimeOf(d: Date): string {
  return formatInTimeZone(d, SALON_TZ, "HH:mm");
}

/** 0 = Sunday ... 6 = Saturday, for a YYYY-MM-DD calendar date. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function fmtDateLong(d: Date | string): string {
  const dt = typeof d === "string" ? localToUtc(d, "12:00") : d;
  return formatInTimeZone(dt, SALON_TZ, "EEEE d MMMM yyyy");
}

export function fmtDateShort(d: Date | string): string {
  const dt = typeof d === "string" ? localToUtc(d, "12:00") : d;
  return formatInTimeZone(dt, SALON_TZ, "EEE d MMM");
}

export function fmtTime(d: Date): string {
  return formatInTimeZone(d, SALON_TZ, "h:mmaaa");
}

export function fmtDateTime(d: Date): string {
  return `${fmtDateLong(d)} at ${fmtTime(d)}`;
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr${h > 1 ? "s" : ""}`;
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function daysInMonth(date: string): number {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
