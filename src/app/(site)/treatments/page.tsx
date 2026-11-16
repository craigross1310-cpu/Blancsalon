import Image from "next/image";
import Link from "next/link";
import { CategoryJump } from "@/components/site/CategoryJump";
import { PageHero } from "@/components/site/PageHero";
import { PlaceholderNote } from "@/components/site/PlaceholderNote";
import { Reveal } from "@/components/site/Reveal";
import { TreatmentRow } from "@/components/site/TreatmentRow";
import { categorySlug, groupByCategory, loadActiveTreatments } from "@/lib/data";

export const metadata = { title: "Treatments & prices" };

export default async function TreatmentsPage() {
  const groups = groupByCategory(await loadActiveTreatments());
  return (
    <>
      <PageHero eyebrow="Treatments & prices" script="Price list" title="The BLANC menu">
        Every treatment shows its price, time and deposit upfront. Choose yours and book online in minutes.
      </PageHero>
      <nav className="sticky top-16 z-40 border-b border-sand bg-ivory/95 backdrop-blur sm:static" aria-label="Treatment categories">
        <div className="px-4 py-3 sm:hidden">
          <CategoryJump categories={groups.map((g) => ({ label: g.category, id: categorySlug(g.category) }))} />
        </div>
        <div className="mx-auto hidden max-w-7xl flex-wrap justify-center gap-2 px-8 py-3 sm:flex">
          {groups.map((g) => (
            <a key={g.category} href={`#${categorySlug(g.category)}`} className="border border-sand px-4 py-2 text-[0.68rem] uppercase tracking-[0.18em] text-charcoal transition hover:border-gold hover:text-gold-deep">
              {g.category}
            </a>
          ))}
        </div>
      </nav>
      <main className="bg-ivory">
        <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-8">
          <PlaceholderNote>
            Prices are taken from BLANC&apos;s Instagram price lists. Some names were partly cut off in the screenshots, and durations and deposit
            amounts are demo values — the owner can edit everything in the dashboard. Items marked &ldquo;price to be confirmed&rdquo; are listed
            but not bookable online yet.
          </PlaceholderNote>
        </div>
        {groups.map((g) => {
          const img = g.items.find((i) => i.imageUrl)?.imageUrl;
          return (
            <section key={g.category} id={categorySlug(g.category)} className="scroll-mt-36 sm:scroll-mt-24 border-b border-sand last:border-0">
              <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-[300px_1fr] md:py-20">
                <Reveal>
                  <div className="md:sticky md:top-40">
                    <h2 className="heading hyphens-auto text-3xl md:text-[1.7rem] lg:text-[1.95rem]">{g.category}</h2>
                    <div className="gold-rule mt-5 w-16 !bg-gold" />
                    {img && (
                      <div className="relative mt-6 hidden aspect-square w-full overflow-hidden md:block">
                        <Image src={img} alt={g.category} fill sizes="300px" className="object-cover" />
                      </div>
                    )}
                  </div>
                </Reveal>
                <Reveal delay={100}>
                  {g.items.map((t) => <TreatmentRow key={t.id} t={t} />)}
                </Reveal>
              </div>
            </section>
          );
        })}
        <section className="bg-cream">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-8">
            <h2 className="heading text-3xl">Gift vouchers</h2>
            <p className="mx-auto mt-4 max-w-xl text-charcoal/80">
              Treat someone special. Gift vouchers are available — get in touch to buy one.
            </p>
            <Link href="/contact" className="btn btn-outline mt-6">Enquire about vouchers</Link>
          </div>
        </section>
      </main>
    </>
  );
}
