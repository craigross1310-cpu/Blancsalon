import Link from "next/link";
import { BookingTable } from "@/components/admin/BookingTable";
import { Card, Flash, PageTitle, Stat, btn } from "@/components/admin/ui";
import { formatGBP } from "@/lib/core/money";
import { addDaysToDate, fmtDateLong, fmtDateTime, localDateOf, localToUtc } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { listBookings } from "@/lib/repo";

export default async function Overview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const db = await getDb();
  const now = new Date();
  const today = localDateOf(now);
  const dayStart = localToUtc(today, "00:00");
  const dayEnd = localToUtc(addDaysToDate(today, 1), "00:00");
  const weekEnd = localToUtc(addDaysToDate(today, 8), "00:00");

  const [todays, pending, upcoming, cancelReq] = await Promise.all([
    listBookings(db, { from: dayStart, to: dayEnd, statuses: ["confirmed", "completed", "no_show", "pending_payment", "pending_approval"] }),
    listBookings(db, { statuses: ["pending_payment", "pending_approval"] }),
    listBookings(db, { from: dayEnd, to: weekEnd, statuses: ["confirmed"] }),
    listBookings(db, { statuses: ["confirmed", "pending_payment", "pending_approval"], from: now }).then((l) => l.filter((b) => b.cancellationRequestedAt)),
  ]);
  const [totals] = await db.query<Record<string, number>>(`
    select
      (select count(*) from bookings where status = 'confirmed' and starts_at >= now())::int as confirmed_upcoming,
      (select count(*) from bookings where status in ('cancelled','declined'))::int as cancelled,
      (select count(*) from bookings where status = 'pending_payment')::int as pending_deposits,
      (select coalesce(sum(deposit_due_pence),0) from bookings where status = 'pending_payment')::int as pending_deposit_value,
      (select coalesce(sum(amount_pence),0) from payments where kind = 'deposit')::int as deposits_recorded,
      (select coalesce(sum(case when kind='refund' then -amount_pence else amount_pence end),0) from payments)::int as revenue_recorded,
      (select coalesce(sum(greatest(b.treatment_price_pence - coalesce((select sum(case when p.kind='refund' then -p.amount_pence else p.amount_pence end) from payments p where p.booking_id=b.id),0),0)),0)
         from bookings b where b.status in ('confirmed','completed'))::int as outstanding
  `);
  const t = (k: string) => Number(totals[k] ?? 0);

  return (
    <div className="mx-auto max-w-6xl">
      {denied && <Flash error="That area is for the salon owner account only." />}
      <PageTitle
        title="Good day"
        subtitle={fmtDateLong(now)}
        action={
          <div className="flex gap-2">
            <Link href="/admin/bookings/new" className={btn.primary}>+ Add booking</Link>
            <Link href="/admin/availability#block" className={btn.outline}>Block time</Link>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Requests to review" value={pending.length} hint={`${t("pending_deposits")} awaiting deposit`} href="/admin/bookings?status=pending" tone={pending.length ? "warn" : "default"} />
        <Stat label="Pending deposits" value={formatGBP(t("pending_deposit_value"))} hint="Not yet recorded as received" href="/admin/payments" tone="warn" />
        <Stat label="Confirmed upcoming" value={t("confirmed_upcoming")} hint={`${upcoming.length} in the next 7 days`} href="/admin/calendar?view=week" tone="good" />
        <Stat label="Cancelled / declined" value={t("cancelled")} href="/admin/bookings?status=cancelled" />
        <Stat label="Deposits recorded" value={formatGBP(t("deposits_recorded"))} hint="Manually confirmed by you" href="/admin/payments" />
        <Stat label="Total recorded payments" value={formatGBP(t("revenue_recorded"))} hint="Deposits + balances − refunds" href="/admin/payments" />
        <Stat label="Outstanding balances" value={formatGBP(t("outstanding"))} hint="Confirmed & completed bookings" href="/admin/payments#outstanding" />
        <Stat label="Today" value={todays.length} hint={todays.length === 1 ? "appointment" : "appointments"} href={`/admin/calendar?view=day&date=${today}`} />
      </div>

      {cancelReq.length > 0 && (
        <Card title="Cancellation requests" className="mt-6 border-rose-200">
          <BookingTable bookings={cancelReq} />
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Needs your attention" action={<Link href="/admin/bookings?status=pending" className="text-xs underline">All</Link>}>
          {pending.length ? (
            <ul className="divide-y divide-sand">
              {pending.map((b) => (
                <li key={b.id} className="py-3">
                  <Link href={`/admin/bookings/${b.id}`} className="block rounded transition hover:bg-cream/60">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{b.customerName}</span>
                      <span className="font-mono text-xs text-taupe">{b.reference}</span>
                    </div>
                    <p className="text-sm text-charcoal/80">{b.treatmentName} · {fmtDateTime(b.startsAt)}</p>
                    <p className="mt-1 text-xs">
                      {b.status === "pending_payment" ? (
                        <span className="text-amber-800">
                          Check bank for {formatGBP(b.depositDuePence)} ref <strong>{b.reference}</strong>
                          {b.paymentDueAt && <> · due {fmtDateTime(b.paymentDueAt)}</>}
                        </span>
                      ) : (
                        <span className="text-sky-800">No deposit needed — approve or decline</span>
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-taupe">All caught up ✨</p>
          )}
        </Card>
        <Card title="Today" action={<Link href={`/admin/calendar?view=day&date=${today}`} className="text-xs underline">Day view</Link>}>
          <BookingTable bookings={todays} empty="No appointments today." />
        </Card>
      </div>
      <Card title="Next 7 days" className="mt-6" action={<Link href="/admin/calendar?view=week" className="text-xs underline">Week view</Link>}>
        <BookingTable bookings={upcoming} empty="Nothing confirmed for the next 7 days yet." />
      </Card>
    </div>
  );
}
