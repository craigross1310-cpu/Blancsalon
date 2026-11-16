import { describe, expect, it } from "vitest";
import { generateSlots, type BookingRules, type DayHours } from "@/lib/core/slots";
import { localTimeOf, localToUtc } from "@/lib/core/time";

const hours: DayHours = { isOpen: true, open: "09:00", close: "17:00", breaks: [{ start: "13:00", end: "13:30" }] };
const rules: BookingRules = { slotIntervalMin: 15, minNoticeHours: 24, maxAdvanceDays: 60, bufferMin: 0 };
const now = new Date("2027-01-04T09:00:00Z"); // Monday
const date = "2027-01-06"; // Wednesday
const times = (s: { time: string }[]) => s.map((x) => x.time);

describe("generateSlots", () => {
  it("only offers starts where the whole appointment fits before closing", () => {
    const s = generateSlots({ date, durationMin: 45, hours, bookings: [], blocks: [], rules, now });
    expect(times(s)[0]).toBe("09:00");
    expect(times(s)).toContain("16:15"); // 16:15–17:00
    expect(times(s)).not.toContain("16:30");
    expect(s.every((x) => x.end.getTime() - x.start.getTime() === 45 * 60_000)).toBe(true);
  });

  it("avoids breaks for the whole appointment window", () => {
    const s = times(generateSlots({ date, durationMin: 45, hours, bookings: [], blocks: [], rules, now }));
    expect(s).toContain("12:15"); // ends 13:00
    expect(s).not.toContain("12:30"); // would run into the break
    expect(s).not.toContain("13:00");
    expect(s).toContain("13:30");
  });

  it("prevents overlap with an existing 45-minute booking", () => {
    const booked = { start: localToUtc(date, "10:00"), end: localToUtc(date, "10:45") };
    const s = times(generateSlots({ date, durationMin: 45, hours, bookings: [booked], blocks: [], rules, now }));
    expect(s).toContain("09:15"); // 09:15–10:00 touches but does not overlap
    expect(s).not.toContain("09:30");
    expect(s).not.toContain("10:00");
    expect(s).not.toContain("10:30");
    expect(s).toContain("10:45");
  });

  it("applies the buffer around bookings but not around blocks", () => {
    const booked = { start: localToUtc(date, "10:00"), end: localToUtc(date, "10:45") };
    const block = { start: localToUtc(date, "15:00"), end: localToUtc(date, "16:00") };
    const s = times(generateSlots({ date, durationMin: 30, hours, bookings: [booked], blocks: [block], rules: { ...rules, bufferMin: 15 }, now }));
    expect(s).not.toContain("09:30"); // would end 10:00, needs 15 min gap
    expect(s).toContain("09:15");
    expect(s).not.toContain("10:45");
    expect(s).toContain("11:00");
    expect(s).toContain("14:30"); // ends exactly at block start
    expect(s).not.toContain("14:45");
    expect(s).toContain("16:00");
  });

  it("respects closed days, notice period and booking window", () => {
    expect(generateSlots({ date, durationMin: 30, hours: { ...hours, isOpen: false }, bookings: [], blocks: [], rules, now })).toEqual([]);
    const soon = generateSlots({ date: "2027-01-05", durationMin: 30, hours, bookings: [], blocks: [], rules, now });
    expect(times(soon)[0]).toBe("09:00"); // exactly 24h notice (UTC == UK in January)
    const tooSoon = generateSlots({ date: "2027-01-05", durationMin: 30, hours, bookings: [], blocks: [], rules: { ...rules, minNoticeHours: 30 }, now });
    expect(times(tooSoon)[0]).toBe("15:00");
    expect(generateSlots({ date: "2027-03-10", durationMin: 30, hours, bookings: [], blocks: [], rules, now })).toEqual([]); // > 60 days
    expect(generateSlots({ date: "2027-01-03", durationMin: 30, hours, bookings: [], blocks: [], rules, now })).toEqual([]); // past
  });

  it("handles British Summer Time correctly", () => {
    const summerNow = new Date("2027-06-01T08:00:00Z");
    const s = generateSlots({ date: "2027-06-09", durationMin: 60, hours, bookings: [], blocks: [], rules, now: summerNow });
    expect(s[0].start.toISOString()).toBe("2027-06-09T08:00:00.000Z"); // 09:00 BST
    expect(localTimeOf(s[0].start)).toBe("09:00");
    // Day the clocks go forward (28 Mar 2027)
    const dst = generateSlots({ date: "2027-03-28", durationMin: 60, hours, bookings: [], blocks: [], rules, now: new Date("2027-03-20T00:00:00Z") });
    expect(dst[0].start.toISOString()).toBe("2027-03-28T08:00:00.000Z");
  });
});
