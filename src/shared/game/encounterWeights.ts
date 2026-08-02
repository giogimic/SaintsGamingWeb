/**
 * Weighted wild encounter selection (map tables + catalog fallback).
 */

export type WeightedSlug = { slug: string; weight: number };

export function normalizeEncounterEntries(
  raw: unknown
): WeightedSlug[] {
  if (!raw) return [];
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.monsters)) list = obj.monsters;
    else if (Array.isArray(obj.encounters)) list = obj.encounters;
  }

  const out: WeightedSlug[] = [];
  for (const item of list) {
    if (typeof item === "string") {
      out.push({ slug: item, weight: 1 });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    const slug = String(e.slug || e.speciesSlug || e.monster || e.species || "");
    if (!slug) continue;
    let weight = 1;
    if (typeof e.weight === "number") weight = e.weight;
    else if (typeof e.encounter_rate === "number") {
      weight = Math.max(1, Math.round(e.encounter_rate * 100));
    }
    out.push({ slug, weight: Math.max(1, weight) });
  }
  return out;
}

export function pickWeightedSlug(
  entries: WeightedSlug[],
  rng: () => number = Math.random
): string | null {
  if (!entries.length) return null;
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return entries[0]?.slug || null;
  let roll = rng() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.slug;
  }
  return entries[entries.length - 1]?.slug || null;
}
