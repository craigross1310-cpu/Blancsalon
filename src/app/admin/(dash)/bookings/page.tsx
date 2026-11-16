import Link from "next/link";
import { BookingTable } from "@/components/admin/BookingTable";
import { Card, Flash, PageTitle, btn, input } from "@/components/admin/ui";
import { getDb } from "@/lib/db/client";
import { listBookings } from "@/lib/repo";
import type { BookingStatus } from "@/lib/types";

const FILTERS: { key: string; label: string; statuses?: BookingStatus[]; upcoming?: boolean }[] = [
  { key: "pending", label: "Needs action", statuses: ["pending_payment", "pending_approval"] },
  { key: "upcoming", label: "Upcoming confirmed", statuses: ["confirmed"], upcoming: true },
  { key: "confirmed", label: "All confirmed", statuses: ["confirmed"] },
  { key: "completed", label: "Completed", statuses: ["completed", "no_show"] },
  { key: "cancelled", label: "Cancelled / declined", statuses: ["cancelled", "declined"] },
  { key: "expired", label: "Expired", statuses: ["expired"] },
  { key: "all", label: "All" },
];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const f = FILTERS.find((x) => x.key === sp.status) ?? FILTERS[0];
  const db = await getDb();
  const bookings = await listBookings(db, {
    statuses: f.statuses,
    from: f.upcoming ? new Date() : undefined,
    search: sp.q || undefined,
    order: f.key === "completed" || f.key === "cancelled" || f.key === "expired" || f.key === "all" ? "desc" : "asc",
    limit: 300,
  });
  return (
    <div className="mx-auto max-w-6xl">
      <Flash msg={sp.msg} error={sp.error} />
      <PageTitle title="Bookings" subtitle="Every booking request, appointment and outcome." action={<Link href="/admin/bookings/new" className={btn.primary}>+ Add booking</Link>} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {FILTERS.map((x) => (
            <Link key={x.key} href={`/admin/bookings?status=${x.key}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs transition ${x.key === f.key ? "bg-ink text-gold-light" : "border border-stone bg-white hover:border-ink"}`}>
              {x.label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={f.key} />
          <input name="q" defaultValue={sp.q} placeholder="Search name, email, phone, reference…" className={`${input} lg:w-72`} />
          <button className={btn.outline}>Search</button>
        </form>
      </div>
      <Card>
        <BookingTable bookings={bookings} empty="No bookings match." />
      </Card>
    </div>
  );
}
