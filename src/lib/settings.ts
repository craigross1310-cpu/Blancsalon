import type { Db } from "./db/client";
import { DEFAULT_SETTINGS, type AllSettings, type SettingsKey } from "./settings-schema";

export async function getSettings(db: Db): Promise<AllSettings> {
  const rows = await db.query<{ key: string; value: unknown }>(`select key, value from settings`);
  const out = structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, Record<string, unknown>>;
  for (const r of rows) {
    if (!(r.key in out)) continue;
    const v = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
    out[r.key] = { ...out[r.key], ...(v as Record<string, unknown>) };
  }
  return out as unknown as AllSettings;
}

export async function saveSettings<K extends SettingsKey>(db: Db, key: K, value: AllSettings[K]) {
  await db.query(
    `insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

export function siteUrl(): string {
  const explicit = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
}
