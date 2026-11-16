import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { PlaceholderNote } from "@/components/site/PlaceholderNote";
import { Reveal } from "@/components/site/Reveal";
import { loadSettings } from "@/lib/data";
import { isPlaceholder } from "@/lib/settings-schema";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const s = await loadSettings();
  const b = s.business;
  return (
    <>
      <PageHero eyebrow="About" script="Welcome" title={b.aboutHeading} />
      <main className="bg-ivory">
        <section className="mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:px-8 md:grid-cols-2 md:py-28">
          <Reveal>
            <div className="relative aspect-square w-full overflow-hidden bg-ink">
              <Image src="/gallery/brows-1.jpg" alt="Brows by BLANC" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
            </div>
            <PlaceholderNote className="mt-4">Replace with a photo of the owner and the treatment room.</PlaceholderNote>
          </Reveal>
          <Reveal delay={120}>
            <p className="eyebrow text-gold-deep">{b.tagline}</p>
            <h2 className="heading mt-4 text-4xl">The story</h2>
            {isPlaceholder(b.aboutBody) ? (
              <PlaceholderNote className="mt-6">{b.aboutBody.replace(/^\[PLACEHOLDER — |\]$/g, "")}</PlaceholderNote>
            ) : (
              <div className="mt-6 space-y-4 whitespace-pre-line leading-relaxed text-charcoal/85">{b.aboutBody}</div>
            )}
            <h2 className="heading mt-12 text-3xl">Qualifications &amp; experience</h2>
            {isPlaceholder(b.qualifications) ? (
              <PlaceholderNote className="mt-6">{b.qualifications.replace(/^\[PLACEHOLDER — |\]$/g, "")}</PlaceholderNote>
            ) : (
              <div className="mt-6 whitespace-pre-line leading-relaxed text-charcoal/85">{b.qualifications}</div>
            )}
            <h2 className="heading mt-12 text-3xl">What we offer</h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 text-sm text-charcoal/85">
              {["Medical microdermabrasion", "Glow facials", "Microneedling", "Dermaplaning", "Skin boosters", "Morpheus8", "HIFU face & body", "Pelvic chair", "Lashes & brows"].map((x) => (
                <li key={x} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gold" />{x}</li>
              ))}
            </ul>
            <Link href="/book" className="btn btn-dark mt-10">Book an appointment</Link>
          </Reveal>
        </section>
        <section className="grid grid-cols-2 md:grid-cols-4">
          {["lash-1", "brows-1", "lash-2", "lash-3"].map((g) => (
            <div key={g} className="relative aspect-square">
              <Image src={`/gallery/${g}.jpg`} alt="Treatment result by BLANC" fill sizes="25vw" className="object-cover" />
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
