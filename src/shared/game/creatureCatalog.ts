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
  name: string;
  dexNumber: number;
  typePrimary: CreatureElementType | string;
  typeSecondary: CreatureElementType | string;
  spriteOverworld: string;
  spriteBattle?: string | null;
  spriteBack?: string | null;
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

/** Curated asset keys for Studio picker (battle sheets + overworld). */
export const CREATURE_ASSET_OPTIONS: { key: string; label: string; kind: "overworld" | "battle" }[] = [
  { key: "npc/rockitten", label: "Rockitten (overworld)", kind: "overworld" },
  { key: "npc/conileaf", label: "Conileaf (overworld)", kind: "overworld" },
  { key: "monster/battle/agnite-sheet", label: "Agnite battle sheet", kind: "battle" },
  { key: "monster/battle/budaye-sheet", label: "Budaye battle sheet", kind: "battle" },
  { key: "monster/battle/dollfin-sheet", label: "Dollfin battle sheet", kind: "battle" },
  { key: "monster/battle/rockitten-sheet", label: "Rockitten battle sheet", kind: "battle" },
  { key: "monster/battle/foxfire-sheet", label: "Foxfire battle sheet", kind: "battle" },
  { key: "monster/battle/ignibus-sheet", label: "Ignibus battle sheet", kind: "battle" },
  { key: "monster/battle/lambert-sheet", label: "Lambert battle sheet", kind: "battle" },
  { key: "monster/battle/cardiling-sheet", label: "Cardiling battle sheet", kind: "battle" },
  // Custom Saints sheets
  { key: "creatures/lumkit-sheet", label: "Lumkit", kind: "battle" },
  { key: "creatures/lumkit-ow", label: "Lumkit (overworld)", kind: "overworld" },
  { key: "creatures/lumveil-ow", label: "Lumveil (overworld)", kind: "overworld" },
  { key: "creatures/mosswhim-ow", label: "Mosswhim (overworld)", kind: "overworld" },
  { key: "creatures/solarcrown-ow", label: "Solarcrown (overworld)", kind: "overworld" },
  { key: "creatures/stonethrum-ow", label: "Stonethrum (overworld)", kind: "overworld" },
  { key: "creatures/terravault-ow", label: "Terravault (overworld)", kind: "overworld" },
  { key: "world-monsters/ashwhirl-ow", label: "Ashwhirl (overworld)", kind: "overworld" },
  { key: "world-monsters/grimvast-ow", label: "Grimvast (overworld)", kind: "overworld" },
  { key: "world-monsters/hollowmirth-ow", label: "Hollowmirth (overworld)", kind: "overworld" },
  { key: "world-monsters/rootwail-ow", label: "Rootwail (overworld)", kind: "overworld" },
  { key: "world-monsters/siltmourne-ow", label: "Siltmourne (overworld)", kind: "overworld" },
  { key: "world-monsters/tanglewrath-ow", label: "Tanglewrath (overworld)", kind: "overworld" },
  { key: "creatures/lumveil-sheet", label: "Lumveil", kind: "battle" },
  { key: "creatures/mosswhim-sheet", label: "Mosswhim", kind: "battle" },
  { key: "creatures/solarcrown-sheet", label: "Solarcrown", kind: "battle" },
  { key: "creatures/stonethrum-sheet", label: "Stonethrum", kind: "battle" },
  { key: "creatures/terravault-sheet", label: "Terravault", kind: "battle" },
  { key: "world-monsters/ashwhirl-sheet", label: "Ashwhirl (wild)", kind: "battle" },
  { key: "world-monsters/grimvast-sheet", label: "Grimvast (wild)", kind: "battle" },
  { key: "world-monsters/hollowmirth-sheet", label: "Hollowmirth (wild)", kind: "battle" },
  { key: "world-monsters/rootwail-sheet", label: "Rootwail (wild)", kind: "battle" },
  { key: "world-monsters/siltmourne-sheet", label: "Siltmourne (wild)", kind: "battle" },
  { key: "world-monsters/tanglewrath-sheet", label: "Tanglewrath (wild)", kind: "battle" },
  { key: "daemon_data", label: "Daemon Data placeholder", kind: "battle" },
  { key: "daemon_vaccine", label: "Daemon Vaccine placeholder", kind: "battle" },
  { key: "daemon_virus", label: "Daemon Virus placeholder", kind: "battle" },
];

