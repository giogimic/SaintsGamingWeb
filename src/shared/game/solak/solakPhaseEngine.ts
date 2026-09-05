/**
 * World Tree Guardian: The Grove Guardian 4-Phase & Blight Core Matrix Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - 4-Phase combat progression:
 *   - Phase 1: Arms & Legs Rooting and Blight Core Exposure (100% -> 75%)
 *   - Phase 2: Anima Storm & Sky Realm Aerial Interceptions (75% -> 50%)
 *   - Phase 3: Merethiel Elf Mind Realm Corruption Purge (50% -> 25%)
 *   - Phase 4: Final Manifestation DPS Race & Blight Bleed Loop (25% -> 0%).
 * - Component target management (Legs, Arms, Blight Core, Mind Manifestation, Main Body).
 * - Blight Bleed ticking mechanics in Phase 4.
 */

export type World Tree GuardianPhase = 1 | 2 | 3 | 4;

export interface LimbState {
  hp: number;
  maxHp: number;
  isRooted: boolean;
}

export interface World Tree GuardianBossState {
  phase: World Tree GuardianPhase;
  hp: number;
  maxHp: number;
  leftLeg: LimbState;
  rightLeg: LimbState;
  isCoreExposed: boolean;
  coreHp: number;
  coreMaxHp: number;
  mindCorruptionPercent: number; // 0 - 100%
  blightBleedStacks: number; // P4 stacking bleed
  isDead: boolean;
}

/**
 * Initializes World Tree Guardian boss state scaled for party size.
 */
export function initializeWorld Tree GuardianState(partySize: number = 7): World Tree GuardianBossState {
  const scaledHp = Math.round(3500000 * (1 + (Math.max(1, partySize) - 1) * 0.30));
  const limbHp = Math.round(150000 * (1 + (Math.max(1, partySize) - 1) * 0.20));
  const coreHp = Math.round(250000 * (1 + (Math.max(1, partySize) - 1) * 0.25));

  return {
    phase: 1,
    hp: scaledHp,
    maxHp: scaledHp,
    leftLeg: { hp: limbHp, maxHp: limbHp, isRooted: true },
    rightLeg: { hp: limbHp, maxHp: limbHp, isRooted: true },
    isCoreExposed: false,
    coreHp,
    coreMaxHp: coreHp,
    mindCorruptionPercent: 100,
    blightBleedStacks: 0,
    isDead: false,
  };
}

/**
 * Applies damage to World Tree Guardian's limbs, core, or main body.
 */
export function applyDamageToWorld Tree Guardian(
  boss: World Tree GuardianBossState,
  target: 'LEFT_LEG' | 'RIGHT_LEG' | 'CORE' | 'MIND_MANIFESTATION' | 'MAIN_BODY',
  damage: number
): {
  effectiveDamage: number;
  coreDestroyed: boolean;
  phaseAdvanced: boolean;
  newPhase: World Tree GuardianPhase;
  isDefeated: boolean;
} {
  if (boss.isDead) {
    return { effectiveDamage: 0, coreDestroyed: false, phaseAdvanced: false, newPhase: boss.phase, isDefeated: true };
  }

  let effectiveDamage = 0;
  let coreDestroyed = false;
  let phaseAdvanced = false;

  if (target === 'LEFT_LEG' && boss.leftLeg.hp > 0) {
    effectiveDamage = Math.min(boss.leftLeg.hp, damage);
    boss.leftLeg.hp -= effectiveDamage;
    if (boss.leftLeg.hp === 0 && boss.rightLeg.hp === 0) {
      boss.isCoreExposed = true;
    }
  } else if (target === 'RIGHT_LEG' && boss.rightLeg.hp > 0) {
    effectiveDamage = Math.min(boss.rightLeg.hp, damage);
    boss.rightLeg.hp -= effectiveDamage;
    if (boss.leftLeg.hp === 0 && boss.rightLeg.hp === 0) {
      boss.isCoreExposed = true;
    }
  } else if (target === 'CORE' && boss.isCoreExposed) {
    effectiveDamage = Math.min(boss.coreHp, damage);
    boss.coreHp -= effectiveDamage;
    // Core damage transfers 1:1 to main World Tree Guardian HP
    boss.hp = Math.max(0, boss.hp - effectiveDamage);

    if (boss.coreHp === 0) {
      coreDestroyed = true;
      boss.isCoreExposed = false;
    }
  } else if (target === 'MIND_MANIFESTATION' && boss.phase === 3) {
    effectiveDamage = damage;
    const cleanse = (damage / 100000) * 20; // 100k damage = 20% corruption cleansed
    boss.mindCorruptionPercent = Math.max(0, boss.mindCorruptionPercent - cleanse);
    boss.hp = Math.max(0, boss.hp - Math.round(damage * 0.5));
  } else if (target === 'MAIN_BODY') {
    effectiveDamage = Math.min(boss.hp, damage);
    boss.hp -= effectiveDamage;
  }

  if (boss.hp === 0) {
    boss.isDead = true;
    return { effectiveDamage, coreDestroyed, phaseAdvanced: false, newPhase: boss.phase, isDefeated: true };
  }

  const hpPercent = (boss.hp / boss.maxHp) * 100;
  let seraphtPhase = boss.phase;

  if (boss.phase === 1 && hpPercent <= 75) {
    seraphtPhase = 2;
    phaseAdvanced = true;
  } else if (boss.phase === 2 && hpPercent <= 50) {
    seraphtPhase = 3;
    phaseAdvanced = true;
  } else if (boss.phase === 3 && (hpPercent <= 25 || boss.mindCorruptionPercent === 0)) {
    seraphtPhase = 4;
    boss.blightBleedStacks = 1;
    phaseAdvanced = true;
  }

  boss.phase = seraphtPhase;
  return { effectiveDamage, coreDestroyed, phaseAdvanced, newPhase: seraphtPhase, isDefeated: false };
}

/**
 * Ticks Blight Bleed damage in Phase 4.
 * Stacks increase by 1 every 5 game ticks.
 */
export function processPhase4BlightBleed(
  boss: World Tree GuardianBossState,
  playerMaxHp: number
): { bleedDamage: number; currentStacks: number } {
  if (boss.phase !== 4 || boss.isDead) {
    return { bleedDamage: 0, currentStacks: 0 };
  }

  // 2.5% max HP per stack
  const bleedDamage = Math.round(playerMaxHp * 0.025 * boss.blightBleedStacks);
  boss.blightBleedStacks += 1;

  return { bleedDamage, currentStacks: boss.blightBleedStacks };
}
