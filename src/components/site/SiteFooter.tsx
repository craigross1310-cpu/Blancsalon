import Image from "next/image";
import Link from "next/link";
import { loadSettings } from "@/lib/data";
import { instagramUrl } from "@/lib/settings";
import { isPlaceholder } from "@/lib/settings-schema";

export async function SiteFooter() {
  const s = await loadSettings();
  const b = s.business;
  const address = [b.addressLine1, b.addressLine2, b.town, b.postcode].filter(Boolean);
  return (
    <footer className="relative overflow-hidden bg-ink text-ivory/70">
      <div className="glitter absolute inset-0 opacity-20" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Image src="/brand/blanc-logo-instagram.jpg" alt="BLANC. logo" width={150} height={171} className="mb-5 w-32 rounded-sm" />
          <p className="eyebrow text-gold/80">{b.tagline}</p>
        </div>
        <div>
          <h3 className="eyebrow mb-4 text-gold-light">Visit</h3>
          {address.length ? (
            <address className="not-italic leading-7">{address.map((l) => <div key={l}>{l}</div>)}</address>
          ) : (
            <p className="text-sm italic text-ivory/40">[Address to be supplied]</p>
          )}
        </div>
        <div>
          <h3 className="eyebrow mb-4 text-gold-light">Contact</h3>
          <ul className="space-y-2 text-sm">
            {b.phone && !isPlaceholder(b.phone) ? <li><a href={`tel:${b.phone.replace(/\s/g, "")}`} className="hover:text-gold-light">{b.phone}</a></li> : <li className="italic text-ivory/40">[Phone to be supplied]</li>}
            {b.email && !isPlaceholder(b.email) ? <li><a href={`mailto:${b.email}`} className="hover:text-gold-light">{b.email}</a></li> : <li className="italic text-ivory/40">[Email to be supplied]</li>}
            <li><a href={instagramUrl(b.instagramHandle)} target="_blank" rel="noreferrer" className="hover:text-gold-light">Instagram @{b.instagramHandle}</a></li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-4 text-gold-light">Explore</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/treatments" className="hover:text-gold-light">Treatments &amp; prices</Link></li>
            <li><Link href="/book" className="hover:text-gold-light">Book online</Link></li>
            <li><Link href="/policies" className="hover:text-gold-light">Booking policies</Link></li>
            <li><Link href="/privacy" className="hover:text-gold-light">Privacy notice</Link></li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-ivory/40 sm:flex-row sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} {b.name}. All rights reserved.</span>
          <Link href="/admin" className="hover:text-gold-light">Owner login</Link>
        </div>
      </div>
    </footer>
  );
}
