import { manualBookingAction } from "@/app/admin/actions";
import { Card, Flash, PageTitle, btn, input, label } from "@/components/admin/ui";
import { formatGBP } from "@/lib/core/money";
import { localDateOf } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { listTreatments } from "@/lib/repo";
import { PAYMENT_METHOD_LABEL } from "@/lib/status";

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ date?: string; time?: string; error?: string }> }) {
  const sp = await searchParams;
  const treatments = (await listTreatments(await getDb())).filter((t) => t.active);
  const today = localDateOf(new Date());
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Add a booking" subtitle="For appointments arranged by Instagram DM, phone or in person. The diary still prevents double bookings." />
      <Flash error={sp.error} />
      <form action={manualBookingAction}>
        <Card title="Appointment">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Treatment</label>
              <select name="treatmentId" className={input} required>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>{t.category} — {t.name} ({t.pricePence ? formatGBP(t.pricePence) : "price TBC"}, {t.durationMin} min)</option>
                ))}
              </select>
            </div>
            <div><label className={label}>Date</label><input type="date" name="date" className={input} defaultValue={sp.date || today} required /></div>
            <div><label className={label}>Start time</label><input type="time" name="time" step={300} className={input} defaultValue={sp.time || "10:00"} required /></div>
            <div><label className={label}>Custom price (£, optional)</label><input name="price" inputMode="decimal" className={input} placeholder="Leave blank for menu price" /></div>
            <div>
              <label className={label}>Status</label>
              <select name="status" className={input} defaultValue="confirmed">
                <option value="confirmed">Confirmed</option>
                <option value="pending_payment">Pending — awaiting deposit</option>
              </select>
            </div>
          </div>
        </Card>
        <Card title="Client" className="mt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={label}>Full name</label><input name="fullName" className={input} required /></div>
            <div><label className={label}>Email</label><input type="email" name="email" className={input} /></div>
            <div><label className={label}>Mobile</label><input type="tel" name="phone" className={input} /></div>
            <div className="sm:col-span-2"><label className={label}>Internal notes</label><textarea name="internalNotes" rows={2} className={input} placeholder="e.g. Booked via Instagram DM" /></div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="notify" defaultChecked /> Email the client their booking details (if an email is given)</label>
          </div>
        </Card>
        <Card title="Deposit" className="mt-5">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="depositPaid" /> Deposit already received (records the treatment&apos;s deposit amount)</label>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div><label className={label}>Received on</label><input type="date" name="receivedOn" className={input} defaultValue={today} /></div>
            <div>
              <label className={label}>Method</label>
              <select name="method" className={input}>{Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
          </div>
        </Card>
        <div className="mt-6 flex justify-end"><button className={btn.primary}>Add to diary</button></div>
      </form>
    </div>
  );
}
