import Image from "next/image";
import Link from "next/link";
import { PlaceholderNote } from "@/components/site/PlaceholderNote";
import { Reveal } from "@/components/site/Reveal";
import { SiteHeader } from "@/components/site/SiteHeader";
import { priceLabel } from "@/components/site/TreatmentRow";
import { formatGBP } from "@/lib/core/money";
import { categorySlug, groupByCategory, loadActiveTreatments, loadSettings } from "@/lib/data";
import { instagramUrl } from "@/lib/settings";

const GALLERY = [
  { src: "/gallery/lash-1.jpg", alt: "Lifted natural lashes by BLANC" },
  { src: "/gallery/brows-1.jpg", alt: "Laminated brows by BLANC" },
  { src: "/gallery/lash-2.jpg", alt: "Lash extensions by BLANC" },
  { src: "/gallery/lash-3.jpg", alt: "Lash extensions by BLANC" },
];

const CATEGORY_LINES: Record<string, string> = {
  "Medical Microdermabrasion Facials": "Resurface · refine · brighten",
  "Let's Glow Facials": "Radiance on demand",
  "Needling Facials": "Texture · tone · renewal",
  Morpheus8: "Radiofrequency microneedling",
  "HIFU Body": "Non-surgical body contouring",
  "HIFU Face & Neck": "Lift & firm, no downtime",
  "Lashes & Brows": "Frame the face",
  Wellbeing: "Pelvic chair",
};

