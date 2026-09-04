"use server";

import { prisma } from "@/web/lib/prisma";
import {
  type CrossReference,
  type DefinitionRef,
  type DefinitionType,
  type ReferenceReport,
  crossRef,
} from "@/shared/game/definitionRegistry";

// ─── JSON slug extraction helpers ────────────────────────────────────

/** Try to parse a JSON string, return null on failure. */
function tryParseJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Extract slug-like strings from a parsed JSON value.
 * Recursively walks objects/arrays looking for string values
 * that match common slug patterns (lowercase, underscores, hyphens).
 */
function extractSlugsFromJson(data: any): string[] {
  const slugs: string[] = [];
  const slugPattern = /^[a-z][a-z0-9_-]{1,63}$/;

  function walk(val: any) {
    if (typeof val === "string" && slugPattern.test(val)) {
      slugs.push(val);
    } else if (Array.isArray(val)) {
      val.forEach(walk);
    } else if (val && typeof val === "object") {
      for (const v of Object.values(val)) {
        walk(v);
      }
    }
  }

  walk(data);
  return [...new Set(slugs)];
}

/**
 * Extract specifically-keyed references from JSON data.
 * Looks for keys like `itemId`, `sourceId`, `questId`, `mapId`, `lootPoolId`, etc.
 */
function extractKeyedRefs(
  data: any,
  keyMap: Record<string, DefinitionType>
): { type: DefinitionType; slug: string }[] {
  const refs: { type: DefinitionType; slug: string }[] = [];

  function walk(val: any) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      for (const [key, value] of Object.entries(val)) {
        if (typeof value === "string" && value.trim() && keyMap[key]) {
          refs.push({ type: keyMap[key], slug: value.trim() });
        }
      }
      for (const v of Object.values(val)) {
        if (typeof v === "object") walk(v);
      }
    } else if (Array.isArray(val)) {
      val.forEach(walk);
    }
  }

  walk(data);
  return refs;
}

/** Common JSON key → DefinitionType mappings. */
const COMMON_KEY_MAP: Record<string, DefinitionType> = {
  itemId: "item",
  itemSlug: "item",
  sourceId: "quest", // generic — could be quest, shop, drop
  questId: "quest",
  questSlug: "quest",
  mapId: "map",
  mapSlug: "map",
  creatureId: "creature",
  creatureSlug: "creature",
  npcId: "npc",
  npcSlug: "npc",
  lootPoolId: "loot",
  lootTableId: "loot",
  abilityId: "ability",
  abilitySlug: "ability",
  recipeId: "recipe",
  recipeSlug: "recipe",
  professionId: "profession",
  mountId: "mount",
  mountSlug: "mount",
  dungeonId: "dungeon",
  dungeonSlug: "dungeon",
  shopId: "shop",
  shopSlug: "shop",
  spriteAssetId: "item", // asset refs treated as items for now
};

// ─── Graph Builders ──────────────────────────────────────────────────

async function scanDungeonRefs(): Promise<CrossReference[]> {
  const refs: CrossReference[] = [];
  const dungeons = await prisma.dungeonTemplate.findMany({
    include: { mapReferences: true }
  });

  for (const d of dungeons) {
    if (d.mapReferences && Array.isArray(d.mapReferences)) {
      for (const mapRef of d.mapReferences) {
        if (mapRef.mapSlug) {
          refs.push(crossRef("dungeon", d.slug, "map", mapRef.mapSlug, "contains", "mapReferences"));
        }
      }
    }

    // rewardLootPoolId is a direct slug reference
    if (d.rewardLootPoolId) {
      refs.push(crossRef("dungeon", d.slug, "loot", d.rewardLootPoolId, "rewards", "rewardLootPoolId"));
    }
  }

  return refs;
}

async function scanShopRefs(): Promise<CrossReference[]> {
  const refs: CrossReference[] = [];
  const shops = await prisma.shopTemplate.findMany({
    include: { inventory: true }
  });

  for (const s of shops) {
    if (s.inventory && Array.isArray(s.inventory)) {
      for (const inv of s.inventory) {
        if (inv.itemSlug) {
          refs.push(crossRef("shop", s.slug, "item", inv.itemSlug, "sells", "itemsSoldData"));
        }
      }
    }
  }

  return refs;
}

