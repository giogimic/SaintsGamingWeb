/**
 * Creature catalog — same “easy to add” idea as StarterHeroes.
 * Canonical runtime seed; Studio / Prisma CreatureDef can override.
 */

import { AssetManager } from '../../engine/assets/AssetManager';
import { resolveSpriteDefinition } from './spriteDefinitions';

export const CREATURE_ELEMENT_TYPES = [
  "normal",
  "fire",
  "water",
  "grass",
  "electric",
  "ice",
  "earth",
  "wind",
  "shadow",
  "holy",
  "none",
  "None",
  "Solar",
  "Hydro",
  "Bio",
  "Volt",
  "Geo",
  "Cryo",
  "Aero",
  "Cyber",
] as const;

export type CreatureElementType = (typeof CREATURE_ELEMENT_TYPES)[number];

export type CreaturePassive = {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
};

export type CreatureAbilitySlot = {
  abilitySlug: string;
  currentCooldown: number;
};

export type CreatureStatBlock = {
  baseHp: number;
  physicalPower: number;
  physicalDefense: number;
  abilityPower: number;
  abilityDefense: number;
  combatTempo: number;
  catchRate: number;
};

export type CreatureLootRef = {
  tableId: string;
  label?: string;
};

export type CreatureCategory = 'beast' | 'monster' | 'mercenary';

export const CREATURE_CATEGORIES: { id: CreatureCategory; label: string; blurb: string }[] = [
  { id: 'beast', label: 'Beast (Buddy)', blurb: 'Capturable creatures with evolution, Dex entries & collection encounters.' },
  { id: 'monster', label: 'Monster (Enemy)', blurb: 'Standard hostile world combatants focused on MMO defeat & loot drops.' },
  { id: 'mercenary', label: 'Mercenary (Companion)', blurb: 'Recruitable party operatives and combat companions.' },
];

/** Full editable creature definition (shared by seed, Studio, gameplay). */
export type CreatureDefData = {
  slug: string;
  /** World profile id; null/empty = shared across Studio profiles */
  gameId?: string | null;
  name: string;
  /** Creature taxonomy category: beast (buddy), monster (enemy), or mercenary (companion) */
  category?: CreatureCategory;
  dexNumber: number;
  typePrimary: CreatureElementType | string;
  typeSecondary: CreatureElementType | string;
  spriteOverworld: string;
  spriteBattle?: string | null;
  spriteBack?: string | null;
  /** Can this species roll shiny on wild spawn? */
  shinyEnabled: boolean;
  /** If true, use GameConfig.globalShinyChancePercent; else shinyChancePercent. */
  shinyUseGlobalChance: boolean;
  /** Per-species shiny chance percent (0–100) when not syncing global. */
  shinyChancePercent: number;
  shinySpriteOverworld?: string | null;
  shinySpriteBattle?: string | null;
  shinySpriteBack?: string | null;
  baseHp: number;
  physicalPower: number;
  physicalDefense: number;
  abilityPower: number;
  abilityDefense: number;
  combatTempo: number;
  catchRate: number;
  starterLevel: number;
  passives: CreaturePassive[];
  worldSkillName: string;
  worldSkillDescription: string;
  abilities: CreatureAbilitySlot[];
  flavor: string;
  tag: string;
  tagColor: string;
  stage: string;
  isStarter: boolean;
  isWildSpawn: boolean;
  isActive: boolean;
  sortOrder: number;
  lootTableRefs?: CreatureLootRef[];
  // Monster specific attributes (Bible 20)
  aggroRadius?: number;
  respawnSec?: number;
  // Mercenary specific attributes (Bible 20)
  hireCost?: number;
  factionId?: string;
};

const DEFAULT_SHINY_FIELDS = {
  shinyEnabled: true,
  shinyUseGlobalChance: true,
  shinyChancePercent: 0.5,
  shinySpriteOverworld: null as string | null,
  shinySpriteBattle: null as string | null,
  shinySpriteBack: null as string | null,
};

