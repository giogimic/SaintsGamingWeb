/**
 * Saints Gaming — Prayer Blessing & Protection Overhead Aura Engine (Bible 10)
 * Evaluates active prayers, mutual exclusivity rules, drain rates with equipment bonuses, and overhead icon rendering.
 */

export type PrayerGroup = 'STAT_BUFF' | 'OVERHEAD_PROTECTION' | 'UTILITY';

export type OverheadIcon =
  | 'PROTECT_FROM_MELEE'
  | 'PROTECT_FROM_MISSILES'
  | 'PROTECT_FROM_MAGIC'
  | 'RETRIBUTION'
  | 'REDEMPTION'
  | 'SMITE';

export interface PrayerDefinition {
  id: string;
  name: string;
  reqPrayerLevel: number;
  drainUnitsPerSec: number; // Baseline drain speed
  group: PrayerGroup;
  overheadIcon?: OverheadIcon;
  atkMultiplier?: number;
  strMultiplier?: number;
  defMultiplier?: number;
}

export const CANONICAL_PRAYERS: Record<string, PrayerDefinition> = {
  thick_skin: {
    id: 'thick_skin',
    name: 'Thick Skin',
    reqPrayerLevel: 1,
    drainUnitsPerSec: 0.1,
    group: 'STAT_BUFF',
    defMultiplier: 1.05, // +5% Defence
  },
  burst_of_strength: {
    id: 'burst_of_strength',
    name: 'Burst of Strength',
    reqPrayerLevel: 4,
    drainUnitsPerSec: 0.1,
    group: 'STAT_BUFF',
    strMultiplier: 1.05, // +5% Strength
  },
  clarity_of_thought: {
    id: 'clarity_of_thought',
    name: 'Clarity of Thought',
    reqPrayerLevel: 7,
    drainUnitsPerSec: 0.1,
    group: 'STAT_BUFF',
    atkMultiplier: 1.05, // +5% Attack
  },
  protect_from_magic: {
    id: 'protect_from_magic',
    name: 'Protect from Magic',
    reqPrayerLevel: 37,
    drainUnitsPerSec: 0.33,
    group: 'OVERHEAD_PROTECTION',
    overheadIcon: 'PROTECT_FROM_MAGIC',
  },
  protect_from_missiles: {
    id: 'protect_from_missiles',
    name: 'Protect from Missiles',
    reqPrayerLevel: 40,
    drainUnitsPerSec: 0.33,
    group: 'OVERHEAD_PROTECTION',
    overheadIcon: 'PROTECT_FROM_MISSILES',
  },
  protect_from_melee: {
    id: 'protect_from_melee',
    name: 'Protect from Melee',
    reqPrayerLevel: 43,
    drainUnitsPerSec: 0.33,
    group: 'OVERHEAD_PROTECTION',
    overheadIcon: 'PROTECT_FROM_MELEE',
  },
  ultimate_strength: {
    id: 'ultimate_strength',
    name: 'Ultimate Strength',
    reqPrayerLevel: 31,
    drainUnitsPerSec: 0.33,
    group: 'STAT_BUFF',
    strMultiplier: 1.15, // +15% Strength
  },
};

export interface PlayerPrayerState {
  currentPrayerPoints: number;
  maxPrayerPoints: number;
  activePrayerIds: string[];
  overheadIcon?: OverheadIcon;
}

/**
 * Creates a default prayer state for a player.
 */
export function createPlayerPrayerState(prayerLevel: number): PlayerPrayerState {
  return {
    currentPrayerPoints: prayerLevel,
    maxPrayerPoints: prayerLevel,
    activePrayerIds: [],
    overheadIcon: undefined,
  };
}

/**
 * Toggles an active prayer on/off, enforcing mutual exclusivity rules and level requirements.
 */
export function togglePrayer(
  state: PlayerPrayerState,
  prayerId: string,
  playerPrayerLevel: number
): { success: boolean; active: boolean; reason?: string } {
  const def = CANONICAL_PRAYERS[prayerId];
  if (!def) {
    return { success: false, active: false, reason: 'Unknown prayer.' };
  }

  if (playerPrayerLevel < def.reqPrayerLevel) {
    return {
      success: false,
      active: false,
      reason: `Requires Prayer level ${def.reqPrayerLevel} (Current: ${playerPrayerLevel})`,
    };
  }

  if (state.currentPrayerPoints <= 0) {
    return { success: false, active: false, reason: 'You have no prayer points remaining.' };
  }

  const isAlreadyActive = state.activePrayerIds.includes(prayerId);

  if (isAlreadyActive) {
    // Turn off
    state.activePrayerIds = state.activePrayerIds.filter((id) => id !== prayerId);
    if (def.overheadIcon && state.overheadIcon === def.overheadIcon) {
      state.overheadIcon = undefined;
    }
    return { success: true, active: false };
  }

  // Turn on: Enforce mutual exclusivity
  if (def.group === 'OVERHEAD_PROTECTION') {
    // Deactivate any other overhead prayer
    state.activePrayerIds = state.activePrayerIds.filter(
      (id) => CANONICAL_PRAYERS[id]?.group !== 'OVERHEAD_PROTECTION'
    );
    state.overheadIcon = def.overheadIcon;
  }

  state.activePrayerIds.push(prayerId);
  return { success: true, active: true };
}

/**
 * Applies a drain tick to active prayers based on elapsed time and equipment prayer bonus.
 */
export function drainPrayerTick(
  state: PlayerPrayerState,
  elapsedSec: number,
  equipmentPrayerBonus: number = 0
): { currentPoints: number; prayersDischarged: boolean } {
  if (state.activePrayerIds.length === 0 || state.currentPrayerPoints <= 0) {
    return { currentPoints: state.currentPrayerPoints, prayersDischarged: false };
  }

  let totalDrainRate = 0;
  for (const id of state.activePrayerIds) {
    const def = CANONICAL_PRAYERS[id];
    if (def) {
      totalDrainRate += def.drainUnitsPerSec;
    }
  }

  // Equipment prayer bonus formula: Resistance = 1 + (bonus / 30)
  const resistance = 1 + Math.max(0, equipmentPrayerBonus) / 30;
  const effectiveDrain = (totalDrainRate * elapsedSec) / resistance;

  state.currentPrayerPoints = Math.max(0, state.currentPrayerPoints - effectiveDrain);

  if (state.currentPrayerPoints === 0) {
    // Discharge all prayers when points hit 0
    state.activePrayerIds = [];
    state.overheadIcon = undefined;
    return { currentPoints: 0, prayersDischarged: true };
  }

  return { currentPoints: state.currentPrayerPoints, prayersDischarged: false };
}