async function scanMountRefs(): Promise<CrossReference[]> {
  const refs: CrossReference[] = [];
  const mounts = await prisma.mountTemplate.findMany();

  for (const m of mounts) {
    // acquisitionData may reference a quest, shop, or other source
    const acq = tryParseJson(m.acquisitionData);
    if (acq) {
      const keyedRefs = extractKeyedRefs(acq, COMMON_KEY_MAP);
      for (const r of keyedRefs) {
        refs.push(crossRef("mount", m.slug, r.type, r.slug, "acquired_from", "acquisitionData"));
      }
    }

    // restrictionsData may reference quests
    const restr = tryParseJson(m.restrictionsData);
    if (restr) {
      if (restr.requiredQuest && typeof restr.requiredQuest === "string") {
        refs.push(crossRef("mount", m.slug, "quest", restr.requiredQuest, "requires", "restrictionsData.requiredQuest"));
      }
    }
  }

  return refs;
}

async function scanWorldEventRefs(): Promise<CrossReference[]> {
  const refs: CrossReference[] = [];
  const events = await prisma.worldEventTemplate.findMany();

  for (const e of events) {
    const mutations = tryParseJson(e.mutationsData);
    if (mutations) {
      const keyedRefs = extractKeyedRefs(mutations, COMMON_KEY_MAP);
      for (const r of keyedRefs) {
        refs.push(crossRef("worldevent", e.slug, r.type, r.slug, "mutates", "mutationsData"));
      }
    }
  }

  return refs;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Build the complete cross-reference graph by scanning all definition tables.
 * Returns a flat list of directed edges.
 */
export async function buildReferenceGraph(): Promise<CrossReference[]> {
  const [dungeonRefs, shopRefs, mountRefs, eventRefs] = await Promise.all([
    scanDungeonRefs(),
    scanShopRefs(),
    scanMountRefs(),
    scanWorldEventRefs(),
  ]);

  return [...dungeonRefs, ...shopRefs, ...mountRefs, ...eventRefs];
}

/**
 * Get all inbound and outbound references for a specific definition.
 */
export async function getReferencesFor(
  type: DefinitionType,
  slug: string
): Promise<ReferenceReport> {
  const graph = await buildReferenceGraph();

  const outbound = graph.filter(
    (r) => r.source.type === type && r.source.slug === slug
  );
  const inbound = graph.filter(
    (r) => r.target.type === type && r.target.slug === slug
  );

  return {
    subject: { type, slug },
    outbound,
    inbound,
  };
}

/** All known slugs in the system, grouped by type. */
async function getAllKnownSlugs(): Promise<Map<DefinitionType, Set<string>>> {
  const known = new Map<DefinitionType, Set<string>>();

  const [dungeons, shops, mounts, events, simulations] = await Promise.all([
    prisma.dungeonTemplate.findMany({ select: { slug: true } }),
    prisma.shopTemplate.findMany({ select: { slug: true } }),
    prisma.mountTemplate.findMany({ select: { slug: true } }),
    prisma.worldEventTemplate.findMany({ select: { slug: true } }),
    prisma.simulationPreset.findMany({ select: { slug: true } }),
  ]);

  known.set("dungeon", new Set(dungeons.map((d) => d.slug)));
  known.set("shop", new Set(shops.map((s) => s.slug)));
  known.set("mount", new Set(mounts.map((m) => m.slug)));
  known.set("worldevent", new Set(events.map((e) => e.slug)));
  known.set("simulation", new Set(simulations.map((s) => s.slug)));

  return known;
}

/** Orphaned reference = a CrossReference whose target slug doesn't exist in the DB. */
export interface OrphanedReference extends CrossReference {
  reason: string;
}

/**
 * Find all cross-references that point to non-existent definitions.
 * These are broken references that should be flagged in the Problems panel.
 */
export async function getOrphanedReferences(): Promise<OrphanedReference[]> {
  const [graph, knownSlugs] = await Promise.all([
    buildReferenceGraph(),
    getAllKnownSlugs(),
  ]);

  const orphans: OrphanedReference[] = [];

  for (const ref of graph) {
    const targetSet = knownSlugs.get(ref.target.type);
    // Only check types we have tables for
    if (targetSet && !targetSet.has(ref.target.slug)) {
      orphans.push({
        ...ref,
        reason: `${ref.target.type} "${ref.target.slug}" does not exist (referenced by ${ref.source.type} "${ref.source.slug}" via ${ref.context || ref.relationship})`,
      });
    }
  }

  return orphans;
}
