import { PageHero } from "@/components/site/PageHero";
import { PlaceholderNote } from "@/components/site/PlaceholderNote";
import { loadSettings } from "@/lib/data";

export const metadata = { title: "Privacy notice" };

export default async function PrivacyPage() {
  const s = await loadSettings();
  const b = s.business;
  return (
    <>
      <PageHero eyebrow="Privacy" title="Privacy notice" />
      <main className="bg-ivory">
        <article className="mx-auto max-w-3xl space-y-6 px-4 py-16 leading-relaxed text-charcoal/85 sm:px-8">
          <PlaceholderNote>
            Draft privacy notice for the demo. BLANC should review it (and complete the bracketed details) before launch — it is not legal advice.
          </PlaceholderNote>
          <h2 className="heading text-2xl text-ink">Who we are</h2>
          <p>{b.name} is the data controller for personal information collected through this website. Contact: {b.email || "[email to be supplied]"}.</p>
          <h2 className="heading text-2xl text-ink">What we collect and why</h2>
          <p>When you book we collect your name, email address, mobile number, the treatment and time you choose and any notes you add. We use this to manage your appointment, contact you about it and keep accurate business and accounting records. Our lawful bases are performance of a contract (your booking) and legal obligation (bookkeeping).</p>
          <p>Please don&apos;t include medical information in the booking notes — we&apos;ll discuss anything relevant with you directly, for example at a consultation.</p>
          <h2 className="heading text-2xl text-ink">Payments</h2>
          <p>Deposits are paid by bank transfer directly to the salon. This website does not collect or store card or bank login details.</p>
          <h2 className="heading text-2xl text-ink">Who we share it with</h2>
          <p>Our website host, database provider and email delivery provider process data on our behalf to run the booking system. We don&apos;t sell your data or use it for marketing without your consent.</p>
          <h2 className="heading text-2xl text-ink">How long we keep it</h2>
          <p>Contact details are anonymised automatically when you haven&apos;t had an appointment for {s.privacy.retentionMonths} months. Booking and payment amounts are kept for as long as required for accounting.</p>
          <h2 className="heading text-2xl text-ink">Your rights</h2>
          <p>You can ask for a copy of your data, ask us to correct or delete it, or object to how we use it, by contacting us. You can also complain to the Information Commissioner&apos;s Office (ico.org.uk).</p>
        </article>
      </main>
    </>
  );
}
