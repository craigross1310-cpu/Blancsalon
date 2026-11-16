import Link from "next/link";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_STYLE, PAYMENT_STATUS_LABEL } from "@/lib/status";
import type { BookingStatus, PaymentStatus } from "@/lib/types";

export function StatusChip({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ring-1 ring-inset ${BOOKING_STATUS_STYLE[status].chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${BOOKING_STATUS_STYLE[status].dot}`} />
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentChip({ status }: { status: PaymentStatus }) {
  const tone =
    status === "awaiting_deposit"
      ? "bg-amber-50 text-amber-900 ring-amber-300"
      : status === "deposit_received" || status === "paid_in_full"
        ? "bg-emerald-50 text-emerald-900 ring-emerald-300"
        : status === "refunded"
          ? "bg-rose-50 text-rose-900 ring-rose-300"
          : "bg-stone-100 text-stone-700 ring-stone-300";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] ring-1 ring-inset ${tone}`}>{PAYMENT_STATUS_LABEL[status]}</span>;
}

export function Card({ title, action, children, className = "" }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-sand bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-sand px-4 py-3 sm:px-5">
          <h2 className="font-display text-lg">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-taupe">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Flash({ msg, error }: { msg?: string; error?: string }) {
  if (!msg && !error) return null;
  return (
    <div role={error ? "alert" : "status"} className={`mb-5 rounded-md border px-4 py-3 text-sm ${error ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
      {error ?? msg}
    </div>
  );
}

export function Stat({ label, value, hint, href, tone = "default" }: { label: string; value: React.ReactNode; hint?: string; href?: string; tone?: "default" | "warn" | "good" }) {
  const inner = (
    <>
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-taupe">{label}</p>
      <p className={`mt-2 font-display text-3xl ${tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-800" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-taupe">{hint}</p>}
    </>
  );
  const cls = "block rounded-lg border border-sand bg-white p-4 transition hover:border-gold sm:p-5";
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm text-gold-light transition hover:bg-charcoal disabled:opacity-40",
  gold: "inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-gold-light",
  outline: "inline-flex items-center justify-center gap-2 rounded-md border border-stone bg-white px-4 py-2.5 text-sm text-ink transition hover:border-ink",
  danger: "inline-flex items-center justify-center gap-2 rounded-md border border-rose-300 bg-white px-4 py-2.5 text-sm text-rose-800 transition hover:bg-rose-50",
  small: "inline-flex items-center justify-center rounded border border-stone bg-white px-2.5 py-1 text-xs transition hover:border-ink",
};

export const input = "w-full rounded-md border border-stone/70 bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20";
export const label = "mb-1 block text-xs font-medium text-charcoal";
