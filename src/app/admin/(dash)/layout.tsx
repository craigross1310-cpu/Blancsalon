import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { Wordmark } from "@/components/site/Wordmark";
import { requireAdmin } from "@/lib/auth/session";
import { runScheduledJobs } from "@/lib/booking/service";
import { getDb, isDemoMode, usesEmbeddedDb } from "@/lib/db/client";
import { SetupNotice } from "@/components/site/SetupNotice";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const db = await getDb();
  // Belt-and-braces: keep expiry + reminders current even if the cron is delayed.
  await runScheduledJobs(db);
  const [{ n }] = await db.query<{ n: number }>(
    `select count(*)::int as n from bookings where status in ('pending_payment','pending_approval') or (cancellation_requested_at is not null and status = 'confirmed')`
  );
  return (
    <div className="min-h-dvh bg-[#f7f4ef] lg:flex">
      <aside className="bg-ink text-ivory lg:fixed lg:inset-y-0 lg:w-60 lg:overflow-y-auto">
        <div className="flex items-center justify-between px-4 pb-3 pt-4 lg:block lg:px-5 lg:pb-8 lg:pt-7">
          <Link href="/admin" className="block">
            <Wordmark tone="chrome" className="text-2xl" />
            <span className="mt-1 block text-[0.6rem] uppercase tracking-[0.3em] text-gold/80">Salon dashboard</span>
          </Link>
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/" className="text-xs text-ivory/60">Site ↗</Link>
            <form action={logoutAction}><button className="text-xs text-ivory/60">Sign out</button></form>
          </div>
        </div>
        <div className="px-4 pb-3 lg:px-3">
          <AdminNav pending={Number(n)} />
        </div>
        <div className="hidden px-5 pb-6 pt-8 text-xs text-ivory/50 lg:block">
          <p className="truncate">{admin.name || admin.email}</p>
          <p className="capitalize text-ivory/30">{admin.role}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/" className="hover:text-gold-light">View site ↗</Link>
            <form action={logoutAction}><button className="hover:text-gold-light">Sign out</button></form>
          </div>
          {isDemoMode() && <p className="mt-6 rounded border border-gold/30 p-2 text-[0.65rem] leading-relaxed text-gold-light/80">Demo mode: sample data{usesEmbeddedDb() ? " in a temporary built-in database" : ""}. Emails are captured in “Emails”{process.env.RESEND_API_KEY ? "" : ", not sent"}.</p>}
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-60 lg:px-10 lg:py-10">
        <SetupNotice />
        {children}
      </main>
    </div>
  );
}
