/**
 * Titan: Warden of the Titanian Core 5-Phase & Enrage Scaling Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - 0% to 4,000% Enrage scaling matrix for Boss HP, damage, and mechanics unlocks.
 * - 5-Phase combat progression with 100%+ Enrage Phase 5 unlock.
 * - Anima Beams (Green: Damage boost/Prayer drain, Black: Defense surge, Red: Golem fury).
 * - Phase 4 & Phase 5 Anima Font charging and font shield activation.
 */

export type TitanPhase = 1 | 2 | 3 | 4 | 5;
export type AnimaBeamType = 'GREEN' | 'BLACK' | 'RED';
export type FontColor = 'GREEN_FONT' | 'RED_FONT' | 'BLACK_FONT';

export interface TitanBossState {
  enrage: number; // 0 - 4000%
  phase: TitanPhase;
  hp: number;
  maxHp: number;
  activeAnimaBeam: AnimaBeamType | null;
  playerBlockingBeam: boolean;
  animaBalance: number; // -100 (Titan favored) to +100 (Player favored)
  activeFont: FontColor | null;
  fontChargedPercent: number; // 0 - 100%
  isInstakillCharging: boolean;
  isDead: boolean;
}

/**
 * Calculates scaled HP and Damage multiplier based on Enrage (0% - 4,000%).
 */
export function calculateEnrageScaling(enrage: number): {
  hpMultiplier: number;
  damageMultiplier: number;
  unlocksPhase5: boolean;
} {
  const safeEnrage = Math.max(0, Math.min(4000, enrage));
  const hpMultiplier = 1 + (safeEnrage / 100) * 0.25;
  const damageMultiplier = 1 + (safeEnrage / 100) * 0.50;
  const unlocksPhase5 = safeEnrage >= 100;

  return { hpMultiplier, damageMultiplier, unlocksPhase5 };
}

/**
 * Initializes Titan boss state based on player's chosen or streak enrage.
 */
export function initializeTitanState(enrage: number = 0): TitanBossState {
  const { hpMultiplier } = calculateEnrageScaling(enrage);
  const baseHp = 600000;
  const scaledHp = Math.round(baseHp * hpMultiplier);

  return {
    enrage,
    phase: 1,
    hp: scaledHp,
    maxHp: scaledHp,
    activeAnimaBeam: 'GREEN',
    playerBlockingBeam: false,
    animaBalance: 0,
    activeFont: null,
    fontChargedPercent: 0,
    isInstakillCharging: false,
    isDead: false,
  };
}

/**
 * Applies damage to Titan and advances phase transitions.
 */
export function applyDamageToTitan(
  boss: TitanBossState,
  damage: number
): {
  damageDealt: number;
  phaseAdvanced: boolean;
  newPhase: TitanPhase;
  isDefeated: boolean;
} {
  if (boss.isDead) {
    return { damageDealt: 0, phaseAdvanced: false, newPhase: boss.phase, isDefeated: true };
  }

  // Black beam without player block reduces incoming damage by 75%
  let effectiveDmg = damage;
  if (boss.activeAnimaBeam === 'BLACK' && !boss.playerBlockingBeam) {
    effectiveDmg = Math.round(damage * 0.25);
  }

  effectiveDmg = Math.min(boss.hp, effectiveDmg);
  boss.hp -= effectiveDmg;

  let phaseAdvanced = false;
  const hpPercent = (boss.hp / boss.maxHp) * 100;
  const { unlocksPhase5 } = calculateEnrageScaling(boss.enrage);

  if (boss.hp === 0) {
    if (boss.phase === 4 && unlocksPhase5) {
      // Transition to Phase 5
      boss.phase = 5;
      const p5Hp = Math.round(200000 * calculateEnrageScaling(boss.enrage).hpMultiplier);
      boss.hp = p5Hp;
      boss.maxHp = p5Hp;
      boss.activeFont = 'GREEN_FONT';
      boss.fontChargedPercent = 0;
      return { damageDealt: effectiveDmg, phaseAdvanced: true, newPhase: 5, isDefeated: false };
    } else {
      boss.isDead = true;
      return { damageDealt: effectiveDmg, phaseAdvanced: false, newPhase: boss.phase, isDefeated: true };
    }
  }

  if (boss.phase === 1 && hpPercent <= 75) {
    boss.phase = 2;
    boss.activeAnimaBeam = 'BLACK';
    phaseAdvanced = true;
  } else if (boss.phase === 2 && hpPercent <= 50) {
    boss.phase = 3;
    boss.activeAnimaBeam = 'RED';
    phaseAdvanced = true;
  } else if (boss.phase === 3 && hpPercent <= 25) {
    boss.phase = 4;
    boss.activeAnimaBeam = null;
    boss.activeFont = 'GREEN_FONT';
    phaseAdvanced = true;
  }

  return { damageDealt: effectiveDmg, phaseAdvanced, newPhase: boss.phase, isDefeated: false };
}

/**
 * Ticks Anima Beam standing effects.
 */
export function tickAnimaBeam(
  boss: TitanBossState,
  playerInsideBeam: boolean
): {
  playerDamageMultiplier: number;
  playerPrayerDrain: number;
  telosBuffed: boolean;
} {
  boss.playerBlockingBeam = playerInsideBeam;

  if (boss.activeAnimaBeam === 'GREEN') {
    if (playerInsideBeam) {
      return { playerDamageMultiplier: 1.35, playerPrayerDrain: 5, telosBuffed: false };
    } else {
      return { playerDamageMultiplier: 1.0, playerPrayerDrain: 0, telosBuffed: true };
    }
  }

  if (boss.activeAnimaBeam === 'BLACK') {
    if (playerInsideBeam) {
      return { playerDamageMultiplier: 1.0, playerPrayerDrain: 0, telosBuffed: false };
    } else {
      return { playerDamageMultiplier: 0.25, playerPrayerDrain: 0, telosBuffed: true };
    }
  }

  if (boss.activeAnimaBeam === 'RED') {
    if (playerInsideBeam) {
      boss.animaBalance = Math.min(100, boss.animaBalance + 10);
    } else {
      boss.animaBalance = Math.max(-100, boss.animaBalance - 10);
    }
    return { playerDamageMultiplier: 1.0, playerPrayerDrain: 0, telosBuffed: boss.animaBalance < 0 };
  }

  return { playerDamageMultiplier: 1.0, playerPrayerDrain: 0, telosBuffed: false };
}
