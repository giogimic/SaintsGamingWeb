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
  strike: { id: "strike", name: "Strike", power: 40, category: "physical", cooldownMs: 1500, rangeTiles: 1, element: "None" },
  cleave: { id: "cleave", name: "Cleave", power: 55, category: "physical", cooldownMs: 4000, rangeTiles: 1, element: "None" },
  dash: { id: "dash", name: "Dash", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 3, element: "None" },
  shout: { id: "shout", name: "War Cry", power: 0, category: "buff", cooldownMs: 12000, rangeTiles: 0, element: "None" },
  fireball: { id: "fireball", name: "Fireball", power: 50, category: "special", cooldownMs: 2000, rangeTiles: 6, element: "Solar" },
  frost: { id: "frost", name: "Frost Nova", power: 45, category: "special", cooldownMs: 6000, rangeTiles: 3, element: "Cryo" },
  blink: { id: "blink", name: "Blink", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0, element: "Cyber" },
  shield: { id: "shield", name: "Mana Shield", power: 0, category: "buff", cooldownMs: 15000, rangeTiles: 0, element: "Volt" },
  shoot: { id: "shoot", name: "Shoot", power: 35, category: "physical", cooldownMs: 1200, rangeTiles: 7, element: "None" },
  multishot: { id: "multishot", name: "Volley", power: 30, category: "physical", cooldownMs: 5000, rangeTiles: 7, element: "None" },
  trap: { id: "trap", name: "Snare", power: 10, category: "utility", cooldownMs: 10000, rangeTiles: 5, element: "Geo" },
  heal: { id: "heal", name: "Bandage", power: 0, category: "heal", cooldownMs: 20000, rangeTiles: 0, element: "Bio" },
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
