"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: "◈" },
  { href: "/admin/calendar", label: "Calendar", icon: "▦" },
  { href: "/admin/bookings", label: "Bookings", icon: "☰" },
  { href: "/admin/payments", label: "Payments", icon: "£" },
  { href: "/admin/treatments", label: "Treatments", icon: "✦" },
  { href: "/admin/availability", label: "Availability", icon: "◷" },
  { href: "/admin/customers", label: "Clients", icon: "☺" },
  { href: "/admin/notifications", label: "Emails", icon: "✉" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export function AdminNav({ pending }: { pending: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <>
      {/* Desktop */}
      <nav className="hidden space-y-0.5 lg:block" aria-label="Dashboard">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${active(i.href) ? "bg-white/10 text-gold-light" : "text-ivory/70 hover:bg-white/5 hover:text-ivory"}`}>
            <span className="w-4 text-center text-gold/80" aria-hidden>{i.icon}</span>
            {i.label}
            {i.href === "/admin/bookings" && pending > 0 && (
              <span className="ml-auto rounded-full bg-gold px-2 text-[0.7rem] font-semibold text-ink">{pending}</span>
            )}
          </Link>
        ))}
      </nav>
      {/* Mobile */}
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden" aria-label="Dashboard">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs transition ${active(i.href) ? "bg-gold text-ink" : "bg-white/10 text-ivory/80"}`}>
            {i.label}
            {i.href === "/admin/bookings" && pending > 0 && <span className="rounded-full bg-ink px-1.5 text-[0.65rem] text-gold-light">{pending}</span>}
          </Link>
        ))}
      </nav>
    </>
  );
}
