/**
 * Telos: Special Attacks, Hold Still, Tendril DPS Check & Anima Bomb Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - "Hold still, invader!" crush slam with Resonance heal / Barricade mitigate and Freedom stun breaks.
 * - Grasping Anima Tendrils: Rooted player bleed and burst DPS check threshold to break free.
 * - "Soaria" Anima Bomb font shield absorption vs lethal unmitigated blast.
 */

export interface HoldStillResult {
  isMitigated: boolean;
  damageTaken: number;
  healedAmount: number;
  isStunned: boolean;
}

export interface TendrilState {
  isActive: boolean;
  dpsThresholdRequired: number;
  damageDealtByPlayer: number;
  ticksRemaining: number;
  isBroken: boolean;
}

/**
 * Resolves the "Hold still, invader!" heavy crush slam.
 */
export function resolveHoldStill(
  enrage: number,
  defensiveAbility: 'RESONANCE' | 'BARRICADE' | 'REFLECT' | 'NONE',
  hasStunImmunity: boolean = false
): HoldStillResult {
  const enrageScale = 1 + (enrage / 100) * 0.50;
  const rawDamage = Math.round(5000 * enrageScale);

  if (defensiveAbility === 'RESONANCE') {
    return { isMitigated: true, damageTaken: 0, healedAmount: rawDamage, isStunned: false };
  }

  if (defensiveAbility === 'BARRICADE') {
    return { isMitigated: true, damageTaken: 0, healedAmount: 0, isStunned: false };
  }

  if (defensiveAbility === 'REFLECT') {
    return {
      isMitigated: true,
      damageTaken: Math.round(rawDamage * 0.5),
      healedAmount: 0,
      isStunned: !hasStunImmunity,
    };
  }

  return {
    isMitigated: false,
    damageTaken: rawDamage,
    healedAmount: 0,
    isStunned: !hasStunImmunity,
  };
}

/**
 * Initializes a Tendril Root DPS check scaled with Enrage.
 */
export function initializeTendrilCheck(enrage: number): TendrilState {
  const threshold = Math.round(15000 * (1 + (enrage / 100) * 0.25));
  return {
    isActive: true,
    dpsThresholdRequired: threshold,
    damageDealtByPlayer: 0,
    ticksRemaining: 6,
    isBroken: false,
  };
}

/**
 * Applies burst damage to break the Tendril Root.
 */
export function applyDamageToTendrils(
  state: TendrilState,
  burstDamage: number
): { isBroken: boolean; damageRemaining: number } {
  if (!state.isActive || state.isBroken) {
    return { isBroken: true, damageRemaining: 0 };
  }

  state.damageDealtByPlayer += burstDamage;
  if (state.damageDealtByPlayer >= state.dpsThresholdRequired) {
    state.isBroken = true;
    state.isActive = false;
    return { isBroken: true, damageRemaining: 0 };
  }

  const remaining = state.dpsThresholdRequired - state.damageDealtByPlayer;
  return { isBroken: false, damageRemaining: remaining };
}

/**
 * Resolves Anima Bomb detonation.
 */
export function resolveAnimaBomb(
  enrage: number,
  playerInsideFont: boolean,
  fontIsCharged: boolean
): { absorbed: boolean; damageDealt: number } {
  if (playerInsideFont && fontIsCharged) {
    return { absorbed: true, damageDealt: 0 };
  }

  const enrageScale = 1 + (enrage / 100) * 0.50;
  const lethalDamage = Math.round(12000 * enrageScale);
  return { absorbed: false, damageDealt: lethalDamage };
}
