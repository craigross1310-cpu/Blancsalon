import Link from "next/link";
import { anonymiseNowAction, changePasswordAction, saveSettingsAction } from "@/app/admin/actions";
import { Card, Flash, PageTitle, btn, input, label } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb, isDemoMode } from "@/lib/db/client";
import { getSettings } from "@/lib/settings";
import type { AllSettings } from "@/lib/settings-schema";

type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "checkbox" | "email"; hint?: string };

const SECTIONS: { key: keyof AllSettings | "account"; title: string; fields?: Field[]; intro?: string }[] = [
  {
    key: "business",
    title: "Business",
    fields: [
      { key: "name", label: "Business name" },
      { key: "tagline", label: "Tagline" },
      { key: "ownerName", label: "Owner / therapist name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Public email", type: "email" },
      { key: "instagramHandle", label: "Instagram handle (without @)" },
      { key: "addressLine1", label: "Address line 1" },
      { key: "addressLine2", label: "Address line 2" },
      { key: "town", label: "Town / city" },
      { key: "postcode", label: "Postcode" },
      { key: "mapEmbedUrl", label: "Google Maps embed URL", hint: "Google Maps → Share → Embed a map → copy the src link." },
      { key: "heroIntro", label: "Home page introduction", type: "textarea" },
      { key: "aboutHeading", label: "About page heading" },
      { key: "aboutBody", label: "About page story", type: "textarea" },
      { key: "qualifications", label: "Qualifications & experience", type: "textarea" },
      { key: "showPlaceholderNotices", label: "Show “to confirm” notices on the website (turn off before launch)", type: "checkbox" },
    ],
  },
  {
    key: "payment",
    title: "Bank transfer",
    intro: "Shown to clients after they request a booking. Only ticked items are published. Never enter online-banking passwords here — the system doesn't need, store or use bank logins.",
    fields: [
      { key: "accountName", label: "Account holder name" },
      { key: "showAccountName", label: "Publish account holder name", type: "checkbox" },
      { key: "bankName", label: "Bank name (optional)" },
      { key: "showBankName", label: "Publish bank name", type: "checkbox" },
      { key: "sortCode", label: "Sort code" },
      { key: "showSortCode", label: "Publish sort code", type: "checkbox" },
      { key: "accountNumber", label: "Account number" },
      { key: "showAccountNumber", label: "Publish account number", type: "checkbox" },
      { key: "referenceInstructions", label: "Payment reference instructions", type: "textarea", hint: "The booking reference (e.g. BLC-7KQ4MZ) is always shown as the payment reference." },
      { key: "deadlineHours", label: "Deposit deadline (hours after request)", type: "number", hint: "Unpaid requests are released automatically after this. Never later than the appointment itself." },
    ],
  },
  {
    key: "policies",
    title: "Policies",
    intro: "Clients must tick to agree to these before requesting a booking. The version agreed is stored with each booking. Replace every [PLACEHOLDER] with BLANC's own wording.",
    fields: [
      { key: "deposit", label: "Deposit policy", type: "textarea" },
      { key: "cancellation", label: "Cancellation policy", type: "textarea" },
      { key: "rescheduling", label: "Rescheduling policy", type: "textarea" },
      { key: "lateArrival", label: "Late arrivals", type: "textarea" },
      { key: "noShow", label: "No-shows", type: "textarea" },
      { key: "refund", label: "Refund conditions", type: "textarea" },
      { key: "unpaidExpiry", label: "Unpaid booking expiry", type: "textarea" },
    ],
  },
  {
    key: "notifications",
    title: "Emails",
    fields: [
      { key: "ownerEmail", label: "Send owner notifications to", type: "email" },
      { key: "fromName", label: "Sender name" },
      { key: "replyTo", label: "Reply-to address", type: "email" },
      { key: "customerEmails", label: "Email clients (request received, deposit details, confirmations, changes)", type: "checkbox" },
      { key: "reminders", label: "Send appointment reminders", type: "checkbox" },
      { key: "ownerNewBooking", label: "Notify me of new booking requests / pending deposits", type: "checkbox" },
      { key: "ownerConfirmation", label: "Notify me when a booking is confirmed", type: "checkbox" },
      { key: "ownerCancellationRequest", label: "Notify me of cancellation requests", type: "checkbox" },
    ],
  },
  {
    key: "privacy",
    title: "Privacy",
    intro: "UK GDPR: personal details are only kept as long as needed. Clients with no appointment in this period are anonymised automatically (names, contact details and notes removed; amounts kept for your accounts).",
    fields: [{ key: "retentionMonths", label: "Anonymise inactive clients after (months)", type: "number" }],
  },
  { key: "account", title: "Account" },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; msg?: string; error?: string }> }) {
  const admin = await requireAdmin("owner");
  const sp = await searchParams;
  const settings = await getSettings(await getDb());
  const current = SECTIONS.find((s) => s.key === sp.tab) ?? SECTIONS[0];
  const values = current.key !== "account" ? (settings[current.key] as unknown as Record<string, unknown>) : {};
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Settings" />
      <div className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
        {SECTIONS.map((s) => (
          <Link key={s.key} href={`/admin/settings?tab=${s.key}`} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs ${s.key === current.key ? "bg-ink text-gold-light" : "border border-stone bg-white"}`}>{s.title}</Link>
        ))}
      </div>
      <Flash msg={sp.msg} error={sp.error} />
      {current.fields && (
        <form action={saveSettingsAction}>
          <input type="hidden" name="section" value={current.key} />
          <Card title={current.title}>
            {current.intro && <p className="mb-5 rounded bg-cream px-3 py-2 text-sm text-charcoal/80">{current.intro}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {current.fields.map((f) => {
                const v = values[f.key];
                const ph = typeof v === "string" && v.includes("[PLACEHOLDER");
                if (f.type === "checkbox")
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" name={f.key} defaultChecked={Boolean(v)} /> {f.label}
                    </label>
                  );
                return (
                  <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label className={label}>{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea name={f.key} rows={3} className={`${input} ${ph ? "!border-amber-400 !bg-amber-50" : ""}`} defaultValue={String(v ?? "")} />
                    ) : (
                      <input name={f.key} type={f.type ?? "text"} className={`${input} ${ph ? "!border-amber-400 !bg-amber-50" : ""}`} defaultValue={String(v ?? "")} />
                    )}
                    {f.hint && <p className="mt-1 text-xs text-taupe">{f.hint}</p>}
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="mt-5 flex justify-end"><button className={btn.primary}>Save {current.title.toLowerCase()}</button></div>
        </form>
      )}
      {current.key === "privacy" && (
        <Card title="Run now" className="mt-6">
          <form action={anonymiseNowAction} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-taupe">This also runs automatically each day.</p>
            <button className={btn.outline}>Anonymise inactive clients now</button>
          </form>
        </Card>
      )}
      {current.key === "account" && (
        <Card title={`Signed in as ${admin.email}`}>
          {isDemoMode() && <p className="mb-4 text-sm text-taupe">Demo mode: the demo password resets whenever the demo database is recreated.</p>}
          <form action={changePasswordAction} className="grid max-w-md gap-4">
            <div><label className={label}>Current password</label><input type="password" name="current" className={input} required autoComplete="current-password" /></div>
            <div><label className={label}>New password (10+ characters)</label><input type="password" name="next" className={input} required minLength={10} autoComplete="new-password" /></div>
            <button className={btn.primary}>Change password</button>
          </form>
        </Card>
      )}
    </div>
  );
}
