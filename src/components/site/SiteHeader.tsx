"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";

const NAV = [
  { href: "/treatments", label: "Treatments" },
  { href: "/about", label: "About" },
  { href: "/policies", label: "Policies" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const dark = overlay && !scrolled && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        dark ? "bg-transparent text-ivory" : "bg-ink/95 text-ivory backdrop-blur-md shadow-[0_1px_0_rgba(201,169,110,.25)]"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
        <Link href="/" className="text-2xl sm:text-[1.7rem]" aria-label="BLANC home">
          <Wordmark tone="chrome" />
        </Link>
        <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`eyebrow !text-[0.66rem] transition-colors hover:text-gold-light ${pathname.startsWith(n.href) ? "text-gold-light" : "text-ivory/80"}`}
            >
              {n.label}
            </Link>
          ))}
          <Link href="/book" className="btn btn-gold !py-3 !px-5">Book now</Link>
        </nav>
        <button
          className="flex h-11 w-11 items-center justify-center md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span className="relative block h-3 w-6">
            <span className={`absolute left-0 h-px w-6 bg-current transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-px w-6 bg-current transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>
      {open && (
        <nav className="border-t border-gold/20 bg-ink px-4 pb-8 pt-4 md:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="block border-b border-white/5 py-4 font-display text-2xl text-ivory">
              {n.label}
            </Link>
          ))}
          <Link href="/book" className="btn btn-gold mt-6 w-full">Book an appointment</Link>
        </nav>
      )}
    </header>
  );
}
