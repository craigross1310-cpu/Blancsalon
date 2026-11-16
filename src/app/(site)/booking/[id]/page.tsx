import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelRequestForm } from "@/components/booking/CancelRequestForm";
import { CopyButton } from "@/components/booking/CopyButton";
import { PlaceholderNote } from "@/components/site/PlaceholderNote";
import { PolicyList } from "@/components/site/PolicyList";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatGBP } from "@/lib/core/money";
import { fmtDateLong, fmtDateTime, fmtDuration, fmtTime } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { bankDetailsRows } from "@/lib/notify/templates";
import { getBooking } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { isPlaceholder } from "@/lib/settings-schema";

export const metadata = { title: "Your booking", robots: { index: false } };

const STATUS_COPY: Record<string, { title: string; body: string; tone: string }> = {
  pending_payment: { title: "Request received — deposit needed", body: "Your time is being held while you pay your deposit. Your appointment is not confirmed until the salon has checked your deposit and approved your booking.", tone: "border-amber-300 bg-amber-50" },
  pending_approval: { title: "Request received", body: "No deposit is needed. The salon will review your request and confirm by email.", tone: "border-sky-300 bg-sky-50" },
  confirmed: { title: "Your appointment is confirmed", body: "We look forward to seeing you.", tone: "border-emerald-300 bg-emerald-50" },
  completed: { title: "Thank you for visiting BLANC", body: "We hope you loved your treatment.", tone: "border-stone bg-cream" },
  cancelled: { title: "This appointment was cancelled", body: "You're welcome to book another time.", tone: "border-rose-300 bg-rose-50" },
  declined: { title: "We couldn't accept this request", body: "You're welcome to choose another time.", tone: "border-rose-300 bg-rose-50" },
  expired: { title: "This request has expired", body: "The deposit wasn't recorded before the deadline, so the time was released. If you've already paid, please contact the salon with your reference.", tone: "border-zinc-300 bg-zinc-50" },
  no_show: { title: "Missed appointment", body: "Please contact the salon.", tone: "border-orange-300 bg-orange-50" },
};

export default async function BookingStatusPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; new?: string }> }) {
  const { id } = await params;
  const { t, new: isNew } = await searchParams;
  const db = await getDb();
  const b = await getBooking(db, id);
  if (!b || !t || b.accessToken !== t) notFound();
  const s = await getSettings(db);
  const copy = STATUS_COPY[b.status];
  const bank = bankDetailsRows(s, b.reference);
  const showBank = b.status === "pending_payment" && b.depositDuePence > 0;
  const bankIsPlaceholder = isPlaceholder(s.payment.accountName) || s.payment.accountNumber === "00000000";

  return (
    <>
      <SiteHeader />
      <main className="min-h-dvh bg-cream px-4 pb-20 pt-24 sm:pt-32">
        <div className="mx-auto max-w-2xl">
          {isNew && <p className="font-script text-center text-5xl text-gold-deep">Thank you</p>}
          <div className={`mt-4 border-l-4 px-5 py-4 ${copy.tone}`} role="status">
            <h1 className="heading text-2xl sm:text-3xl">{copy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-charcoal/85">{copy.body}</p>
          </div>

          <div className="mt-8 bg-ink p-6 text-center text-ivory sm:p-8">
            <p className="eyebrow text-gold">Booking reference</p>
            <p className="mt-3 flex items-center justify-center font-display text-4xl tracking-[0.12em] sm:text-5xl">
              {b.reference}
            </p>
            {showBank && <p className="mt-3 text-sm text-ivory/60">Use this as your payment reference</p>}
          </div>

          {showBank && (
            <section className="mt-8 bg-ivory p-6 sm:p-8">
              <p className="eyebrow text-gold-deep">Step 1 — pay your deposit</p>
              <h2 className="heading mt-2 text-3xl">{formatGBP(b.depositDuePence)} by bank transfer</h2>
              <dl className="mt-6 divide-y divide-sand border-y border-sand">
                {bank.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-xs uppercase tracking-[0.16em] text-taupe">{k}</dt>
                    <dd className="flex items-center text-right font-medium">{v}<CopyButton value={v} label={k} /></dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <dt className="text-xs uppercase tracking-[0.16em] text-taupe">Amount</dt>
                  <dd className="flex items-center font-medium">{formatGBP(b.depositDuePence)}<CopyButton value={(b.depositDuePence / 100).toFixed(2)} label="amount" /></dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-charcoal/80">{s.payment.referenceInstructions}</p>
              {b.paymentDueAt && (
                <p className="mt-4 border border-gold/50 bg-gold-light/20 px-4 py-3 text-sm">
                  <strong>Please pay by {fmtDateTime(b.paymentDueAt)}.</strong> If your deposit hasn&apos;t been received by then, the time is released for other clients.
                </p>
              )}
              {bankIsPlaceholder && <PlaceholderNote className="mt-4">Bank details shown are placeholders — the owner adds real details in Admin → Settings → Payments.</PlaceholderNote>}
              <p className="eyebrow mt-8 text-gold-deep">Step 2 — we confirm</p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">Once the salon has checked your deposit has arrived, you&apos;ll receive a confirmation email. We&apos;ve also emailed these details to {b.customerEmail}.</p>
            </section>
          )}

          <section className="mt-8 bg-ivory p-6 sm:p-8">
            <h2 className="heading text-2xl">Appointment</h2>
            <dl className="mt-5 space-y-3 text-sm">
              {[
                ["Treatment", b.treatmentName],
                ["Date", fmtDateLong(b.startsAt)],
                ["Time", `${fmtTime(b.startsAt)} – ${fmtTime(b.endsAt)} (${fmtDuration(b.durationMin)})`],
                ["Name", b.customerName],
                ["Treatment price", formatGBP(b.treatmentPricePence)],
                ["Deposit", b.depositDuePence ? formatGBP(b.depositDuePence) : "Not required"],
                ["Recorded as paid", formatGBP(b.paidPence)],
                ["Balance due", formatGBP(["cancelled", "declined", "expired"].includes(b.status) ? 0 : b.outstandingPence)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 border-b border-sand pb-3 last:border-0">
                  <dt className="text-taupe">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {b.status === "confirmed" && (
              <a href={`/api/bookings/${b.id}/ics?t=${encodeURIComponent(t)}`} className="btn btn-outline mt-6">Add to calendar</a>
            )}
          </section>

          {["pending_payment", "pending_approval", "confirmed"].includes(b.status) && (
            <section className="mt-8 bg-ivory p-6 sm:p-8">
              {b.cancellationRequestedAt ? (
                <p className="text-sm text-charcoal/80">You asked to cancel or change this appointment on {fmtDateLong(b.cancellationRequestedAt)}. The salon will be in touch.</p>
              ) : (
                <CancelRequestForm id={b.id} token={t} />
              )}
            </section>
          )}

          <details className="mt-8 bg-ivory p-6 sm:p-8">
            <summary className="cursor-pointer font-display text-xl">Booking policies</summary>
            <div className="mt-5"><PolicyList policies={s.policies} compact /></div>
          </details>

          <p className="mt-10 text-center text-sm text-taupe">
            Keep this page&apos;s link — it&apos;s private to you. <Link href="/" className="underline">Back to BLANC</Link>
          </p>
        </div>
      </main>
    </>
  );
}
