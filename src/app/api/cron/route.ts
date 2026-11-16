import { NextResponse, type NextRequest } from "next/server";
import { anonymiseInactiveCustomers, runScheduledJobs } from "@/lib/booking/service";
import { getDb } from "@/lib/db/client";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Scheduled maintenance: expires unpaid requests, sends reminders and applies
 * the data-retention policy. Called by Vercel Cron (see vercel.json) or any
 * external scheduler with `Authorization: Bearer $CRON_SECRET`.
 * Expiry also runs automatically whenever availability is checked.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const db = await getDb();
  const result = await runScheduledJobs(db);
  const settings = await getSettings(db);
  const anonymised = await anonymiseInactiveCustomers(db, settings.privacy.retentionMonths);
  return NextResponse.json({ ok: true, ...result, anonymised });
}