/** Creature asset subcategories for granular studio filtering (Phase 4B). */
export type CreatureAssetSubcategory =
  | "battle_sheet"
  | "front_sprite"
  | "back_sprite"
  | "face_portrait"
  | "overworld";

export const CREATURE_SUBCATEGORY_LABELS: Record<CreatureAssetSubcategory, string> = {
  battle_sheet: "Battle Sheets",
  front_sprite: "Front Sprites",
  back_sprite: "Back Sprites",
  face_portrait: "Face Portraits",
  overworld: "Overworld Sprites",
};

/** Classify a path, filename, or asset key into a creature sub-category. */
export function classifyCreatureAsset(pathOrKey: string): CreatureAssetSubcategory | null {
  const lower = pathOrKey.toLowerCase().replace(/\\/g, "/");
  if (lower.includes("-front") || lower.includes("_front") || /front\d*\.png$/i.test(lower)) {
    return "front_sprite";
  }
  if (lower.includes("-back") || lower.includes("_back") || /back\d*\.png$/i.test(lower)) {
    return "back_sprite";
  }
  if (lower.includes("-face") || lower.includes("_face") || /face\d*\.png$/i.test(lower)) {
    return "face_portrait";
  }
  if (lower.includes("-sheet") || lower.includes("/battle/") || lower.includes("battle-sheet")) {
    return "battle_sheet";
  }
  if (lower.includes("-ow") || lower.includes("_ow") || lower.includes("/creatures/") || lower.includes("/world-monsters/")) {
    return "overworld";
  }
  return null;
}

/** Curated asset keys for Studio picker (battle sheets + overworld). */
export const CREATURE_ASSET_OPTIONS: { key: string; label: string; kind: "overworld" | "battle"; subcategory?: CreatureAssetSubcategory }[] = [
  { key: "npc/rockitten", label: "Rockitten (overworld)", kind: "overworld", subcategory: "overworld" },
  { key: "npc/conileaf", label: "Conileaf (overworld)", kind: "overworld", subcategory: "overworld" },
  { key: "monster/battle/agnite-sheet", label: "Agnite battle sheet", kind: "battle", subcategory: "battle_sheet" },
  { key: "monster/battle/budaye-sheet", label: "Budaye battle sheet", kind: "battle", subcategory: "battle_sheet" },
  { key: "monster/battle/dollfin-sheet", label: "Dollfin battle sheet", kind: "battle", subcategory: "battle_sheet" },
  { key: "monster/battle/rockitten-sheet", label: "Rockitten battle sheet", kind: "battle", subcategory: "battle_sheet" },
  { key: "monster/battle/foxfire-sheet", label: "Foxfire battle sheet", kind: "battle", subcategory: "battle_sheet" },
  { key: "monster/battle/ignibus-sheet", label: "Ignibus battle sheet", kind: "battle", subcategory: "battle_sheet" },
  { key: "monster/battle/lambert-sheet", label: "Lambert battle sheet", kind: "battle", subcategory: "battle_sheet" },
  { key: "monster/battle/cardiling-sheet", label: "Cardiling battle sheet", kind: "battle", subcategory: "battle_sheet" },
  { key: "daemon_data", label: "Daemon Data placeholder", kind: "battle", subcategory: "battle_sheet" },
  { key: "daemon_vaccine", label: "Daemon Vaccine placeholder", kind: "battle", subcategory: "battle_sheet" },
  { key: "daemon_virus", label: "Daemon Virus placeholder", kind: "battle", subcategory: "battle_sheet" },
];

export function creatureAssetUrl(key: string | null | undefined): string {
  if (!key) return "/game-assets/daemon_data.png";
  if (key.startsWith("/")) return key;
  if (key.startsWith("http")) return key;
  return `/game-assets/${key}.png`;
}

export function defaultPassive(def: CreatureDefData): CreaturePassive | null {
  return def.passives.find((p) => p.isDefault) || def.passives[0] || null;
}

