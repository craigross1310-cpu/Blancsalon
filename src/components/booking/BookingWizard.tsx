"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatGBP } from "@/lib/core/money";

export interface WizardTreatment {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  pricePence: number;
  durationMin: number;
  depositPence: number;
  balancePence: number;
  depositLabel: string;
}

interface Slot { time: string; label: string; end: string }

const STEPS = ["Treatment", "Date & time", "Your details", "Confirm"] as const;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function duration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr${h > 1 ? "s" : ""}`;
}
function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function prettyDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
function monthLabel(month: string) {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function BookingWizard({
  treatments,
  initialSlug,
  today,
  maxAdvanceDays,
  deadlineHours,
  policies,
}: {
  treatments: WizardTreatment[];
  initialSlug?: string;
  today: string;
  maxAdvanceDays: number;
  deadlineHours: number;
  policies: React.ReactNode;
}) {
  const router = useRouter();
  const initial = treatments.find((t) => t.slug === initialSlug) ?? null;
  const [step, setStep] = useState(initial ? 1 : 0);
  const [treatment, setTreatment] = useState<WizardTreatment | null>(initial);
  const categories = useMemo(() => [...new Set(treatments.map((t) => t.category))], [treatments]);
  const [category, setCategory] = useState<string>(initial?.category ?? categories[0] ?? "");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [days, setDays] = useState<Record<string, number> | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", notes: "", company: "" });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastDate = addDays(today, maxAdvanceDays);

  useEffect(() => {
    if (!treatment) return;
    let cancelled = false;
    setDays(null);
    fetch(`/api/availability?treatment=${treatment.id}&month=${month}`)
      .then((r) => r.json())
      .then((d: { days?: { date: string; count: number }[] }) => {
        if (!cancelled) setDays(Object.fromEntries((d.days ?? []).map((x) => [x.date, x.count])));
      })
      .catch(() => !cancelled && setDays({}));
    return () => { cancelled = true; };
  }, [treatment, month]);

  useEffect(() => {
    if (!treatment || !date) return;
    let cancelled = false;
    setSlots(null);
    fetch(`/api/availability?treatment=${treatment.id}&date=${date}`)
      .then((r) => r.json())
      .then((d: { slots?: Slot[] }) => !cancelled && setSlots(d.slots ?? []))
      .catch(() => !cancelled && setSlots([]));
    return () => { cancelled = true; };
  }, [treatment, date]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const chooseTreatment = (t: WizardTreatment) => {
    setTreatment(t);
    setDate(null);
    setSlot(null);
    setSlots(null);
    setStep(1);
  };

  const detailsValid =
    form.fullName.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(form.email.trim()) && form.phone.replace(/\D/g, "").length >= 7;

  async function submit() {
    if (!treatment || !date || !slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treatmentId: treatment.id, date, time: slot.time, ...form, policyAgreed: agreed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        if (res.status === 409) {
          setSlot(null);
          setSlots(null);
          setStep(1);
          const d = date;
          setDate(null);
          setTimeout(() => setDate(d), 0);
        }
        return;
      }
      router.push(`/booking/${data.id}?t=${encodeURIComponent(data.token)}&new=1`);
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Calendar grid (Mon-first)
  const first = `${month}-01`;
  const firstWeekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const [yy, mm] = month.split("-").map(Number);
  const dim = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: dim }, (_, i) => addDays(first, i))];
  const canPrev = month > today.slice(0, 7);
  const canNext = addMonths(month, 1) <= lastDate.slice(0, 7);

  const groupedSlots = useMemo(() => {
    const g: Record<string, Slot[]> = { Morning: [], Afternoon: [], Evening: [] };
    for (const s of slots ?? []) {
      const h = Number(s.time.slice(0, 2));
      g[h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening"].push(s);
    }
    return Object.entries(g).filter(([, v]) => v.length);
  }, [slots]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-8 sm:pt-14 lg:pb-20">
      <div className="text-center">
        <p className="eyebrow text-gold-deep">Book online</p>
        <h1 className="heading mt-3 text-4xl sm:text-5xl">Request your appointment</h1>
      </div>

      {/* Stepper */}
      <ol className="mx-auto mt-10 flex max-w-2xl items-center justify-between" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && setStep(i)}
              className="flex flex-col items-center gap-2 disabled:cursor-default"
              aria-current={i === step ? "step" : undefined}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${i < step ? "border-ink bg-ink text-gold-light" : i === step ? "border-gold bg-ivory text-ink shadow-[0_0_0_4px_rgba(201,169,110,.2)]" : "border-stone text-taupe"}`}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`hidden text-[0.65rem] uppercase tracking-[0.18em] sm:block ${i === step ? "text-ink" : "text-taupe"}`}>{s}</span>
            </button>
            {i < STEPS.length - 1 && <span className={`mx-2 h-px flex-1 ${i < step ? "bg-ink" : "bg-stone"}`} />}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-center text-xs uppercase tracking-[0.2em] text-taupe sm:hidden">Step {step + 1} · {STEPS[step]}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 bg-ivory p-5 shadow-[0_1px_0_rgba(0,0,0,.04)] sm:p-8">
          {error && <div role="alert" className="mb-6 border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}

          {step === 0 && (
            <div>
              <h2 className="heading text-2xl">Choose your treatment</h2>
              <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
                {categories.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)} className={`shrink-0 border px-3.5 py-2 text-[0.66rem] uppercase tracking-[0.16em] transition ${category === c ? "border-ink bg-ink text-gold-light" : "border-sand text-charcoal hover:border-gold"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <ul className="mt-4 divide-y divide-sand">
                {treatments.filter((t) => t.category === category).map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => chooseTreatment(t)} className={`group w-full py-5 text-left transition ${treatment?.id === t.id ? "bg-gold-light/20" : ""}`}>
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-lg uppercase tracking-[0.05em] group-hover:text-gold-deep">{t.name}</span>
                        <span className="leader" aria-hidden />
                        <span className="font-display text-xl">{formatGBP(t.pricePence, { trimWhole: true })}</span>
                      </div>
                      <p className="mt-1 text-sm text-charcoal/75">{t.summary}</p>
                      <p className="mt-2 text-xs text-taupe">{duration(t.durationMin)} · {t.depositPence > 0 ? `${formatGBP(t.depositPence)} deposit` : "No deposit"}</p>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-taupe">Can&apos;t see your treatment? Some treatments are booked after a chat — <Link href="/treatments" className="underline">see the full menu</Link>.</p>
            </div>
          )}

          {step === 1 && treatment && (
            <div>
              <h2 className="heading text-2xl">Choose a date</h2>
              <div className="mt-5 flex items-center justify-between">
                <button type="button" onClick={() => setMonth(addMonths(month, -1))} disabled={!canPrev} className="flex h-10 w-10 items-center justify-center border border-sand disabled:opacity-30" aria-label="Previous month">‹</button>
                <span className="font-display text-xl">{monthLabel(month)}</span>
                <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={!canNext} className="flex h-10 w-10 items-center justify-center border border-sand disabled:opacity-30" aria-label="Next month">›</button>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.65rem] uppercase tracking-[0.12em] text-taupe">
                {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1" role="grid" aria-busy={days === null}>
                {cells.map((c, i) => {
                  if (!c) return <div key={`e${i}`} />;
                  const count = days?.[c] ?? 0;
                  const available = count > 0;
                  const selected = c === date;
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={!available}
                      onClick={() => { setDate(c); setSlot(null); }}
                      className={`relative aspect-square text-sm transition sm:text-base ${selected ? "bg-ink text-gold-light" : available ? "bg-white text-ink hover:bg-gold-light/40" : "text-stone"} ${c === today ? "font-semibold" : ""}`}
                      aria-label={`${prettyDate(c)}${available ? `, ${count} times available` : ", unavailable"}`}
                      aria-pressed={selected}
                    >
                      {Number(c.slice(8))}
                      {available && !selected && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold" />}
                    </button>
                  );
                })}
              </div>
              {days === null && <p className="mt-3 text-center text-sm text-taupe">Checking availability…</p>}
              {days && Object.values(days).every((n) => n === 0) && (
                <p className="mt-4 text-center text-sm text-taupe">No availability this month — try the next month.</p>
              )}

              {date && (
                <div className="mt-8 border-t border-sand pt-6">
                  <h3 className="heading text-xl">{prettyDate(date)}</h3>
                  {slots === null ? (
                    <p className="mt-3 text-sm text-taupe">Loading times…</p>
                  ) : slots.length === 0 ? (
                    <p className="mt-3 text-sm text-taupe">No times left on this day.</p>
                  ) : (
                    groupedSlots.map(([label, list]) => (
                      <div key={label} className="mt-5">
                        <p className="eyebrow mb-2 text-taupe">{label}</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                          {list.map((s) => (
                            <button key={s.time} type="button" onClick={() => setSlot(s)} className={`border py-3 text-sm transition ${slot?.time === s.time ? "border-ink bg-ink text-gold-light" : "border-sand bg-white hover:border-gold"}`} aria-pressed={slot?.time === s.time}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="mt-8 flex justify-between gap-3">
                <button type="button" className="btn btn-outline" onClick={() => setStep(0)}>Back</button>
                <button type="button" className="btn btn-dark" disabled={!slot} onClick={() => setStep(2)}>Continue</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); if (detailsValid) setStep(3); }} noValidate>
              <h2 className="heading text-2xl">Your details</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="fullName">Full name</label>
                  <input id="fullName" className="field" autoComplete="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" type="email" className="field" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <label className="label" htmlFor="phone">Mobile number</label>
                  <input id="phone" type="tel" className="field" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="notes">Notes <span className="normal-case tracking-normal text-stone">(optional)</span></label>
                  <textarea id="notes" rows={3} className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything we should know? Please don't include medical details here." />
                </div>
                <div className="hidden" aria-hidden>
                  <label htmlFor="company">Company</label>
                  <input id="company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
              </div>
              <div className="mt-8 flex justify-between gap-3">
                <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                <button type="submit" className="btn btn-dark" disabled={!detailsValid}>Continue</button>
              </div>
            </form>
          )}

          {step === 3 && treatment && date && slot && (
            <div>
              <h2 className="heading text-2xl">Review &amp; request</h2>
              <dl className="mt-6 divide-y divide-sand border-y border-sand text-sm">
                {[
                  ["Treatment", treatment.name],
                  ["Date", prettyDate(date)],
                  ["Time", `${slot.label} – ${slot.end}`],
                  ["Name", form.fullName],
                  ["Email", form.email],
                  ["Mobile", form.phone],
                  ...(form.notes ? [["Notes", form.notes]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-3">
                    <dt className="text-taupe">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 bg-ink p-5 text-ivory sm:p-6">
                {treatment.depositPence > 0 ? (
                  <>
                    <p className="eyebrow text-gold">Deposit required</p>
                    <p className="mt-2 font-display text-3xl">{formatGBP(treatment.depositPence)}</p>
                    <p className="mt-3 text-sm leading-relaxed text-ivory/75">
                      After you submit, you&apos;ll get our bank details and your booking reference to use as the payment reference.
                      Please pay within {deadlineHours} hours. <strong className="text-gold-light">Your appointment is confirmed once we&apos;ve checked your deposit has arrived.</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="eyebrow text-gold">No deposit required</p>
                    <p className="mt-3 text-sm leading-relaxed text-ivory/75">We&apos;ll review your request and confirm by email.</p>
                  </>
                )}
              </div>

              <details className="mt-6 border border-sand bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium">Read the booking &amp; cancellation policies</summary>
                <div className="mt-4">{policies}</div>
              </details>
              <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#9c7a43]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I have read and agree to the <Link href="/policies" target="_blank" className="underline">booking, deposit and cancellation policies</Link>.</span>
              </label>
              <div className="mt-8 flex justify-between gap-3">
                <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>Back</button>
                <button type="button" className="btn btn-gold" disabled={!agreed || submitting} onClick={submit}>
                  {submitting ? "Sending…" : "Request booking"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Summary */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 bg-ink p-6 text-ivory">
            <p className="eyebrow text-gold">Your booking</p>
            {treatment ? (
              <>
                <p className="mt-4 font-display text-2xl leading-tight">{treatment.name}</p>
                <p className="mt-1 text-sm text-ivory/60">{duration(treatment.durationMin)}</p>
                {date && <p className="mt-4 text-sm">{prettyDate(date)}{slot ? ` · ${slot.label}` : ""}</p>}
                <dl className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
                  <div className="flex justify-between"><dt className="text-ivory/60">Treatment price</dt><dd>{formatGBP(treatment.pricePence)}</dd></div>
                  <div className="flex justify-between"><dt className="text-ivory/60">Deposit to secure</dt><dd className="text-gold-light">{treatment.depositPence ? formatGBP(treatment.depositPence) : "None"}</dd></div>
                  <div className="flex justify-between"><dt className="text-ivory/60">Balance on the day</dt><dd>{formatGBP(treatment.balancePence)}</dd></div>
                </dl>
                {treatment.depositPence > 0 && <p className="mt-4 text-xs text-ivory/50">{treatment.depositLabel}</p>}
              </>
            ) : (
              <p className="mt-4 text-sm text-ivory/60">Choose a treatment to begin.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile summary bar */}
      {treatment && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-ink px-4 py-3 text-ivory lg:hidden">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div className="min-w-0">
              <p className="truncate font-display text-base">{treatment.name}</p>
              <p className="truncate text-xs text-ivory/60">{date ? `${prettyDate(date)}${slot ? ` · ${slot.label}` : ""}` : duration(treatment.durationMin)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-lg">{formatGBP(treatment.pricePence, { trimWhole: true })}</p>
              <p className="text-xs text-gold-light">{treatment.depositPence ? `${formatGBP(treatment.depositPence)} deposit` : "No deposit"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
