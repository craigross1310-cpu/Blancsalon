import { cache } from "react";
import { getDb } from "./db/client";
import { listTreatments } from "./repo";
import { getSettings } from "./settings";
import type { Treatment } from "./types";

export const loadSettings = cache(async () => getSettings(await getDb()));
export const loadActiveTreatments = cache(async () => listTreatments(await getDb(), { activeOnly: true }));

export function groupByCategory(treatments: Treatment[]): { category: string; items: Treatment[] }[] {
  const map = new Map<string, Treatment[]>();
  for (const t of treatments) {
    if (!map.has(t.category)) map.set(t.category, []);
    map.get(t.category)!.push(t);
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }));
}

export function categorySlug(c: string) {
  return c.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
