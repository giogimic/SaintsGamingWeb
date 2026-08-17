/**
 * Creature catalog — same “easy to add” idea as StarterHeroes.
 * Canonical runtime seed; Studio / Prisma CreatureDef can override.
 */

export const CREATURE_ELEMENT_TYPES = [
  "Solar",
  "Hydro",
  "Bio",
  "Volt",
  "Geo",
  "Cryo",
  "Aero",
  "Cyber",
  "None",
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

/** Full editable creature definition (shared by seed, Studio, gameplay). */
export type CreatureDefData = {
  slug: string;
  /** World profile id; null/empty = shared across Studio profiles */
  gameId?: string | null;
  name: string;
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

/** Seed / fallback catalog — edit here or in Studio after seed. */
export const FALLBACK_CREATURE_DEFS: CreatureDefData[] = [
  {
    slug: "agnite",
    name: "Pyre Drake",
    dexNumber: 1,
    typePrimary: "Solar",
    typeSecondary: "None",
    spriteOverworld: "monster/battle/agnite-sheet",
    spriteBattle: "monster/battle/agnite-sheet",
    spriteBack: null,
    ...DEFAULT_SHINY_FIELDS,
    baseHp: 100,
    physicalPower: 16,
    physicalDefense: 10,
    abilityPower: 12,
    abilityDefense: 8,
    combatTempo: 95,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "molten_core",
        name: "Molten Core",
        description: "Physical attackers take slight burn chip when striking this creature.",
        isDefault: true,
      },
      {
        id: "kindling",
        name: "Kindling",
        description: "Firemaking actions near this creature gain a small XP bonus (future).",
        isDefault: false,
      },
    ],
    worldSkillName: "Ignite",
    worldSkillDescription: "Burns bramble barriers and camp kindling in synergy events.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A false-dragon hatchling of living ember. Solar strength focus.",
    tag: "Starter · Solar",
    tagColor: "#f97316",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "budaye",
    name: "Thorn Bud",
    dexNumber: 2,
    typePrimary: "Bio",
    typeSecondary: "None",
    spriteOverworld: "monster/battle/budaye-sheet",
    spriteBattle: "monster/battle/budaye-sheet",
    spriteBack: null,
    ...DEFAULT_SHINY_FIELDS,
    baseHp: 110,
    physicalPower: 10,
    physicalDefense: 16,
    abilityPower: 10,
    abilityDefense: 14,
    combatTempo: 85,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "barkskin",
        name: "Barkskin",
        description: "Takes reduced damage from the first hit each battle.",
        isDefault: true,
      },
      {
        id: "photosynth",
        name: "Photosynth",
        description: "Slowly regenerates HP while standing on grass tiles (future).",
        isDefault: false,
      },
    ],
    worldSkillName: "Vine Surge",
    worldSkillDescription: "Pulls and dissolves bramble walls; boosts woodcutting synergy.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A mutual wood-spirit bud. Bio endurance and harvest synergy.",
    tag: "Starter · Bio",
    tagColor: "#22c55e",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    slug: "dollfin",
    name: "Current Fin",
    dexNumber: 3,
    typePrimary: "Hydro",
    typeSecondary: "None",
    spriteOverworld: "monster/battle/dollfin-sheet",
    spriteBattle: "monster/battle/dollfin-sheet",
    spriteBack: null,
    ...DEFAULT_SHINY_FIELDS,
    baseHp: 95,
    physicalPower: 11,
    physicalDefense: 10,
    abilityPower: 13,
    abilityDefense: 11,
    combatTempo: 110,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "slipstream",
        name: "Slipstream",
        description: "Higher chance to move first when Tempo is tied.",
        isDefault: true,
      },
      {
        id: "mist_veil",
        name: "Mist Veil",
        description: "Small evasion bonus on the first turn of battle.",
        isDefault: false,
      },
    ],
    worldSkillName: "Water Jet",
    worldSkillDescription: "Cuts bramble with pressurized spray; fishing synergy later.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A joyful leviathan pup. Hydro agility and rivercraft.",
    tag: "Starter · Hydro",
    tagColor: "#38bdf8",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: "rockitten",
    name: "Rockitten",
    dexNumber: 4,
    typePrimary: "Geo",
    typeSecondary: "None",
    spriteOverworld: "npc/rockitten",
    spriteBattle: "monster/battle/rockitten-sheet",
    spriteBack: null,
    ...DEFAULT_SHINY_FIELDS,
    baseHp: 100,
    physicalPower: 12,
    physicalDefense: 14,
    abilityPower: 8,
    abilityDefense: 10,
    combatTempo: 90,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "stone_hide",
        name: "Stone Hide",
        description: "Slightly reduced physical damage taken.",
        isDefault: true,
      },
    ],
    worldSkillName: "Boulder Path",
    worldSkillDescription: "Can weight pressure plates and clear small rockfall (future).",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "Cute boulder-beast. MPV wild spawn for RT + tall-grass TB.",
    tag: "Wild · Geo",
    tagColor: "#a78bfa",
    stage: "basic",
    isStarter: false,
    isWildSpawn: true,
    isActive: true,
    sortOrder: 4,
  },
];

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
]);

/** Player/peer aliases that must never 404 into the brown UV-cropped fallback. */
const PLAYER_SPRITE_ALIASES: Record<string, string> = {
  hero_male: "adventurer",
  hero_female: "adventurer",
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

  const def = getFallbackCreature(key);
  if (def?.spriteOverworld) {
    return creatureAssetUrl(def.spriteOverworld);
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

export function getFallbackCreature(slug: string): CreatureDefData | undefined {
  return FALLBACK_CREATURE_DEFS.find((c) => c.slug === slug);
}

export function listFallbackStarters(): CreatureDefData[] {
  return FALLBACK_CREATURE_DEFS.filter((c) => c.isStarter && c.isActive).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export function emptyCreatureDef(): CreatureDefData {
  return {
    slug: "",
    gameId: "tuxemon",
    name: "",
    dexNumber: 0,
    typePrimary: "Solar",
    typeSecondary: "None",
    spriteOverworld: "daemon_data",
    spriteBattle: "daemon_data",
    spriteBack: null,
    ...DEFAULT_SHINY_FIELDS,
    baseHp: 100,
    physicalPower: 10,
    physicalDefense: 10,
    abilityPower: 10,
    abilityDefense: 10,
    combatTempo: 100,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "new_passive",
        name: "New Passive",
        description: "Describe the passive effect.",
        isDefault: true,
      },
    ],
    worldSkillName: "",
    worldSkillDescription: "",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "",
    tag: "Standard",
    tagColor: "#34d399",
    stage: "basic",
    isStarter: false,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 0,
  };
}
