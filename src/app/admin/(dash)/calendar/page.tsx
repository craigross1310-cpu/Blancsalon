import Link from "next/link";
import { blockTimeAction, deleteBlockAction } from "@/app/admin/actions";
import { Card, Flash, btn, input, label } from "@/components/admin/ui";
import { addDaysToDate, daysInMonth, fmtDateLong, fmtTime, isValidDate, localDateOf, localTimeOf, localToUtc, timeToMinutes, weekdayOf } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { getOpeningHours, listBookings, listTimeBlocks } from "@/lib/repo";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_STYLE } from "@/lib/status";
import type { Booking, BookingStatus, TimeBlock } from "@/lib/types";

type View = "day" | "week" | "month";
const SHOWN: BookingStatus[] = ["pending_payment", "pending_approval", "confirmed", "completed", "no_show", "cancelled"];
const HOUR_PX = 64;

function mondayOf(date: string) {
  return addDaysToDate(date, -((weekdayOf(date) + 6) % 7));
}

function shortDay(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
}

function TimeGrid({ days, bookings, blocks, startHour, endHour, today }: { days: string[]; bookings: Booking[]; blocks: TimeBlock[]; startHour: number; endHour: number; today: string }) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const top = (d: Date) => ((timeToMinutes(localTimeOf(d)) - startHour * 60) / 60) * HOUR_PX;
  return (
    <div className="overflow-x-auto rounded-lg border border-sand bg-white">
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}>
        <div className="border-b border-sand" />
        {days.map((d) => (
          <Link key={d} href={`/admin/calendar?view=day&date=${d}`} className={`border-b border-l border-sand px-2 py-2 text-center text-xs ${d === today ? "bg-gold-light/30 font-semibold" : ""}`}>
            {shortDay(d)}
          </Link>
        ))}
        <div className="relative" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h, i) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-[0.65rem] text-taupe" style={{ top: i * HOUR_PX }}>{i ? `${String(h).padStart(2, "0")}:00` : ""}</span>
          ))}
        </div>
        {days.map((d) => {
          const dayBookings = bookings.filter((b) => localDateOf(b.startsAt) === d);
          const dayBlocks = blocks.filter((b) => localDateOf(b.startsAt) <= d && localDateOf(b.endsAt) >= d);
          return (
            <div key={d} className="relative border-l border-sand" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h, i) => (
                <Link key={h} href={`/admin/bookings/new?date=${d}&time=${String(h).padStart(2, "0")}:00`} className="absolute inset-x-0 border-t border-sand/70 hover:bg-cream/50" style={{ top: i * HOUR_PX, height: HOUR_PX }} aria-label={`Add booking ${d} ${h}:00`} />
              ))}
              {dayBlocks.map((bl) => {
                const s = localDateOf(bl.startsAt) < d ? 0 : Math.max(0, top(bl.startsAt));
                const e = localDateOf(bl.endsAt) > d ? hours.length * HOUR_PX : Math.min(hours.length * HOUR_PX, top(bl.endsAt));
                return (
                  <div key={bl.id} className="absolute inset-x-0.5 overflow-hidden rounded bg-[repeating-linear-gradient(135deg,#ece6dc,#ece6dc_6px,#f6f2ec_6px,#f6f2ec_12px)] p-1 text-[0.65rem] text-taupe" style={{ top: s, height: Math.max(18, e - s) }}>
                    Blocked{bl.reason && ` · ${bl.reason}`}
                  </div>
                );
              })}
              {dayBookings.map((b) => {
                const t = top(b.startsAt);
                const h = (b.durationMin / 60) * HOUR_PX;
                return (
                  <Link key={b.id} href={`/admin/bookings/${b.id}`} className={`absolute inset-x-1 overflow-hidden rounded border-l-4 px-1.5 py-1 text-[0.7rem] leading-tight shadow-sm transition hover:z-10 hover:shadow-md ${BOOKING_STATUS_STYLE[b.status].block}`} style={{ top: Math.max(0, t), height: Math.max(22, h - 2) }} title={`${b.customerName} — ${b.treatmentName} (${BOOKING_STATUS_LABEL[b.status]})`}>
                    <p className="font-semibold">{fmtTime(b.startsAt)} {b.customerName}</p>
                    <p className="truncate opacity-80">{b.treatmentName} · {b.durationMin}m</p>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const view: View = sp.view === "day" || sp.view === "month" ? sp.view : "week";
  const today = localDateOf(new Date());
  const date = sp.date && isValidDate(sp.date) ? sp.date : today;
  const db = await getDb();
  const hours = await getOpeningHours(db);

  let days: string[];
  let prev: string, next: string, title: string;
  if (view === "day") {
    days = [date];
    prev = addDaysToDate(date, -1);
    next = addDaysToDate(date, 1);
    title = fmtDateLong(date);
  } else if (view === "week") {
    const mon = mondayOf(date);
    days = Array.from({ length: 7 }, (_, i) => addDaysToDate(mon, i));
    prev = addDaysToDate(mon, -7);
    next = addDaysToDate(mon, 7);
    title = `Week of ${fmtDateLong(mon)}`;
  } else {
    const first = `${date.slice(0, 7)}-01`;
    const gridStart = mondayOf(first);
    const last = addDaysToDate(first, daysInMonth(first) - 1);
    const gridEnd = addDaysToDate(mondayOf(last), 6);
    const count = Math.round((Date.parse(gridEnd) - Date.parse(gridStart)) / 86400000) + 1;
    days = Array.from({ length: count }, (_, i) => addDaysToDate(gridStart, i));
    prev = addDaysToDate(first, -1).slice(0, 7) + "-01";
    next = addDaysToDate(last, 1);
    title = new Date(`${first}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  const from = localToUtc(days[0], "00:00");
  const to = localToUtc(addDaysToDate(days[days.length - 1], 1), "00:00");
  const [bookings, blocks] = await Promise.all([listBookings(db, { from, to, statuses: SHOWN }), listTimeBlocks(db, from, to)]);
  const openDays = hours.filter((h) => h.isOpen);
  const startHour = Math.min(8, ...openDays.map((h) => Math.floor(timeToMinutes(h.open) / 60)), ...bookings.map((b) => Number(localTimeOf(b.startsAt).slice(0, 2))));
  const endHour = Math.max(19, ...openDays.map((h) => Math.ceil(timeToMinutes(h.close) / 60)), ...bookings.map((b) => Math.ceil(timeToMinutes(localTimeOf(b.endsAt)) / 60)));
  const q = (v: View, d: string) => `/admin/calendar?view=${v}&date=${d}`;

  return (
    <div className="mx-auto max-w-7xl">
      <Flash msg={sp.msg} error={sp.error} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Link href={q(view, prev)} className={btn.small} aria-label="Previous">‹</Link>
          <Link href={q(view, today)} className={btn.small}>Today</Link>
          <Link href={q(view, next)} className={btn.small} aria-label="Next">›</Link>
          <h1 className="ml-2 font-display text-2xl">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-stone">
            {(["day", "week", "month"] as View[]).map((v) => (
              <Link key={v} href={q(v, date)} className={`px-3.5 py-1.5 text-xs capitalize ${v === view ? "bg-ink text-gold-light" : "bg-white"}`}>{v}</Link>
            ))}
          </div>
          <Link href={`/admin/bookings/new?date=${date}`} className={btn.primary}>+ Booking</Link>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {(["pending_payment", "pending_approval", "confirmed", "completed", "cancelled"] as BookingStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${BOOKING_STATUS_STYLE[s].dot}`} />{BOOKING_STATUS_LABEL[s]}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#e2dacd]" />Blocked</span>
      </div>

      {view === "month" ? (
        <div className="overflow-hidden rounded-lg border border-sand bg-white">
          <div className="grid grid-cols-7 border-b border-sand text-center text-[0.65rem] uppercase tracking-wider text-taupe">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const inMonth = d.slice(0, 7) === date.slice(0, 7);
              const list = bookings.filter((b) => localDateOf(b.startsAt) === d && b.status !== "cancelled");
              const blocked = blocks.some((b) => localDateOf(b.startsAt) <= d && localDateOf(b.endsAt) >= d);
              const closed = !hours.find((h) => h.weekday === weekdayOf(d))?.isOpen;
              return (
                <Link key={d} href={q("day", d)} className={`min-h-20 border-b border-r border-sand p-1.5 text-left transition hover:bg-cream/60 sm:min-h-28 ${inMonth ? "" : "bg-stone-50 text-stone-400"} ${closed && inMonth ? "bg-[#faf8f5]" : ""}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${d === today ? "bg-ink text-gold-light" : ""}`}>{Number(d.slice(8))}</span>
                  {blocked && <span className="ml-1 text-[0.6rem] text-taupe">blocked</span>}
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((b) => (
                      <div key={b.id} className={`truncate rounded px-1 text-[0.62rem] ${BOOKING_STATUS_STYLE[b.status].block} border-l-2`}>
                        <span className="hidden sm:inline">{fmtTime(b.startsAt)} </span>{b.customerName.split(" ")[0]}
                      </div>
                    ))}
                    {list.length > 3 && <div className="text-[0.62rem] text-taupe">+{list.length - 3} more</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <TimeGrid days={days} bookings={bookings} blocks={blocks} startHour={startHour} endHour={endHour} today={today} />
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Block out time">
          <form action={blockTimeAction} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="return" value={q(view, date)} />
            <div><label className={label}>From date</label><input type="date" name="date" className={input} defaultValue={date} required /></div>
            <div><label className={label}>To date</label><input type="date" name="endDate" className={input} defaultValue={date} /></div>
            <div><label className={label}>Start</label><input type="time" name="start" className={input} defaultValue="12:00" /></div>
            <div><label className={label}>End</label><input type="time" name="end" className={input} defaultValue="13:00" /></div>
            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="allDay" /> All day</label>
            <div className="col-span-2"><label className={label}>Reason (private)</label><input name="reason" className={input} placeholder="e.g. Training, dentist, holiday" /></div>
            <button className={`${btn.outline} col-span-2`}>Block time</button>
          </form>
        </Card>
        <Card title="Blocks in view">
          {blocks.length ? (
            <ul className="divide-y divide-sand text-sm">
              {blocks.map((bl) => (
                <li key={bl.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{fmtDateLong(bl.startsAt)} {fmtTime(bl.startsAt)} → {localDateOf(bl.endsAt) !== localDateOf(bl.startsAt) ? `${fmtDateLong(bl.endsAt)} ` : ""}{fmtTime(bl.endsAt)}{bl.reason && <span className="text-taupe"> · {bl.reason}</span>}</span>
                  <form action={deleteBlockAction}><input type="hidden" name="id" value={bl.id} /><input type="hidden" name="return" value={q(view, date)} /><button className="text-xs text-taupe hover:text-rose-700">Remove</button></form>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-taupe">No blocked time in this period.</p>}
        </Card>
      </div>
    </div>
  );
}
