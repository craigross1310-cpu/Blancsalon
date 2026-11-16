import Link from "next/link";
import { Card, PageTitle } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { listNotifications } from "@/lib/repo";

const TONE: Record<string, string> = { sent: "text-emerald-800", logged: "text-sky-800", skipped: "text-taupe", failed: "text-rose-700" };

export default async function NotificationsPage() {
  const list = await listNotifications(await getDb(), { limit: 200 });
  const configured = !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Emails" subtitle="Every message sent to clients and to you — the automated replacement for Instagram DMs." />
      {!configured && (
        <p className="mb-5 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Email delivery isn&apos;t connected yet, so messages are saved here (status “logged”) instead of being sent. Add a Resend API key to send them for real.
        </p>
      )}
      <Card>
        <ul className="-my-2 divide-y divide-sand">
          {list.map((n) => (
            <li key={n.id}>
              <Link href={`/admin/notifications/${n.id}`} className="-mx-2 grid grid-cols-[1fr_auto] gap-3 rounded px-2 py-3 hover:bg-cream/60">
                <div className="min-w-0">
                  <p className="truncate text-sm">{n.subject}</p>
                  <p className="truncate text-xs text-taupe">{n.audience === "owner" ? "To you" : `To ${n.recipient}`} · {n.channel} · {n.bookingReference ?? ""}</p>
                </div>
                <div className="text-right text-xs">
                  <p className={`capitalize ${TONE[n.status]}`}>{n.status}</p>
                  <p className="text-taupe">{fmtDateTime(n.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
          {!list.length && <li className="py-6 text-center text-sm text-taupe">No emails yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
