import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTreatmentAction, saveTreatmentAction } from "@/app/admin/actions";
import { DepositFields } from "@/components/admin/DepositPreview";
import { ImageInput } from "@/components/admin/ImageInput";
import { Card, Flash, PageTitle, btn, input, label } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { penceToInput } from "@/lib/core/money";
import { getDb } from "@/lib/db/client";
import { getTreatment, listTreatments } from "@/lib/repo";

export default async function TreatmentEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("owner");
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const t = id === "new" ? null : await getTreatment(db, id);
  if (id !== "new" && !t) notFound();
  const categories = [...new Set((await listTreatments(db)).map((x) => x.category))];
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/treatments" className="text-xs text-taupe hover:text-ink">← Treatments</Link>
      <PageTitle title={t ? t.name : "New treatment"} />
      <Flash msg={sp.msg} error={sp.error} />
      {t?.reviewNote && (
        <div className="mb-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>To confirm with BLANC:</strong> {t.reviewNote}
        </div>
      )}
      <form action={saveTreatmentAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <input type="hidden" name="id" value={t?.id ?? ""} />
        <div className="space-y-6">
          <Card title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className={label}>Name</label><input name="name" className={input} defaultValue={t?.name} required /></div>
              <div>
                <label className={label}>Category</label>
                <input name="category" list="categories" className={input} defaultValue={t?.category} required />
                <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div><label className={label}>Duration (minutes)</label><input name="durationMin" type="number" min={5} max={600} step={5} className={input} defaultValue={t?.durationMin ?? 60} required /></div>
              <div className="sm:col-span-2"><label className={label}>Short summary (shown in lists)</label><input name="summary" className={input} defaultValue={t?.summary} /></div>
              <div className="sm:col-span-2"><label className={label}>Description</label><textarea name="description" rows={4} className={input} defaultValue={t?.description} /></div>
              <div className="sm:col-span-2"><label className={label}>Preparation information (optional)</label><textarea name="preparationInfo" rows={2} className={input} defaultValue={t?.preparationInfo} /></div>
              <div className="sm:col-span-2"><label className={label}>Aftercare information (optional)</label><textarea name="aftercareInfo" rows={2} className={input} defaultValue={t?.aftercareInfo} /></div>
              <div><label className={label}>Price note (optional)</label><input name="priceNote" className={input} defaultValue={t?.priceNote} placeholder="e.g. Price on request" /></div>
              <div><label className={label}>Display order</label><input name="sortOrder" type="number" className={input} defaultValue={t?.sortOrder ?? 999} /></div>
              <div className="sm:col-span-2"><label className={label}>Internal “to confirm” note (clear once confirmed)</label><textarea name="reviewNote" rows={2} className={input} defaultValue={t?.reviewNote} /></div>
            </div>
          </Card>
          <Card title="Image"><ImageInput current={t?.imageUrl ?? null} /></Card>
        </div>
        <div className="space-y-6">
          <Card title="Price & deposit">
            <DepositFields
              price={t ? penceToInput(t.pricePence) : ""}
              depositType={t?.depositType ?? "fixed"}
              fixed={t ? penceToInput(t.depositFixedPence) : "10.00"}
              percent={String(t?.depositPercent ?? 25)}
            />
          </Card>
          <Card title="Visibility">
            <div className="space-y-3 text-sm">
              <label className="flex items-start gap-2"><input type="checkbox" name="active" defaultChecked={t?.active ?? true} className="mt-1" /> <span>Show on website<span className="block text-xs text-taupe">Untick to hide (deactivate) the treatment.</span></span></label>
              <label className="flex items-start gap-2"><input type="checkbox" name="onlineBooking" defaultChecked={t?.onlineBooking ?? true} className="mt-1" /> <span>Bookable online<span className="block text-xs text-taupe">Untick for consultation / enquiry-only treatments.</span></span></label>
              <label className="flex items-start gap-2"><input type="checkbox" name="featured" defaultChecked={t?.featured ?? false} className="mt-1" /> <span>Feature on home page</span></label>
            </div>
          </Card>
          <button className={`${btn.primary} w-full`}>Save treatment</button>
        </div>
      </form>
      {t && (
        <form action={deleteTreatmentAction} className="mt-10 border-t border-sand pt-6">
          <input type="hidden" name="id" value={t.id} />
          <button className={btn.danger}>Remove treatment</button>
          <p className="mt-2 text-xs text-taupe">Treatments with bookings are deactivated rather than deleted, so your records stay intact.</p>
        </form>
      )}
    </div>
  );
}
