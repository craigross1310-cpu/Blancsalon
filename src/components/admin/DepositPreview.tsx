"use client";
import { useState } from "react";
import { calculateDeposit } from "@/lib/core/deposit";
import { formatGBP, parsePoundsToPence } from "@/lib/core/money";

/** Deposit configuration with a live preview of deposit + remaining balance. */
export function DepositFields({ price, depositType, fixed, percent }: { price: string; depositType: "fixed" | "percentage"; fixed: string; percent: string }) {
  const [p, setP] = useState(price);
  const [type, setType] = useState(depositType);
  const [f, setF] = useState(fixed);
  const [pc, setPc] = useState(percent);
  const pricePence = parsePoundsToPence(p);
  const fixedPence = parsePoundsToPence(f || "0");
  const pct = Number(pc || "0");
  let preview: React.ReactNode = <span className="text-rose-700">Enter a valid price</span>;
  if (pricePence !== null) {
    if (type === "fixed" && fixedPence === null) preview = <span className="text-rose-700">Enter a valid deposit amount</span>;
    else if (type === "percentage" && (!Number.isFinite(pct) || pct < 0 || pct > 100)) preview = <span className="text-rose-700">Percentage must be 0–100</span>;
    else {
      const d = calculateDeposit(pricePence, { depositType: type, depositFixedPence: fixedPence ?? 0, depositPercent: pct });
      preview = (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-[0.65rem] uppercase tracking-wider text-ivory/60">Price</p><p className="font-display text-2xl">{formatGBP(d.pricePence)}</p></div>
          <div><p className="text-[0.65rem] uppercase tracking-wider text-gold">Deposit</p><p className="font-display text-2xl text-gold-light">{formatGBP(d.depositPence)}</p></div>
          <div><p className="text-[0.65rem] uppercase tracking-wider text-ivory/60">Balance</p><p className="font-display text-2xl">{formatGBP(d.balancePence)}</p></div>
          {type === "fixed" && (fixedPence ?? 0) > pricePence && <p className="col-span-3 text-xs text-amber-300">The deposit can&apos;t exceed the price — it will be capped.</p>}
          <p className="col-span-3 text-xs text-ivory/60">Customers see: “{d.requiresDeposit ? `${formatGBP(d.depositPence)} deposit to secure` : "No deposit required"}”</p>
        </div>
      );
    }
  }
  const inputCls = "w-full rounded-md border border-stone/70 bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20";
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium">Price (£)</label>
        <input name="price" inputMode="decimal" className={inputCls} value={p} onChange={(e) => setP(e.target.value)} required />
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-medium">Deposit method</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["fixed", "percentage"] as const).map((t) => (
            <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm ${type === t ? "border-ink bg-cream" : "border-stone/70"}`}>
              <input type="radio" name="depositType" value={t} checked={type === t} onChange={() => setType(t)} />
              {t === "fixed" ? "Fixed amount (£)" : "Percentage (%)"}
            </label>
          ))}
        </div>
      </fieldset>
      {type === "fixed" ? (
        <div>
          <label className="mb-1 block text-xs font-medium">Deposit amount (£) — use 0 for no deposit</label>
          <input name="depositFixed" inputMode="decimal" className={inputCls} value={f} onChange={(e) => setF(e.target.value)} />
          <input type="hidden" name="depositPercent" value={pc} />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-medium">Deposit percentage (%) — use 0 for no deposit</label>
          <input name="depositPercent" inputMode="decimal" className={inputCls} value={pc} onChange={(e) => setPc(e.target.value)} />
          <input type="hidden" name="depositFixed" value={f} />
        </div>
      )}
      <div className="rounded-md bg-ink p-4 text-ivory" aria-live="polite">{preview}</div>
      <p className="text-xs text-taupe">Changes apply to new bookings only. Existing bookings keep the price and deposit they were booked with.</p>
    </div>
  );
}