export function creatureAssetUrl(key: string | null | undefined): string {
  if (!key) return "/game-assets/daemon_data.png";
  if (key.startsWith("/")) return key;
  if (key.startsWith("http")) return key;
  return `/game-assets/${key}.png`;
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

/**
 * Resolve any lobby entity sprite key (bare slug, relative path, or absolute URL)
 * to a real `/game-assets/...` URL. Bare wild/creature slugs must not fall through
 * to `/game-assets/npc/<slug>.png` (that was causing pink missing-texture boxes).
 */
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
    if (raw.startsWith("/assets/sprites/")) {
      const bare = raw.replace(/^\/assets\/sprites\//, "").replace(/\.png$/i, "");
      return resolveEntitySpriteUrl(bare, opts);
    }
    return raw;
  }

  const key = raw.replace(/\.png$/i, "");
  if (key.includes("/")) {
    return creatureAssetUrl(key);
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
  const CUSTOM_NPCS = [
    "candrift_keeper",
    "capturer_kian",
    "elder_voss",
    "ironwright_kael",
    "scout_mira",
    "soulwarden_aldric",
  ];
  if (CUSTOM_NPCS.includes(customNpcBase)) {
    return creatureAssetUrl(`npc/${customNpcBase}-ow`);
  }

  // Missing legacy placeholders → visible fallback instead of Babylon pink checkers
  if (
    key === "villager_1" ||
    key === "villager_2" ||
    key === "chicken" ||
    key === "cow" ||
    key === "guide_1" ||
    key === "npc_default"
  ) {
    return fallback;
  }

  if (opts?.kind === "creature" || opts?.kind === "monster" || opts?.kind === "animal") {
    return creatureAssetUrl(`world-monsters/${key}-ow`);
  }

  return creatureAssetUrl(`npc/${key}`);
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
  // ── Custom Saints companions (public/game-assets/creatures/) ──
  {
    slug: "lumkit",
    name: "Lumkit",
    dexNumber: 5,
    typePrimary: "Aero",
    typeSecondary: "None",
    spriteOverworld: "creatures/lumkit-ow",
    spriteBattle: "creatures/lumkit-sheet",
    spriteBack: null,
    baseHp: 96,
    physicalPower: 11,
    physicalDefense: 9,
    abilityPower: 14,
    abilityDefense: 11,
    combatTempo: 115,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "glow_whisker",
        name: "Glow Whisker",
        description: "Slight accuracy bonus when opening the first turn.",
        isDefault: true,
      },
    ],
    worldSkillName: "Lantern Leap",
    worldSkillDescription: "Lights dim paths and startles roosting pests.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A lantern-furred kit that hums with soft windlight.",
    tag: "Starter · Aero",
    tagColor: "#7dd3fc",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 5,
  },
  {
    slug: "lumveil",
    name: "Lumveil",
    dexNumber: 6,
    typePrimary: "Aero",
    typeSecondary: "Solar",
    spriteOverworld: "creatures/lumveil-ow",
    spriteBattle: "creatures/lumveil-sheet",
    spriteBack: null,
    baseHp: 102,
    physicalPower: 10,
    physicalDefense: 11,
    abilityPower: 15,
    abilityDefense: 13,
    combatTempo: 105,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "veil_drift",
        name: "Veil Drift",
        description: "Small evasion bonus while HP is above half.",
        isDefault: true,
      },
    ],
    worldSkillName: "Soft Eclipse",
    worldSkillDescription: "Dims hostile aggro range for a short pulse.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A veiled sky-spirit trailing ribbons of dawn.",
    tag: "Starter · Aero",
    tagColor: "#c4b5fd",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 6,
  },
  {
    slug: "mosswhim",
    name: "Mosswhim",
    dexNumber: 7,
    typePrimary: "Bio",
    typeSecondary: "None",
    spriteOverworld: "creatures/mosswhim-ow",
    spriteBattle: "creatures/mosswhim-sheet",
    spriteBack: null,
    baseHp: 112,
    physicalPower: 9,
    physicalDefense: 15,
    abilityPower: 12,
    abilityDefense: 14,
    combatTempo: 80,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "moss_cushion",
        name: "Moss Cushion",
        description: "Takes reduced damage from the first hit each battle.",
        isDefault: true,
      },
    ],
    worldSkillName: "Sprout Soften",
    worldSkillDescription: "Softens bramble and boosts woodcutting synergy.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A mossy whim-beast that nests in fallen trunks.",
    tag: "Starter · Bio",
    tagColor: "#4ade80",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 7,
  },
  {
    slug: "solarcrown",
    name: "Solarcrown",
    dexNumber: 8,
    typePrimary: "Solar",
    typeSecondary: "None",
    spriteOverworld: "creatures/solarcrown-ow",
    spriteBattle: "creatures/solarcrown-sheet",
    spriteBack: null,
    baseHp: 104,
    physicalPower: 15,
    physicalDefense: 11,
    abilityPower: 13,
    abilityDefense: 10,
    combatTempo: 100,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "helioray",
        name: "Helioray",
        description: "Physical attackers take slight burn chip when striking this creature.",
        isDefault: true,
      },
    ],
    worldSkillName: "Crownflare",
    worldSkillDescription: "Burns bramble barriers and kindles campfires.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A crowned ember-beast that rules sunlit clearings.",
    tag: "Starter · Solar",
    tagColor: "#fb923c",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 8,
  },
  {
    slug: "stonethrum",
    name: "Stonethrum",
    dexNumber: 9,
    typePrimary: "Geo",
    typeSecondary: "None",
    spriteOverworld: "creatures/stonethrum-ow",
    spriteBattle: "creatures/stonethrum-sheet",
    spriteBack: null,
    baseHp: 118,
    physicalPower: 14,
    physicalDefense: 16,
    abilityPower: 8,
    abilityDefense: 12,
    combatTempo: 75,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "faultline",
        name: "Faultline",
        description: "Slightly reduced physical damage taken.",
        isDefault: true,
      },
    ],
    worldSkillName: "Thrum Pulse",
    worldSkillDescription: "Can weight pressure plates and clear small rockfall.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A living drum of packed stone that thrums underfoot.",
    tag: "Starter · Geo",
    tagColor: "#a8a29e",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 9,
  },
  {
    slug: "terravault",
    name: "Terravault",
    dexNumber: 10,
    typePrimary: "Geo",
    typeSecondary: "Bio",
    spriteOverworld: "creatures/terravault-ow",
    spriteBattle: "creatures/terravault-sheet",
    spriteBack: null,
    baseHp: 120,
    physicalPower: 13,
    physicalDefense: 17,
    abilityPower: 9,
    abilityDefense: 13,
    combatTempo: 70,
    catchRate: 1,
    starterLevel: 5,
    passives: [
      {
        id: "vault_shell",
        name: "Vault Shell",
        description: "Takes reduced damage from the first hit each battle.",
        isDefault: true,
      },
    ],
    worldSkillName: "Earthen Lock",
    worldSkillDescription: "Seals unstable ground and props collapsed ledges.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A shelled earth-guardian that stores seed and stone alike.",
    tag: "Starter · Geo",
    tagColor: "#86efac",
    stage: "basic",
    isStarter: true,
    isWildSpawn: false,
    isActive: true,
    sortOrder: 10,
  },
  // ── Custom wilds (public/game-assets/world-monsters/) ──
  {
    slug: "ashwhirl",
    name: "Ashwhirl",
    dexNumber: 11,
    typePrimary: "Solar",
    typeSecondary: "Aero",
    spriteOverworld: "world-monsters/ashwhirl-ow",
    spriteBattle: "world-monsters/ashwhirl-sheet",
    spriteBack: null,
    baseHp: 90,
    physicalPower: 13,
    physicalDefense: 9,
    abilityPower: 12,
    abilityDefense: 9,
    combatTempo: 120,
    catchRate: 1,
    starterLevel: 4,
    passives: [
      {
        id: "cinder_spin",
        name: "Cinder Spin",
        description: "Slight Tempo edge when HP is below half.",
        isDefault: true,
      },
    ],
    worldSkillName: "Ash Gust",
    worldSkillDescription: "Kicks up ash that briefly blinds nearby pests.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A spinning cinder spirit born from campfire leftovers.",
    tag: "Wild · Solar",
    tagColor: "#f97316",
    stage: "basic",
    isStarter: false,
    isWildSpawn: true,
    isActive: true,
    sortOrder: 11,
  },
  {
    slug: "grimvast",
    name: "Grimvast",
    dexNumber: 12,
    typePrimary: "Geo",
    typeSecondary: "None",
    spriteOverworld: "world-monsters/grimvast-ow",
    spriteBattle: "world-monsters/grimvast-sheet",
    spriteBack: null,
    baseHp: 115,
    physicalPower: 15,
    physicalDefense: 15,
    abilityPower: 7,
    abilityDefense: 11,
    combatTempo: 70,
    catchRate: 1,
    starterLevel: 4,
    passives: [
      {
        id: "vast_weight",
        name: "Vast Weight",
        description: "Slightly reduced physical damage taken.",
        isDefault: true,
      },
    ],
    worldSkillName: "Grim Quake",
    worldSkillDescription: "Shakes loose ore nodules from cliff faces.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A grim slab-beast that patrols the basin rim.",
    tag: "Wild · Geo",
    tagColor: "#78716c",
    stage: "basic",
    isStarter: false,
    isWildSpawn: true,
    isActive: true,
    sortOrder: 12,
  },
  {
    slug: "hollowmirth",
    name: "Hollowmirth",
    dexNumber: 13,
    typePrimary: "Cryo",
    typeSecondary: "Aero",
    spriteOverworld: "world-monsters/hollowmirth-ow",
    spriteBattle: "world-monsters/hollowmirth-sheet",
    spriteBack: null,
    baseHp: 88,
    physicalPower: 9,
    physicalDefense: 10,
    abilityPower: 16,
    abilityDefense: 12,
    combatTempo: 110,
    catchRate: 1,
    starterLevel: 4,
    passives: [
      {
        id: "hollow_laugh",
        name: "Hollow Laugh",
        description: "Small evasion bonus on the first turn of battle.",
        isDefault: true,
      },
    ],
    worldSkillName: "Echo Chill",
    worldSkillDescription: "Cools fevered wildlife and frosts shallow puddles.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A grinning hollow that laughs like winter wind.",
    tag: "Wild · Cryo",
    tagColor: "#67e8f9",
    stage: "basic",
    isStarter: false,
    isWildSpawn: true,
    isActive: true,
    sortOrder: 13,
  },
  {
    slug: "rootwail",
    name: "Rootwail",
    dexNumber: 14,
    typePrimary: "Bio",
    typeSecondary: "None",
    spriteOverworld: "world-monsters/rootwail-ow",
    spriteBattle: "world-monsters/rootwail-sheet",
    spriteBack: null,
    baseHp: 108,
    physicalPower: 12,
    physicalDefense: 13,
    abilityPower: 11,
    abilityDefense: 12,
    combatTempo: 85,
    catchRate: 1,
    starterLevel: 4,
    passives: [
      {
        id: "wailing_root",
        name: "Wailing Root",
        description: "Slowly regenerates a sliver of HP between turns (future).",
        isDefault: true,
      },
    ],
    worldSkillName: "Root Snare",
    worldSkillDescription: "Tangles bramble and marks harvest nodes.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A keening root-beast that mourns cut timber.",
    tag: "Wild · Bio",
    tagColor: "#22c55e",
    stage: "basic",
    isStarter: false,
    isWildSpawn: true,
    isActive: true,
    sortOrder: 14,
  },
  {
    slug: "siltmourne",
    name: "Siltmourne",
    dexNumber: 15,
    typePrimary: "Hydro",
    typeSecondary: "Geo",
    spriteOverworld: "world-monsters/siltmourne-ow",
    spriteBattle: "world-monsters/siltmourne-sheet",
    spriteBack: null,
    baseHp: 100,
    physicalPower: 12,
    physicalDefense: 12,
    abilityPower: 12,
    abilityDefense: 12,
    combatTempo: 90,
    catchRate: 1,
    starterLevel: 4,
    passives: [
      {
        id: "silt_shroud",
        name: "Silt Shroud",
        description: "Small evasion bonus when opening on damp ground (future).",
        isDefault: true,
      },
    ],
    worldSkillName: "Mire Pull",
    worldSkillDescription: "Drags loose silt to reveal buried film crystals.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A mourning silt-wader from the basin shallows.",
    tag: "Wild · Hydro",
    tagColor: "#38bdf8",
    stage: "basic",
    isStarter: false,
    isWildSpawn: true,
    isActive: true,
    sortOrder: 15,
  },
  {
    slug: "tanglewrath",
    name: "Tanglewrath",
    dexNumber: 16,
    typePrimary: "Bio",
    typeSecondary: "Volt",
    spriteOverworld: "world-monsters/tanglewrath-ow",
    spriteBattle: "world-monsters/tanglewrath-sheet",
    spriteBack: null,
    baseHp: 95,
    physicalPower: 14,
    physicalDefense: 10,
    abilityPower: 13,
    abilityDefense: 10,
    combatTempo: 100,
    catchRate: 1,
    starterLevel: 4,
    passives: [
      {
        id: "wrath_vines",
        name: "Wrath Vines",
        description: "Physical attackers take slight chip when striking this creature.",
        isDefault: true,
      },
    ],
    worldSkillName: "Thornlash",
    worldSkillDescription: "Whips bramble aside and shocks invasive pests.",
    abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
    flavor: "A furious tangle that crackles when brushed.",
    tag: "Wild · Bio",
    tagColor: "#a3e635",
    stage: "basic",
    isStarter: false,
    isWildSpawn: true,
    isActive: true,
    sortOrder: 16,
  },
];

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
    name: "",
    dexNumber: 0,
    typePrimary: "Solar",
    typeSecondary: "None",
    spriteOverworld: "daemon_data",
    spriteBattle: "daemon_data",
    spriteBack: null,
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
