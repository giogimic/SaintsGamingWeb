/**
 * Real-time MMO ability catalog (bible 02 + 07).
 * Capture tools are forbidden here — capture is turn-based only (bible 07 §5, 11).
 */

import type { CreatureElementType } from "./creatureCatalog";

export const ELEMENTAL_MULTIPLIERS = {
  EFFECTIVE: 1.6,
  RESISTED: 0.8,
  IMMUNE: 0.4 // Serves as double-resist or highly ineffective
} as const;

export type ElementMatchupGraph = Record<string, { strongAgainst: string[], weakAgainst: string[] }>;

/**
 * 16-Element Matchup Graph based on Saints Gaming design rules.
 */
export const ELEMENT_MATCHUPS: ElementMatchupGraph = {
  Normal: { strongAgainst: [], weakAgainst: ['Geo'] },
  Fire: { strongAgainst: ['Nature', 'Ice', 'Bug', 'Steel'], weakAgainst: ['Water', 'Geo', 'Dragon'] },
  Water: { strongAgainst: ['Fire', 'Geo'], weakAgainst: ['Nature', 'Electric', 'Dragon'] },
  Nature: { strongAgainst: ['Water', 'Geo'], weakAgainst: ['Fire', 'Ice', 'Bug', 'Poison', 'Dragon'] },
  Electric: { strongAgainst: ['Water'], weakAgainst: ['Geo', 'Nature', 'Dragon'] },
  Ice: { strongAgainst: ['Nature', 'Geo', 'Dragon'], weakAgainst: ['Fire', 'Steel', 'Water'] },
  Geo: { strongAgainst: ['Fire', 'Electric', 'Poison', 'Steel'], weakAgainst: ['Water', 'Nature', 'Ice'] },
  Wind: { strongAgainst: ['Nature', 'Bug'], weakAgainst: ['Electric', 'Ice', 'Steel'] },
  Shadow: { strongAgainst: ['Holy', 'Ghost'], weakAgainst: ['Holy'] },
  Holy: { strongAgainst: ['Shadow', 'Undead'], weakAgainst: ['Shadow'] },
  Bug: { strongAgainst: ['Nature', 'Shadow', 'Holy'], weakAgainst: ['Fire', 'Wind', 'Steel', 'Poison'] },
  Poison: { strongAgainst: ['Nature', 'Holy'], weakAgainst: ['Geo', 'Poison', 'Ghost', 'Steel'] },
  Steel: { strongAgainst: ['Ice', 'Geo'], weakAgainst: ['Fire', 'Water', 'Electric', 'Steel'] },
  Ghost: { strongAgainst: ['Ghost', 'Holy'], weakAgainst: ['Shadow'] },
  Dragon: { strongAgainst: ['Dragon'], weakAgainst: ['Steel'] },
  Undead: { strongAgainst: ['Normal', 'Poison'], weakAgainst: ['Holy', 'Fire'] }
};

export function getElementalMultiplier(attackElement: string, targetPrimary: string, targetSecondary?: string): number {
  if (!attackElement || attackElement.toLowerCase() === 'none') return 1.0;
  
  const getMult = (atk: string, def: string) => {
    if (!def || def.toLowerCase() === 'none') return 1.0;
    
    const atkDef = ELEMENT_MATCHUPS[atk];
    if (!atkDef) return 1.0;
    
    if (atkDef.strongAgainst.includes(def)) return ELEMENTAL_MULTIPLIERS.EFFECTIVE;
    if (atkDef.weakAgainst.includes(def)) return ELEMENTAL_MULTIPLIERS.RESISTED;
    return 1.0;
  };

  const primaryMult = getMult(attackElement, targetPrimary);
  const secondaryMult = targetSecondary ? getMult(attackElement, targetSecondary) : 1.0;

  let totalMult = primaryMult * secondaryMult;
  
  // Cap at 0.4 for highly resisted (e.g. double resist)
  if (totalMult < ELEMENTAL_MULTIPLIERS.IMMUNE) {
    totalMult = ELEMENTAL_MULTIPLIERS.IMMUNE;
  }
  
  return totalMult;
}


export type AbilityCategory = "physical" | "special" | "utility" | "heal" | "buff";

export type CombatAbility = {
  id: string;
  name: string;
  power: number;
  category: AbilityCategory;
  cooldownMs: number;
  rangeTiles: number;
  element?: CreatureElementType;
};

/** Ability ids that must never appear on the RT hotbar or be accepted by CombatManager. */
export const FORBIDDEN_RT_CAPTURE_ABILITIES = [
  "capture",
  "capture_device",
  "binding_crystal",
  "capture_script",
  "capture_orb",
  "capture_sphere",
  "film_standard",
  "film_fine",
  "film_soul",
  "soul_camera",
] as const;

export function isForbiddenRtCaptureAbility(abilityId: string | undefined | null): boolean {
  if (!abilityId) return false;
  const id = abilityId.toLowerCase();
  return FORBIDDEN_RT_CAPTURE_ABILITIES.some(
    (f) =>
      id === f ||
      id.includes("capture") ||
      id.includes("binding_crystal") ||
      id.includes("film_") ||
      id.includes("soul_camera")
  );
}

