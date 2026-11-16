import type { PolicySettings } from "@/lib/settings-schema";

export const POLICY_FIELDS: { key: keyof Omit<PolicySettings, "version">; title: string }[] = [
  { key: "deposit", title: "Deposits" },
  { key: "cancellation", title: "Cancellations" },
  { key: "rescheduling", title: "Rescheduling" },
  { key: "lateArrival", title: "Late arrivals" },
  { key: "noShow", title: "No-shows" },
  { key: "refund", title: "Refunds" },
  { key: "unpaidExpiry", title: "Unpaid booking requests" },
];

export function PolicyList({ policies, compact = false }: { policies: PolicySettings; compact?: boolean }) {
  return (
    <dl className={compact ? "space-y-3 text-sm" : "divide-y divide-sand"}>
      {POLICY_FIELDS.map((f) => (
        <div key={f.key} className={compact ? "" : "py-7"}>
          <dt className={compact ? "font-medium" : "heading text-2xl"}>{f.title}</dt>
          <dd className={`${compact ? "mt-0.5 text-charcoal/80" : "mt-3 leading-relaxed text-charcoal/85"} whitespace-pre-line ${/\[PLACEHOLDER/.test(policies[f.key]) ? "italic text-gold-deep" : ""}`}>
            {policies[f.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
