import { blockTimeAction, deleteBlockAction, hoursAction } from "@/app/admin/actions";
import { Card, Flash, PageTitle, btn, input, label } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { fmtDateLong, fmtTime, localDateOf } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { getOpeningHours, listTimeBlocks } from "@/lib/repo";
import { getSettings } from "@/lib/settings";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const [hours, blocks, settings] = await Promise.all([getOpeningHours(db), listTimeBlocks(db), getSettings(db)]);
  const r = settings.booking;
  const today = localDateOf(new Date());
  const owner = admin.role === "owner";
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Availability" subtitle="Working hours, breaks and booking rules decide which times customers can choose." />
      <Flash msg={sp.msg} error={sp.error} />
      <form action={hoursAction} className="space-y-6">
        <Card title="Working hours & breaks">
          <div className="space-y-3">
            {ORDER.map((d) => {
              const h = hours.find((x) => x.weekday === d)!;
              return (
                <div key={d} className="grid items-center gap-3 border-b border-sand pb-3 last:border-0 md:grid-cols-[150px_auto_1fr]">
                  <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name={`isOpen_${d}`} defaultChecked={h.isOpen} disabled={!owner} /> {DAYS[d]}</label>
                  <div className="flex items-center gap-2">
                    <input type="time" name={`open_${d}`} defaultValue={h.open} className={`${input} w-28`} disabled={!owner} />
                    <span className="text-taupe">–</span>
                    <input type="time" name={`close_${d}`} defaultValue={h.close} className={`${input} w-28`} disabled={!owner} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-taupe">Breaks:</span>
                    {[0, 1].map((i) => (
                      <span key={i} className="flex items-center gap-1">
                        <input type="time" name={`break_${d}_${i}_start`} defaultValue={h.breaks[i]?.start} className={`${input} w-24 !py-1 !text-xs`} disabled={!owner} />
                        –
                        <input type="time" name={`break_${d}_${i}_end`} defaultValue={h.breaks[i]?.end} className={`${input} w-24 !py-1 !text-xs`} disabled={!owner} />
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-amber-800">The hours shown are placeholders until BLANC confirms her real opening hours.</p>
        </Card>
        <Card title="Booking rules">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div><label className={label}>Appointment start every (min)</label><input type="number" name="slotIntervalMin" min={5} max={120} step={5} defaultValue={r.slotIntervalMin} className={input} disabled={!owner} /></div>
            <div><label className={label}>Gap between clients (min)</label><input type="number" name="bufferMin" min={0} max={120} step={5} defaultValue={r.bufferMin} className={input} disabled={!owner} /></div>
            <div><label className={label}>Minimum notice (hours)</label><input type="number" name="minNoticeHours" min={0} max={336} defaultValue={r.minNoticeHours} className={input} disabled={!owner} /></div>
            <div><label className={label}>Book up to (days ahead)</label><input type="number" name="maxAdvanceDays" min={1} max={365} defaultValue={r.maxAdvanceDays} className={input} disabled={!owner} /></div>
            <div><label className={label}>Reminder (hours before)</label><input type="number" name="reminderHoursBefore" min={1} max={168} defaultValue={r.reminderHoursBefore} className={input} disabled={!owner} /></div>
          </div>
        </Card>
        {owner && <div className="flex justify-end"><button className={btn.primary}>Save hours &amp; rules</button></div>}
      </form>

      <div id="block" className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Block out holidays & personal time">
          <form action={blockTimeAction} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="return" value="/admin/availability" />
            <div><label className={label}>From date</label><input type="date" name="date" defaultValue={today} className={input} required /></div>
            <div><label className={label}>To date</label><input type="date" name="endDate" defaultValue={today} className={input} /></div>
            <div><label className={label}>Start time</label><input type="time" name="start" defaultValue="09:00" className={input} /></div>
            <div><label className={label}>End time</label><input type="time" name="end" defaultValue="17:00" className={input} /></div>
            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="allDay" defaultChecked /> Whole day(s)</label>
            <div className="col-span-2"><label className={label}>Reason (private)</label><input name="reason" className={input} placeholder="e.g. Holiday" /></div>
            <button className={`${btn.outline} col-span-2`}>Block out</button>
          </form>
        </Card>
        <Card title="Upcoming blocks">
          {blocks.length ? (
            <ul className="divide-y divide-sand text-sm">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{fmtDateLong(b.startsAt)} {fmtTime(b.startsAt)} → {localDateOf(b.endsAt) !== localDateOf(b.startsAt) && `${fmtDateLong(b.endsAt)} `}{fmtTime(b.endsAt)}{b.reason && <span className="block text-xs text-taupe">{b.reason}</span>}</span>
                  <form action={deleteBlockAction}><input type="hidden" name="id" value={b.id} /><button className="text-xs text-taupe hover:text-rose-700">Remove</button></form>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-taupe">Nothing blocked.</p>}
        </Card>
      </div>
    </div>
  );
}
