import Link from "next/link";
import { Card, Flash, PageTitle, btn } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { calculateDeposit } from "@/lib/core/deposit";
import { formatGBP } from "@/lib/core/money";
import { groupByCategory } from "@/lib/data";
import { getDb } from "@/lib/db/client";
import { listTreatments } from "@/lib/repo";

export default async function TreatmentsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("owner");
  const sp = await searchParams;
  const all = await listTreatments(await getDb());
  const toReview = all.filter((t) => t.reviewNote).length;
  return (
    <div className="mx-auto max-w-6xl">
      <Flash msg={sp.msg} error={sp.error} />
      <PageTitle title="Treatments" subtitle={`${all.length} treatments · ${toReview} with notes to confirm`} action={<Link href="/admin/treatments/new" className={btn.primary}>+ Add treatment</Link>} />
      <div className="space-y-6">
        {groupByCategory(all).map((g) => (
          <Card key={g.category} title={g.category}>
            <ul className="-my-2 divide-y divide-sand">
              {g.items.map((t) => {
                const d = calculateDeposit(t.pricePence, t);
                return (
                  <li key={t.id}>
                    <Link href={`/admin/treatments/${t.id}`} className="-mx-2 grid grid-cols-[1fr_auto] items-center gap-3 rounded px-2 py-3 transition hover:bg-cream/60">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {t.name}
                          {!t.active && <span className="rounded bg-stone-200 px-1.5 text-[0.65rem]">Hidden</span>}
                          {t.active && !t.onlineBooking && <span className="rounded bg-sky-100 px-1.5 text-[0.65rem] text-sky-900">Enquiry only</span>}
                          {t.featured && <span className="rounded bg-gold-light/60 px-1.5 text-[0.65rem]">Featured</span>}
                          {t.reviewNote && <span className="rounded bg-amber-100 px-1.5 text-[0.65rem] text-amber-900">To confirm</span>}
                        </p>
                        <p className="text-xs text-taupe">{t.durationMin} min · {d.requiresDeposit ? `${d.ruleLabel} → ${formatGBP(d.depositPence)}` : "No deposit"}</p>
                      </div>
                      <p className="font-display text-xl">{t.pricePence ? formatGBP(t.pricePence) : <span className="text-sm text-taupe">TBC</span>}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