export function toPlayerCreatureStats(def: CreatureDefData) {
  return {
    physicalPower: def.physicalPower,
    physicalDefense: def.physicalDefense,
    abilityPower: def.abilityPower,
    abilityDefense: def.abilityDefense,
    combatTempo: def.combatTempo,
  };
}

export function emptyCreatureDef(): CreatureDefData {
  return {
    slug: "",
    name: "",
    category: "beast",
    dexNumber: 0,
    typePrimary: "None",
    typeSecondary: "None",
    spriteOverworld: "",
    shinyEnabled: true,
    shinyUseGlobalChance: true,
    shinyChancePercent: 0.5,
    baseHp: 100,
    physicalPower: 10,
    physicalDefense: 10,
    abilityPower: 10,
    abilityDefense: 10,
    combatTempo: 100,
    catchRate: 1,
    starterLevel: 5,
    passives: [],
    worldSkillName: "",
    worldSkillDescription: "",
    abilities: [],
    flavor: "",
    tag: "Standard",
    tagColor: "#34d399",
    stage: "basic",
    isStarter: false,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 0,
    aggroRadius: 5,
    respawnSec: 30,
    hireCost: 100,
  };
}



const WILD_OVERWORLD_SLUGS = new Set([
  "ashwhirl",
  "grimvast",
  "hollowmirth",
  "rootwail",
  "siltmourne",
  "tanglewrath",
]);

const STARTER_OVERWORLD_SLUGS = new Set([
  "lumkit",
  "lumveil",
  "mosswhim",
  "solarcrown",
  "stonethrum",
  "terravault",
]);

const MISSING_NPC_PLACEHOLDERS = new Set([
  "villager_1",
  "villager_2",
  "chicken",
  "cow",
  "guide_1",
  "npc_default",
  // Legacy peer default — file never shipped; use adventurer walk sheet.
  "hero_male",
  "hero_female",
  "alchemist",
]);

/** Player/peer/NPC aliases that must never 404 into the brown UV-cropped fallback. */
const PLAYER_SPRITE_ALIASES: Record<string, string> = {
  hero_male: "adventurer",
  hero_female: "adventurer",
  alchemist: "professor",
};

const CUSTOM_NPC_SLUGS = [
  "candrift_keeper",
  "capturer_kian",
  "elder_voss",
  "ironwright_kael",
  "scout_mira",
  "soulwarden_aldric",
] as const;

/**
 * Pull a bare slug from an absolute /game-assets path so we can re-resolve
 * battle sheets / missing placeholders instead of returning broken URLs as-is.
 */
function slugFromAssetUrl(url: string): string | null {
  const path = url.split("?")[0] || url;
  const m = path.match(
    /\/game-assets\/(?:npc|creatures|world-monsters|monster\/battle)\/([^/]+?)(?:-sheet|-ow)?\.png$/i
  );
  return m?.[1] ? m[1].replace(/-sheet$/i, "").replace(/-ow$/i, "") : null;
}

