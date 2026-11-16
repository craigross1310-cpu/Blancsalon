import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { PlaceholderNote } from "@/components/site/PlaceholderNote";
import { loadSettings } from "@/lib/data";
import { instagramUrl } from "@/lib/settings";
import { isPlaceholder } from "@/lib/settings-schema";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const s = await loadSettings();
  const b = s.business;
  const address = [b.addressLine1, b.addressLine2, b.town, b.postcode].filter(Boolean);
  const Item = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="border-b border-sand py-6">
      <p className="eyebrow text-taupe">{label}</p>
      <div className="mt-2 font-display text-xl">{children}</div>
    </div>
  );
  return (
    <>
      <PageHero eyebrow="Contact" script="Say hello" title="Get in touch">
        The quickest way to book is online — you&apos;ll see live availability and get your deposit details straight away.
      </PageHero>
      <main className="bg-ivory">
        <section className="mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:px-8 md:grid-cols-2">
          <div>
            <Item label="Book">
              <Link href="/book" className="underline decoration-gold underline-offset-4 hover:text-gold-deep">Book online →</Link>
            </Item>
            <Item label="Instagram">
              <a href={instagramUrl(b.instagramHandle)} target="_blank" rel="noreferrer" className="hover:text-gold-deep">@{b.instagramHandle}</a>
            </Item>
            <Item label="Phone">{b.phone && !isPlaceholder(b.phone) ? <a href={`tel:${b.phone.replace(/\s/g, "")}`}>{b.phone}</a> : <span className="text-base italic text-taupe">[To be supplied]</span>}</Item>
            <Item label="Email">{b.email && !isPlaceholder(b.email) ? <a href={`mailto:${b.email}`}>{b.email}</a> : <span className="text-base italic text-taupe">[To be supplied]</span>}</Item>
            <Item label="Address">
              {address.length ? <address className="not-italic">{address.map((l) => <div key={l}>{l}</div>)}</address> : <span className="text-base italic text-taupe">[To be supplied]</span>}
            </Item>
            <div className="py-6">
              <p className="eyebrow text-taupe">Questions about a treatment?</p>
              <p className="mt-2 leading-relaxed text-charcoal/80">
                Send a message on Instagram with your question and the treatment you&apos;re interested in. Booking requests are best made online so your time can be held for you.
              </p>
            </div>
          </div>
          <div>
            {b.mapEmbedUrl ? (
              <iframe src={b.mapEmbedUrl} title="Map showing BLANC Salon" className="aspect-square w-full border-0 grayscale" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              <div className="grain flex aspect-square w-full flex-col items-center justify-center gap-3 bg-cream text-center">
                <span className="font-display text-2xl">Map</span>
                <span className="max-w-xs text-sm text-taupe">A Google Maps embed appears here once the salon address is added in the dashboard.</span>
              </div>
            )}
            <PlaceholderNote className="mt-4">Opening hours, address, phone and email are not shown on Instagram — add them in Admin → Settings.</PlaceholderNote>
          </div>
        </section>
      </main>
    </>
  );
}