export default async function HomePage() {
  const [settings, treatments] = await Promise.all([loadSettings(), loadActiveTreatments()]);
  const groups = groupByCategory(treatments);
  const featured = treatments.filter((t) => t.featured && t.onlineBooking).slice(0, 6);
  const b = settings.business;

  const categoryCards = groups
    .filter((g) => CATEGORY_LINES[g.category])
    .slice(0, 6)
    .map((g) => {
      const priced = g.items.filter((i) => i.pricePence > 0);
      const from = priced.length ? Math.min(...priced.map((i) => i.pricePence)) : null;
      return { ...g, from };
    });

  return (
    <>
      <SiteHeader overlay />
      <main>
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-ink text-ivory">
          <div className="glitter animate-twinkle absolute inset-0 opacity-60" aria-hidden />
          <div className="glitter animate-twinkle absolute inset-0 opacity-30 [background-size:520px_380px] [animation-delay:2s]" aria-hidden />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.08),transparent_60%)]" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-32 text-center sm:px-8">
            <p className="eyebrow animate-rise text-gold">{b.tagline}</p>
            <div className="relative mt-8">
              <div className="animate-rise absolute inset-x-0 top-[-6%] h-px bg-gradient-to-r from-transparent via-white/70 to-transparent sm:top-[2%]" style={{ animationDelay: "200ms" }} aria-hidden />
              <h1
                className="heading chrome-text animate-shine py-4 text-[22vw] font-bold leading-none tracking-[0.06em] sm:text-[11rem] md:text-[13rem]"
                style={{ animationDuration: "9s" }}
              >
                BLANC<span className="gold-text">.</span>
              </h1>
              <div className="animate-rise absolute inset-x-0 bottom-[-4%] h-px bg-gradient-to-r from-transparent via-white/70 to-transparent sm:bottom-[4%]" style={{ animationDelay: "260ms" }} aria-hidden />
            </div>
            <p className="animate-rise mx-auto mt-10 max-w-xl text-base leading-relaxed text-ivory/75 sm:text-lg" style={{ animationDelay: "320ms" }}>
              {b.heroIntro}
            </p>
            <div className="animate-rise mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "420ms" }}>
              <Link href="/book" className="btn btn-gold w-full sm:w-auto">Book an appointment</Link>
              <Link href="/treatments" className="btn btn-outline-light w-full sm:w-auto">Treatments &amp; prices</Link>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ivory/40 sm:flex" aria-hidden>
            <span className="eyebrow !text-[0.6rem]">Scroll</span>
            <span className="h-10 w-px bg-gradient-to-b from-gold/70 to-transparent" />
          </div>
        </section>

        {/* ── Intro ──────────────────────────────────────── */}
        <section className="grain bg-cream">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-8 md:grid-cols-2 md:py-32">
            <Reveal>
              <p className="font-script text-5xl text-gold-deep sm:text-6xl">Invest in you</p>
              <h2 className="heading mt-4 text-4xl sm:text-5xl">Your skin, body &amp; wellbeing</h2>
              <p className="mt-6 max-w-md leading-relaxed text-charcoal/80">
                From express glow facials to results-driven courses of Morpheus8 and HIFU, every BLANC treatment is
                tailored to you — with advanced technology and a calm, considered experience.
              </p>
              <Link href="/about" className="btn btn-outline mt-8">Discover BLANC</Link>
            </Reveal>
            <Reveal delay={150} className="relative">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden bg-ink">
                <Image src="/gallery/lash-2.jpg" alt="Lash extensions by BLANC" fill sizes="(max-width: 768px) 90vw, 400px" className="object-cover" />
              </div>
              <div className="absolute -bottom-5 -left-2 hidden border border-gold/50 bg-ivory px-6 py-4 shadow-xl sm:block md:-left-6">
                <p className="eyebrow text-taupe">Book online</p>
                <p className="font-display text-xl">Secure your time in minutes</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Categories ─────────────────────────────────── */}
        <section className="bg-ivory">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="eyebrow text-gold-deep">The menu</p>
              <h2 className="heading mt-4 text-4xl sm:text-5xl">Treatments</h2>
              <div className="gold-rule mx-auto mt-6 w-24" />
            </Reveal>
            <div className="mt-14 grid gap-px overflow-hidden border border-sand bg-sand sm:grid-cols-2 lg:grid-cols-3">
              {categoryCards.map((c, i) => (
                <Reveal key={c.category} delay={i * 70} className="bg-ivory">
                  <Link href={`/treatments#${categorySlug(c.category)}`} className="group relative flex h-full min-h-56 flex-col justify-between p-8 transition-colors duration-500 hover:bg-ink hover:text-ivory">
                    <span className="eyebrow text-taupe transition-colors group-hover:text-gold">{CATEGORY_LINES[c.category]}</span>
                    <div>
                      <h3 className="heading text-3xl">{c.category}</h3>
                      <p className="mt-3 text-sm text-taupe group-hover:text-ivory/70">
                        {c.from !== null ? <>From <span className="font-display text-lg text-ink group-hover:text-gold-light">{formatGBP(c.from, { trimWhole: true })}</span></> : "Prices on request"}
                        <span className="ml-3 inline-block transition-transform group-hover:translate-x-1">→</span>
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured (price-list styling) ─────────────── */}
        <section className="relative overflow-hidden bg-ink text-ivory">
          <div className="glitter absolute inset-0 opacity-25" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-8 md:grid-cols-[1fr_1.4fr] md:py-32">
            <Reveal>
              <p className="font-script text-5xl text-gold-light">Price list</p>
              <h2 className="heading mt-3 text-4xl sm:text-5xl">Client favourites</h2>
              <p className="mt-6 max-w-sm leading-relaxed text-ivory/65">
                Choose your treatment, pick a time that suits you and secure it with a small deposit — no back-and-forth messages needed.
              </p>
              <Link href="/treatments" className="btn btn-outline-light mt-8">Full price list</Link>
            </Reveal>
            <Reveal delay={120}>
              <ul>
                {featured.map((t) => (
                  <li key={t.id} className="border-b border-white/10">
                    <Link href={`/book?treatment=${t.slug}`} className="group flex items-baseline py-5">
                      <span className="font-display text-lg uppercase tracking-[0.06em] transition-colors group-hover:text-gold-light sm:text-xl">{t.name}</span>
                      <span className="leader !border-white/20" aria-hidden />
                      <span className="font-display text-xl text-gold-light sm:text-2xl">{priceLabel(t)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── Why BLANC ──────────────────────────────────── */}
        <section className="bg-cream">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
            <Reveal className="text-center">
              <p className="eyebrow text-gold-deep">Why BLANC</p>
              <h2 className="heading mt-4 text-4xl sm:text-5xl">Considered, results-driven care</h2>
            </Reveal>
            <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Advanced technology", "Morpheus8 radiofrequency microneedling and HIFU for face and body — non-surgical treatments with results in mind."],
                ["Tailored courses", "Honest advice on the number of sessions you need and how far apart, so you get the most from every treatment."],
                ["Skin, body & wellbeing", "From glow facials and needling to body contouring and the pelvic chair — all under one roof."],
                ["Effortless booking", "Live availability, clear prices and deposits upfront. Your appointment is confirmed as soon as your deposit is checked."],
              ].map(([h, p], i) => (
                <Reveal key={h} delay={i * 90}>
                  <span className="font-display text-3xl text-gold">0{i + 1}</span>
                  <h3 className="heading mt-3 text-2xl">{h}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal/80">{p}</p>
                </Reveal>
              ))}
            </div>
            <PlaceholderNote className="mx-auto mt-12 max-w-2xl">
              &ldquo;Why BLANC&rdquo; copy is draft wording based on BLANC&apos;s Instagram posts — the owner should approve or rewrite it. Client
              testimonials are not shown because none were supplied; add genuine reviews (with permission) before launch.
            </PlaceholderNote>
          </div>
        </section>

        {/* ── Instagram ──────────────────────────────────── */}
        <section className="bg-ivory">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
            <Reveal className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow text-gold-deep">Follow along</p>
                <h2 className="heading mt-4 text-4xl sm:text-5xl">@{b.instagramHandle}</h2>
              </div>
              <a href={instagramUrl(b.instagramHandle)} target="_blank" rel="noreferrer" className="btn btn-outline">View Instagram</a>
            </Reveal>
            <div className="mt-12 grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
              {GALLERY.map((g, i) => (
                <Reveal key={g.src} delay={i * 80}>
                  <a href={instagramUrl(b.instagramHandle)} target="_blank" rel="noreferrer" className="group relative block aspect-square overflow-hidden bg-sand">
                    <Image src={g.src} alt={g.alt} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/25" />
                  </a>
                </Reveal>
              ))}
            </div>
            <PlaceholderNote className="mt-6">
              Images are low-resolution crops from Instagram screenshots, used for the demo only. Replace with original high-resolution photos
              (or a live Instagram feed widget) before launch.
            </PlaceholderNote>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-ink text-center text-ivory">
          <div className="glitter animate-twinkle absolute inset-0 opacity-40" aria-hidden />
          <Reveal className="relative mx-auto max-w-3xl px-4 py-24 sm:px-8">
            <p className="font-script text-5xl text-gold-light">Treat yourself</p>
            <h2 className="heading mt-4 text-4xl sm:text-6xl">Ready when you are</h2>
            <p className="mx-auto mt-6 max-w-lg text-ivory/65">See live availability and request your appointment in under two minutes.</p>
            <Link href="/book" className="btn btn-gold mt-10">Book your appointment</Link>
          </Reveal>
        </section>
      </main>
    </>
  );
}
