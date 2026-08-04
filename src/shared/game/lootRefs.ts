/**
 * Data-driven loot references (bible 17).
 * Entities store refs — never embed full item definitions in map JSON.
 */

export type LootRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type LootDropEntry = {
  /** ItemTemplate.slug / catalog id */
  itemId: string;
  /** 0–100 when used as chance; weight when used in weighted pools */
  chance?: number;
  weight?: number;
  min: number;
  max: number;
  rarity?: LootRarity;
  conditions?: string[];
};

export type LootPoolRef = {
  strategy: "pool";
  poolId: string;
};

export type LootOverrideRef = {
  strategy: "override";
  drops: LootDropEntry[];
};

export type LootRef = LootPoolRef | LootOverrideRef;

export type DropGroupKind =
  | "guaranteed"
  | "equipment"
  | "rare"
  | "event"
  | "quest";

export type DropGroupDef = {
  id: string;
  kind: DropGroupKind;
  /** 0–100 trigger chance for the group */
  triggerChance: number;
  rollCount: number;
  entries: LootDropEntry[];
  conditions?: string[];
  priority?: number;
  /** If true, success of this group suppresses lower-priority exclusive groups. */
  exclusive?: boolean;
};

export type LootPoolDef = {
  id: string;
  name: string;
  description?: string;
  rollsPerDrop: number;
  entries: LootDropEntry[];
  guaranteedDrops?: LootDropEntry[];
  minLevel?: number;
  maxLevel?: number;
  requiredTags?: string[];
};

export type SimulatedDrop = {
  itemId: string;
  qty: number;
  source: "guaranteed" | "weighted" | "override" | "group";
};

export function isLootPoolRef(ref: LootRef): ref is LootPoolRef {
  return ref.strategy === "pool";
}

export function isLootOverrideRef(ref: LootRef): ref is LootOverrideRef {
  return ref.strategy === "override";
}

export function parseLootRef(raw: unknown): LootRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.strategy === "pool" && typeof o.poolId === "string" && o.poolId.length > 0) {
    return { strategy: "pool", poolId: o.poolId };
  }
  if (o.strategy === "override" && Array.isArray(o.drops)) {
    const drops = o.drops
      .map((d) => normalizeDropEntry(d))
      .filter((d): d is LootDropEntry => d !== null);
    return { strategy: "override", drops };
  }
  return null;
}

export function normalizeDropEntry(raw: unknown): LootDropEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const itemId = typeof o.itemId === "string" ? o.itemId : typeof o.itemSlug === "string" ? o.itemSlug : null;
  if (!itemId) return null;
  const min = Number(o.min ?? o.minQty ?? 1);
  const max = Number(o.max ?? o.maxQty ?? min);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) return null;
  return {
    itemId,
    min,
    max,
    chance: o.chance !== undefined ? Number(o.chance) : undefined,
    weight: o.weight !== undefined ? Number(o.weight) : undefined,
    rarity: o.rarity as LootRarity | undefined,
    conditions: Array.isArray(o.conditions) ? (o.conditions as string[]) : undefined,
  };
}

function qtyInRange(min: number, max: number, rng: () => number): number {
  if (min === max) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

function pickWeighted(entries: LootDropEntry[], rng: () => number): LootDropEntry | null {
  const weighted = entries.filter((e) => (e.weight ?? 0) > 0);
  if (weighted.length === 0) return null;
  const total = weighted.reduce((s, e) => s + (e.weight ?? 0), 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const e of weighted) {
    roll -= e.weight ?? 0;
    if (roll <= 0) return e;
  }
  return weighted[weighted.length - 1] ?? null;
}

/** Simulate a pool roll for Studio preview (not server authority). */
export function simulateLootPool(
  pool: LootPoolDef,
  opts?: { rng?: () => number; rolls?: number }
): SimulatedDrop[] {
  const rng = opts?.rng ?? Math.random;
  const rolls = opts?.rolls ?? pool.rollsPerDrop ?? 1;
  const out: SimulatedDrop[] = [];

  for (const g of pool.guaranteedDrops ?? []) {
    out.push({
      itemId: g.itemId,
      qty: qtyInRange(g.min, g.max, rng),
      source: "guaranteed",
    });
  }

  for (let i = 0; i < rolls; i++) {
    const picked = pickWeighted(pool.entries, rng);
    if (!picked) continue;
    out.push({
      itemId: picked.itemId,
      qty: qtyInRange(picked.min, picked.max, rng),
      source: "weighted",
    });
  }

  return out;
}

/** Simulate local override drops (chance 0–100). */
export function simulateLootOverride(
  drops: LootDropEntry[],
  rng: () => number = Math.random
): SimulatedDrop[] {
  const out: SimulatedDrop[] = [];
  for (const d of drops) {
    const chance = d.chance ?? 100;
    if (rng() * 100 < chance) {
      out.push({
        itemId: d.itemId,
        qty: qtyInRange(d.min, d.max, rng),
        source: "override",
      });
    }
  }
  return out;
}

/** Aggregate many simulations for Studio statistics. */
export function aggregateDropStats(
  samples: SimulatedDrop[][]
): Record<string, { count: number; totalQty: number; rate: number }> {
  const n = samples.length || 1;
  const acc: Record<string, { count: number; totalQty: number }> = {};
  for (const sample of samples) {
    const seen = new Set<string>();
    for (const d of sample) {
      if (!acc[d.itemId]) acc[d.itemId] = { count: 0, totalQty: 0 };
      acc[d.itemId].totalQty += d.qty;
      if (!seen.has(d.itemId)) {
        acc[d.itemId].count += 1;
        seen.add(d.itemId);
      }
    }
  }
  const out: Record<string, { count: number; totalQty: number; rate: number }> = {};
  for (const [id, v] of Object.entries(acc)) {
    out[id] = { ...v, rate: v.count / n };
  }
  return out;
}

export function validateLootRef(ref: LootRef): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (ref.strategy === "pool") {
    if (!ref.poolId.trim()) errors.push("poolId is required");
  } else {
    if (!ref.drops.length) errors.push("override drops must not be empty");
    for (const d of ref.drops) {
      if (!d.itemId) errors.push("drop missing itemId");
      if (d.min > d.max) errors.push(`${d.itemId}: min > max`);
    }
  }
  return { valid: errors.length === 0, errors };
}
