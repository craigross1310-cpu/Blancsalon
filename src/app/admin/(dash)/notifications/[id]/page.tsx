import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { getNotification } from "@/lib/repo";

export default async function NotificationView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await getNotification(await getDb(), id);
  if (!n) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/notifications" className="text-xs text-taupe hover:text-ink">← Emails</Link>
      <h1 className="mt-2 font-display text-2xl">{n.subject}</h1>
      <p className="mt-1 text-sm text-taupe">
        To {n.recipient} ({n.audience}) · {fmtDateTime(n.createdAt)} · <span className="capitalize">{n.status}</span>
        {n.error && <> · {n.error}</>}
        {n.bookingId && <> · <Link href={`/admin/bookings/${n.bookingId}`} className="underline">{n.bookingReference}</Link></>}
      </p>
      <Card className="mt-5 overflow-hidden !p-0">
        {n.bodyHtml ? (
          <iframe srcDoc={n.bodyHtml} title="Email preview" sandbox="" className="h-[900px] w-full border-0" />
        ) : (
          <pre className="whitespace-pre-wrap p-5 text-sm">{n.bodyText || "(content removed by data retention)"}</pre>
        )}
      </Card>
    </div>
  );
}
