import { BookingWizard, type WizardTreatment } from "@/components/booking/BookingWizard";
import { SetupNotice } from "@/components/site/SetupNotice";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PolicyList } from "@/components/site/PolicyList";
import { calculateDeposit } from "@/lib/core/deposit";
import { localDateOf } from "@/lib/core/time";
import { loadActiveTreatments, loadSettings } from "@/lib/data";

export const metadata = { title: "Book an appointment" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ treatment?: string }> }) {
  const { treatment } = await searchParams;
  const [settings, all] = await Promise.all([loadSettings(), loadActiveTreatments()]);
  const treatments: WizardTreatment[] = all
    .filter((t) => t.onlineBooking)
    .map((t) => {
      const d = calculateDeposit(t.pricePence, t);
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        category: t.category,
        summary: t.summary,
        pricePence: t.pricePence,
        durationMin: t.durationMin,
        depositPence: d.depositPence,
        balancePence: d.balancePence,
        depositLabel: d.ruleLabel,
      };
    });
  return (
    <>
      <SiteHeader />
      <main className="min-h-dvh bg-cream pt-16 sm:pt-20">
        <div className="px-4 pt-6 empty:hidden"><SetupNotice /></div>
        <BookingWizard
          treatments={treatments}
          initialSlug={treatment}
          today={localDateOf(new Date())}
          maxAdvanceDays={settings.booking.maxAdvanceDays}
          deadlineHours={settings.payment.deadlineHours}
          policies={<PolicyList policies={settings.policies} compact />}
        />
      </main>
    </>
  );
}
