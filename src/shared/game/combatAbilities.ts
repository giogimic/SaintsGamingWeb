/**
 * Real-time MMO ability catalog (bible 02 + 07).
 * Capture tools are forbidden here — capture is turn-based only (bible 07 §5, 11).
 */

export type AbilityCategory = "physical" | "special" | "utility" | "heal" | "buff";

export type CombatAbility = {
  id: string;
  name: string;
  power: number;
  category: AbilityCategory;
  cooldownMs: number;
  rangeTiles: number;
};

/** Ability ids that must never appear on the RT hotbar or be accepted by CombatManager. */
export const FORBIDDEN_RT_CAPTURE_ABILITIES = [
  "capture",
  "capture_device",
  "binding_crystal",
  "capture_script",
  "throw_ball",
  "pokeball",
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

const ABILITIES: Record<string, CombatAbility> = {
  strike: { id: "strike", name: "Strike", power: 40, category: "physical", cooldownMs: 1500, rangeTiles: 1 },
  cleave: { id: "cleave", name: "Cleave", power: 55, category: "physical", cooldownMs: 4000, rangeTiles: 1 },
  dash: { id: "dash", name: "Dash", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 3 },
  shout: { id: "shout", name: "War Cry", power: 0, category: "buff", cooldownMs: 12000, rangeTiles: 0 },
  fireball: { id: "fireball", name: "Fireball", power: 50, category: "special", cooldownMs: 2000, rangeTiles: 6 },
  frost: { id: "frost", name: "Frost Nova", power: 45, category: "special", cooldownMs: 6000, rangeTiles: 3 },
  blink: { id: "blink", name: "Blink", power: 0, category: "utility", cooldownMs: 8000, rangeTiles: 0 },
  shield: { id: "shield", name: "Mana Shield", power: 0, category: "buff", cooldownMs: 15000, rangeTiles: 0 },
  shoot: { id: "shoot", name: "Shoot", power: 35, category: "physical", cooldownMs: 1200, rangeTiles: 7 },
  multishot: { id: "multishot", name: "Volley", power: 30, category: "physical", cooldownMs: 5000, rangeTiles: 7 },
  trap: { id: "trap", name: "Snare", power: 10, category: "utility", cooldownMs: 10000, rangeTiles: 5 },
  heal: { id: "heal", name: "Bandage", power: 0, category: "heal", cooldownMs: 20000, rangeTiles: 0 },
};

export function getCombatAbility(abilityId: string): CombatAbility | null {
  if (isForbiddenRtCaptureAbility(abilityId)) return null;
  return ABILITIES[abilityId] ?? null;
}

/** Capture chance helpers for turn-based encounters (bible 11). */
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
