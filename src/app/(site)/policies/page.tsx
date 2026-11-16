import { PageHero } from "@/components/site/PageHero";
import { PlaceholderNote } from "@/components/site/PlaceholderNote";
import { PolicyList } from "@/components/site/PolicyList";
import { loadSettings } from "@/lib/data";

export const metadata = { title: "Booking policies" };

export default async function PoliciesPage() {
  const s = await loadSettings();
  return (
    <>
      <PageHero eyebrow="Booking policies" title="Before you book" />
      <main className="bg-ivory">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
          <PlaceholderNote>BLANC&apos;s actual policies have not been supplied. Wording in gold italics is a placeholder for the owner to replace.</PlaceholderNote>
          <PolicyList policies={s.policies} />
        </div>
      </main>
    </>
  );
}