export function resolveEntitySpriteUrl(
  spriteKey: string | null | undefined,
  opts?: { kind?: "npc" | "creature" | "animal" | "monster" | "player"; fallback?: string }
): string {
  const fallback = opts?.fallback || "/game-assets/npc/adventurer.png";
  if (!spriteKey) return fallback;

  const raw = String(spriteKey).trim();
  if (!raw) return fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) {
    // Legacy broken prefix used by BabylonEngine loadTilemap
    if (raw.startsWith("/assets/sprites/") || raw.startsWith("/game-assets/sprites/")) {
      const bare = raw
        .replace(/^\/(?:assets|game-assets)\/sprites\//, "")
        .replace(/\.png$/i, "");
      return resolveEntitySpriteUrl(bare, opts);
    }

    // Battle sheets must not billboard in the overworld — remap to OW crop.
    if (/-sheet\.png(?:$|\?)/i.test(raw) || raw.includes("/monster/battle/")) {
      const bare = slugFromAssetUrl(raw);
      if (bare) return resolveEntitySpriteUrl(bare, { ...opts, kind: opts?.kind || "monster" });
    }

    // Absolute paths to known-missing npc placeholders → fallback
    const absNpc = raw.match(/\/game-assets\/npc\/([^/]+)\.png(?:$|\?)/i);
    if (absNpc) {
      const key = absNpc[1].replace(/-ow$/i, "");
      if (MISSING_NPC_PLACEHOLDERS.has(key) || MISSING_NPC_PLACEHOLDERS.has(absNpc[1])) {
        return fallback;
      }
      if ((CUSTOM_NPC_SLUGS as readonly string[]).includes(key) && !/-ow\.png(?:$|\?)/i.test(raw)) {
        return creatureAssetUrl(`npc/${key}-ow`);
      }
    }

    return raw;
  }

  const key = raw.replace(/\.png$/i, "");
  if (key.includes("/")) {
    // Relative catalog keys that point at battle sheets → prefer overworld when possible
    if (key.endsWith("-sheet") || key.includes("monster/battle/")) {
      const bare = key.split("/").pop()?.replace(/-sheet$/i, "") || key;
      return resolveEntitySpriteUrl(bare, { ...opts, kind: opts?.kind || "monster" });
    }
    return creatureAssetUrl(key);
  }

  const playerAlias = PLAYER_SPRITE_ALIASES[key];
  if (playerAlias && (opts?.kind === "player" || opts?.kind === "npc" || !opts?.kind)) {
    return resolveEntitySpriteUrl(playerAlias, { ...opts, kind: opts?.kind || "player", fallback });
  }


  if (WILD_OVERWORLD_SLUGS.has(key)) {
    return creatureAssetUrl(`world-monsters/${key}-ow`);
  }
  if (STARTER_OVERWORLD_SLUGS.has(key)) {
    return creatureAssetUrl(`creatures/${key}-ow`);
  }
  if (key === "rockitten" || key === "conileaf") {
    return creatureAssetUrl(`npc/${key}`);
  }

  // Custom LimeWire NPCs — prefer small overworld crops, never full 1024² portraits in-world
  const customNpcBase = key.replace(/-ow$/, "");
  if ((CUSTOM_NPC_SLUGS as readonly string[]).includes(customNpcBase)) {
    return creatureAssetUrl(`npc/${customNpcBase}-ow`);
  }

  // Missing legacy placeholders → visible fallback instead of Babylon pink checkers
  if (MISSING_NPC_PLACEHOLDERS.has(key)) {
    return fallback;
  }

  if (opts?.kind === "creature" || opts?.kind === "monster" || opts?.kind === "animal") {
    return creatureAssetUrl(`world-monsters/${key}-ow`);
  }

  return creatureAssetUrl(`npc/${key}`);
}



/**
 * Fetch animationProfile from asset metadata for a given sprite URL/key.
 * Returns the animationProfile string (e.g., 'lpc-full', 'directional_3x4') or null.
 * This queries the AssetManager to get stored metadata from upload.
 */
export async function getAssetAnimationProfile(
  spriteUrlOrKey: string | null | undefined
): Promise<string | null> {
  if (!spriteUrlOrKey) return null;

  try {
    const manager = AssetManager.getInstance();
    // Try to find asset by source URL first
    const assets = await manager.searchAssets({ query: spriteUrlOrKey }, 0, 10);
    
    // Find exact match or closest match
    const asset = assets.items.find((a) => 
      a.source === spriteUrlOrKey || 
      a.source.includes(spriteUrlOrKey) ||
      spriteUrlOrKey.includes(a.source)
    );

    if (asset?.metadata?.anim) {
      return asset.metadata.anim as string;
    }
  } catch (err) {
    // Non-critical: fall back to URL detection
    console.warn('[getAssetAnimationProfile] Failed to query asset metadata:', err);
  }

  // Fast heuristic fallback from URL pattern if DB has no stored metadata
  const resolved = resolveSpriteDefinition({ spriteUrl: spriteUrlOrKey });
  if (resolved && resolved.profile && resolved.profile !== 'directional_3x4') {
    return resolved.profile;
  }

  return null;
}