export const COMBAT_ABILITIES: Record<string, CombatAbility> = {
  firestorm: { id: "firestorm", name: "Firestorm", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Fire" },
  steam_burst: { id: "steam_burst", name: "Steam Burst", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  magma_slide: { id: "magma_slide", name: "Magma Slide", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Fire" },
  scorching_shard: { id: "scorching_shard", name: "Scorching Shard", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Fire" },
  plasma_bolt: { id: "plasma_bolt", name: "Plasma Bolt", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Electric" },
  verdant_inferno: { id: "verdant_inferno", name: "Verdant Inferno", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Fire" },
  steelfire_strike: { id: "steelfire_strike", name: "Steelfire Strike", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Fire" },
  prismatic_flare: { id: "prismatic_flare", name: "Prismatic Flare", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Fire" },
  vile_pyre: { id: "vile_pyre", name: "Vile Pyre", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Fire" },
  echoing_inferno: { id: "echoing_inferno", name: "Echoing Inferno", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Fire" },
  mana_burst: { id: "mana_burst", name: "Mana Burst", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Fire" },
  haunted_blaze: { id: "haunted_blaze", name: "Haunted Blaze", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Fire" },
  radiant_phoenix: { id: "radiant_phoenix", name: "Radiant Phoenix", power: 0, category: "buff", cooldownMs: 15000, rangeTiles: 0, element: "Fire" },
  nullburn: { id: "nullburn", name: "Nullburn", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Fire" },
  meteor_fang: { id: "meteor_fang", name: "Meteor Fang", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Fire" },
  maelstrom: { id: "maelstrom", name: "Maelstrom", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  mudslide: { id: "mudslide", name: "Mudslide", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Water" },
  blizzard: { id: "blizzard", name: "Blizzard", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Ice" },
  chain_shock: { id: "chain_shock", name: "Chain Shock", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Water" },
  verdant_spring: { id: "verdant_spring", name: "Verdant Spring", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  aqua_lance: { id: "aqua_lance", name: "Aqua Lance", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Water" },
  crystal_shield: { id: "crystal_shield", name: "Crystal Shield", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  acid_torrent: { id: "acid_torrent", name: "Acid Torrent", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Water" },
  tsunami_boom: { id: "tsunami_boom", name: "Tsunami Boom", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Water" },
  arcane_tide: { id: "arcane_tide", name: "Arcane Tide", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  ghostly_mist: { id: "ghostly_mist", name: "Ghostly Mist", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  blessing_dew: { id: "blessing_dew", name: "Blessing Dew", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  blackwater: { id: "blackwater", name: "Blackwater", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  gravity_well: { id: "gravity_well", name: "Gravity Well", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Water" },
  sand_barrage: { id: "sand_barrage", name: "Sand Barrage", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Wind" },
  ice_gale: { id: "ice_gale", name: "Ice Gale", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Wind" },
  storm_gale: { id: "storm_gale", name: "Storm Gale", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Wind" },
  spore_cyclone: { id: "spore_cyclone", name: "Spore Cyclone", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Wind" },
  gale_slasher: { id: "gale_slasher", name: "Gale Slasher", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Wind" },
  cyclone_cleaver: { id: "cyclone_cleaver", name: "Cyclone Cleaver", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Wind" },
  noxious_blast: { id: "noxious_blast", name: "Noxious Blast", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Wind" },
  echo_tempest: { id: "echo_tempest", name: "Echo Tempest", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Wind" },
  mystic_gust: { id: "mystic_gust", name: "Mystic Gust", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Wind" },
  banshee_wind: { id: "banshee_wind", name: "Banshee Wind", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Wind" },
  sunburst_breeze: { id: "sunburst_breeze", name: "Sunburst Breeze", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Wind" },
  void_vortex: { id: "void_vortex", name: "Void Vortex", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Wind" },
  maelstrom_trap: { id: "maelstrom_trap", name: "Maelstrom Trap", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Wind" },
  stone_freeze: { id: "stone_freeze", name: "Stone Freeze", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Geo" },
  seismic_shock: { id: "seismic_shock", name: "Seismic Shock", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Geo" },
  verdant_bastion: { id: "verdant_bastion", name: "Verdant Bastion", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Geo" },
  stone_golem: { id: "stone_golem", name: "Stone Golem", power: 0, category: "buff", cooldownMs: 15000, rangeTiles: 0, element: "Geo" },
  crystal_wall: { id: "crystal_wall", name: "Crystal Wall", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Geo" },
  acidic_quake: { id: "acidic_quake", name: "Acidic Quake", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Geo" },
  earth_resonance: { id: "earth_resonance", name: "Earth Resonance", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Geo" },
  runic_pillar: { id: "runic_pillar", name: "Runic Pillar", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Geo" },
  haunted_boulder: { id: "haunted_boulder", name: "Haunted Boulder", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Geo" },
  sunstone: { id: "sunstone", name: "Sunstone", power: 0, category: "buff", cooldownMs: 15000, rangeTiles: 0, element: "Geo" },
  null_earth: { id: "null_earth", name: "Null Earth", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Geo" },
  gravity_well_earth: { id: "gravity_well_earth", name: "Gravity Well Earth", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Geo" },
  icebreaker: { id: "icebreaker", name: "Icebreaker", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Ice" },
  sporefreeze: { id: "sporefreeze", name: "Sporefreeze", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Ice" },
  iceblade: { id: "iceblade", name: "Iceblade", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Ice" },
  crystal_shards: { id: "crystal_shards", name: "Crystal Shards", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Ice" },
  biofreeze: { id: "biofreeze", name: "Biofreeze", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Ice" },
  howling_frost: { id: "howling_frost", name: "Howling Frost", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Ice" },
  magefrost: { id: "magefrost", name: "Magefrost", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Ice" },
  chill_wail: { id: "chill_wail", name: "Chill Wail", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Ice" },
  blinding_snow: { id: "blinding_snow", name: "Blinding Snow", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Ice" },
  abyssal_ice: { id: "abyssal_ice", name: "Abyssal Ice", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Ice" },
  glacial_crash: { id: "glacial_crash", name: "Glacial Crash", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Ice" },
  stormvine: { id: "stormvine", name: "Stormvine", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Electric" },
  electro_field: { id: "electro_field", name: "Electro Field", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Electric" },
  ion_beam: { id: "ion_beam", name: "Ion Beam", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Electric" },
  toxic_spark: { id: "toxic_spark", name: "Toxic Spark", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Electric" },
  thunderwave: { id: "thunderwave", name: "Thunderwave", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Electric" },
  arc_spell: { id: "arc_spell", name: "Arc Spell", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Electric" },
  spirit_bolt: { id: "spirit_bolt", name: "Spirit Bolt", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Electric" },
  lightning_rod: { id: "lightning_rod", name: "Lightning Rod", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Electric" },
  negatron_bolt: { id: "negatron_bolt", name: "Negatron Bolt", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Electric" },
  gravitas_thunder: { id: "gravitas_thunder", name: "Gravitas Thunder", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Electric" },
  bramble_gear: { id: "bramble_gear", name: "Bramble Gear", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Nature" },
  crystal_bloom: { id: "crystal_bloom", name: "Crystal Bloom", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Nature" },
  vine_thorn: { id: "vine_thorn", name: "Vine Thorn", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Nature" },
  sylvan_song: { id: "sylvan_song", name: "Sylvan Song", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Nature" },
  etherbloom: { id: "etherbloom", name: "Etherbloom", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Nature" },
  life_leech: { id: "life_leech", name: "Life Leech", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Nature" },
  sunpetal: { id: "sunpetal", name: "Sunpetal", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Nature" },
  wilt_rot: { id: "wilt_rot", name: "Wilt Rot", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Nature" },
  entangling_mire: { id: "entangling_mire", name: "Entangling Mire", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Nature" },
  mirror_shard: { id: "mirror_shard", name: "Mirror Shard", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Metal" },
  rusted_slash: { id: "rusted_slash", name: "Rusted Slash", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Metal" },
  forged_wrath: { id: "forged_wrath", name: "Forged Wrath", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Metal" },
  arc_laser: { id: "arc_laser", name: "Arc Laser", power: 50, category: "special", cooldownMs: 3000, rangeTiles: 5, element: "Metal" },
  soul_shackle: { id: "soul_shackle", name: "Soul Shackle", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Metal" },
  holy_smite: { id: "holy_smite", name: "Holy Smite", power: 60, category: "physical", cooldownMs: 2000, rangeTiles: 1, element: "Metal" },
};

export function getCombatAbility(abilityId: string): CombatAbility | null {
  if (isForbiddenRtCaptureAbility(abilityId)) return null;
  return COMBAT_ABILITIES[abilityId] ?? null;
}

export {
  attemptCapture,
  rollD20,
  rollD20Advantage,
  getCreatureWillpowerDC,
  getCaptureModifiers,
  type CaptureAttemptOptions,
  type CaptureResult,
} from "./d20Engine";

/**
 * Capture chance helpers for turn-based encounters.
 * Uses native d20 resolution engine (d20 + tamer bonus + tool tier vs creature DC).
 */
export function computeCaptureChance(opts: {
  maxHp: number;
  currentHp: number;
  statusModifier?: number;
  itemModifier?: number;
  baseCatchRate?: number;
}): number {
  const { maxHp, currentHp } = opts;
  const statusModifier = opts.statusModifier ?? 1;
  const itemModifier = opts.itemModifier ?? 1;
  const baseCatchRate = opts.baseCatchRate ?? 1;
  if (maxHp <= 0) return 0;
  return ((maxHp - currentHp) / maxHp) * statusModifier * itemModifier * baseCatchRate * 255;
}

export function rollCaptureSuccess(captureChance: number, rng: () => number = Math.random): boolean {
  const roll = Math.floor(rng() * 256);
  return roll < Math.min(255, Math.max(0, captureChance));
}
