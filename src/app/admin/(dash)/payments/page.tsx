import Link from "next/link";
import { Card, PageTitle, Stat, btn, input, label } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { formatGBP } from "@/lib/core/money";
import { addDaysToDate, fmtDateLong, fmtDateTime, localDateOf } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { listBookings, listPayments } from "@/lib/repo";
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/status";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const today = localDateOf(new Date());
  const from = sp.from || `${today.slice(0, 7)}-01`;
  const to = sp.to || today;
  const db = await getDb();
  const [payments, pending, owing] = await Promise.all([
    listPayments(db, { from, to }),
    listBookings(db, { statuses: ["pending_payment"] }),
    listBookings(db, { statuses: ["confirmed", "completed", "no_show"] }).then((l) => l.filter((b) => b.outstandingPence > 0)),
  ]);
  const sum = (kind?: string) => payments.filter((p) => !kind || p.kind === kind).reduce((a, p) => a + (p.kind === "refund" && !kind ? -p.amountPence : p.amountPence), 0);
  const deposits = sum("deposit");
  const balances = sum("balance") + sum("other");
  const refunds = sum("refund");
  const net = deposits + balances - refunds;

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Payments" subtitle="Payments you have recorded after checking your bank or till. Pending deposits are kept separate until you record them." />
      <form className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-sand bg-white p-4">
        <div><label className={label}>From</label><input type="date" name="from" defaultValue={from} className={input} /></div>
        <div><label className={label}>To</label><input type="date" name="to" defaultValue={to} className={input} /></div>
        <button className={btn.outline}>Apply</button>
        <Link className="text-xs underline" href={`/admin/payments?from=${addDaysToDate(today, -365)}&to=${today}`}>Last 12 months</Link>
        {admin.role === "owner" && (
          <div className="ml-auto flex flex-wrap gap-2">
            <a href={`/api/admin/export?type=payments&from=${from}&to=${to}`} className={btn.primary}>Export payments CSV</a>
            <a href={`/api/admin/export?type=bookings&from=${from}&to=${to}`} className={btn.outline}>Export bookings CSV</a>
          </div>
        )}
      </form>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Deposits recorded" value={formatGBP(deposits)} hint={`${fmtDateLong(from)} – ${fmtDateLong(to)}`} tone="good" />
        <Stat label="Balances & other" value={formatGBP(balances)} tone="good" />
        <Stat label="Refunds" value={formatGBP(refunds)} />
        <Stat label="Net recorded revenue" value={formatGBP(net)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`Pending deposits (${pending.length}) — not received yet`} className="border-amber-200">
          {pending.length ? (
            <ul className="divide-y divide-sand text-sm">
              {pending.map((b) => (
                <li key={b.id}><Link href={`/admin/bookings/${b.id}`} className="flex justify-between gap-3 py-2.5 hover:underline">
                  <span>{b.customerName}<span className="block text-xs text-taupe">ref {b.reference}{b.paymentDueAt && ` · due ${fmtDateTime(b.paymentDueAt)}`}</span></span>
                  <span className="font-medium text-amber-800">{formatGBP(b.depositDuePence)}</span>
                </Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-taupe">No deposits pending.</p>}
        </Card>
        <Card title={`Outstanding balances (${owing.length})`}>
          <div id="outstanding" />
          {owing.length ? (
            <ul className="divide-y divide-sand text-sm">
              {owing.map((b) => (
                <li key={b.id}><Link href={`/admin/bookings/${b.id}`} className="flex justify-between gap-3 py-2.5 hover:underline">
                  <span>{b.customerName}<span className="block text-xs text-taupe">{b.treatmentName} · {fmtDateLong(b.startsAt)}</span></span>
                  <span className="font-medium">{formatGBP(b.outstandingPence)}</span>
                </Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-taupe">Nothing outstanding.</p>}
          <p className="mt-3 text-right text-sm">Total: <strong>{formatGBP(owing.reduce((a, b) => a + b.outstandingPence, 0))}</strong></p>
        </Card>
      </div>

      <Card title="Recorded payments" className="mt-6">
        {payments.length ? (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-taupe">
                <tr><th className="px-4 py-2 font-normal sm:px-0">Date</th><th className="font-normal">Client</th><th className="font-normal">Ref</th><th className="font-normal">Type</th><th className="font-normal">Method</th><th className="pr-4 text-right font-normal sm:pr-0">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 sm:px-0">{p.receivedOn}</td>
                    <td><Link href={`/admin/bookings/${p.bookingId}`} className="hover:underline">{p.customerName}</Link><span className="block text-xs text-taupe">{p.treatmentName}</span></td>
                    <td className="font-mono text-xs">{p.bookingReference}</td>
                    <td>{PAYMENT_KIND_LABEL[p.kind]}</td>
                    <td>{PAYMENT_METHOD_LABEL[p.method]}</td>
                    <td className={`pr-4 text-right font-medium sm:pr-0 ${p.kind === "refund" ? "text-rose-800" : ""}`}>{p.kind === "refund" ? "−" : ""}{formatGBP(p.amountPence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-taupe">No payments recorded in this period.</p>}
        <p className="mt-4 text-xs text-taupe">All amounts were recorded manually by the salon. They are not independently verified by this software.</p>
      </Card>
    </div>
  );
}
