import { buildOwnerFeed, feedTokenValid } from "@/lib/calendar";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/** Private calendar subscription for the owner (link shown in Settings → Calendar). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  if (!(await feedTokenValid(db, token.replace(/\.ics$/, "")))) return new Response("Not found", { status: 404 });
  return new Response(await buildOwnerFeed(db), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="blanc-bookings.ics"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
