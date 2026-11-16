import Link from "next/link";
import { Card, PageTitle, btn, input } from "@/components/admin/ui";
import { fmtDateLong } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { listCustomers } from "@/lib/repo";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const all = await listCustomers(await getDb());
  const list = q ? all.filter((c) => `${c.fullName} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase())) : all;
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Clients" subtitle="Created automatically from bookings. Inactive clients are anonymised after the retention period (Settings → Privacy)." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Search clients…" className={`${input} max-w-sm`} /><button className={btn.outline}>Search</button></form>
      <Card>
        <ul className="-my-2 divide-y divide-sand">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/bookings?status=all&q=${encodeURIComponent(c.anonymisedAt ? c.id : c.email)}`} className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-3 hover:bg-cream/60">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.fullName}</p>
                  <p className="truncate text-xs text-taupe">{c.anonymisedAt ? "Anonymised" : `${c.email} · ${c.phone}`}</p>
                </div>
                <div className="text-right text-xs text-taupe">
                  <p>{c.bookingCount} booking{c.bookingCount === 1 ? "" : "s"}</p>
                  {c.lastVisit && <p>Last: {fmtDateLong(c.lastVisit)}</p>}
                </div>
              </Link>
            </li>
          ))}
          {!list.length && <li className="py-6 text-center text-sm text-taupe">No clients found.</li>}
        </ul>
      </Card>
    </div>
  );
}
