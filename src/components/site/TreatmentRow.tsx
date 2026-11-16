import Link from "next/link";
import { calculateDeposit } from "@/lib/core/deposit";
import { formatGBP } from "@/lib/core/money";
import { fmtDuration } from "@/lib/core/time";
import type { Treatment } from "@/lib/types";

export function depositText(t: Treatment): string {
  const d = calculateDeposit(t.pricePence, t);
  if (!d.requiresDeposit) return "No deposit required";
  return t.depositType === "percentage"
    ? `${formatGBP(d.depositPence)} deposit (${t.depositPercent}%) to secure`
    : `${formatGBP(d.depositPence)} deposit to secure`;
}

export function priceLabel(t: Treatment): string {
  if (!t.onlineBooking && t.pricePence === 0) return t.priceNote || "Price on request";
  return formatGBP(t.pricePence, { trimWhole: true });
}

/** Price-list styled row, echoing BLANC's printed price lists. */
export function TreatmentRow({ t }: { t: Treatment }) {
  return (
    <div className="group border-b border-sand py-6 last:border-0">
      <div className="flex items-baseline">
        <h3 className="font-display text-lg uppercase tracking-[0.06em] sm:text-xl">{t.name}</h3>
        <span className="leader" aria-hidden />
        <span className="font-display text-xl text-ink sm:text-2xl">{priceLabel(t)}</span>
      </div>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/80">{t.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-taupe">
        <span>{fmtDuration(t.durationMin)}</span>
        {t.onlineBooking && <span>{depositText(t)}</span>}
        {t.priceNote && t.pricePence > 0 && <span>{t.priceNote}</span>}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer select-none text-xs uppercase tracking-[0.2em] text-gold-deep marker:text-gold">Details</summary>
        <div className="mt-3 space-y-3 leading-relaxed text-charcoal/85">
          <p>{t.description}</p>
          {t.preparationInfo && <p><strong className="font-medium">Before your appointment:</strong> {t.preparationInfo}</p>}
          {t.aftercareInfo && <p><strong className="font-medium">Aftercare:</strong> {t.aftercareInfo}</p>}
        </div>
      </details>
      <div className="mt-4">
        {t.onlineBooking ? (
          <Link href={`/book?treatment=${t.slug}`} className="btn btn-outline !px-5 !py-2.5">Book now</Link>
        ) : (
          <Link href="/contact" className="btn btn-outline !px-5 !py-2.5 opacity-80">Enquire</Link>
        )}
      </div>
    </div>
  );
}
