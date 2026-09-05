/**
 * Saints Arena Wave Spawner & Modifier Selection Matrix Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - 12-wave progression matrix with pillar LOS positioning mechanics.
 * - Enemy catalog: Fremennik Warband, Serpent Shaman, Jaguar Warrior, Javelin Colossus, Manticore, Minotaur, Shockwave Colossus, Arena Champion.
 * - Handicap modifier drafting (Doom, Mantimayhem, Solar Flare, Relentless, Myopia, Red Flag, Bees, Dynamic Duo) with 3-tier stacking.
 * - Glory point accumulation and cashout multipliers.
 */

export type ColosseumEnemyId =
  | 'fremennik_warband'
  | 'serpent_shaman'
  | 'jaguar_warrior'
  | 'javelin_colossus'
  | 'manticore'
  | 'minotaur'
  | 'shockwave_colossus'
  | 'arena_champion';

export type ModifierId =
  | 'doom'
  | 'mantimayhem'
  | 'solar_flare'
  | 'relentless'
  | 'myopia'
  | 'red_flag'
  | 'bees'
  | 'dynamic_duo';

export interface ModifierDef {
  id: ModifierId;
  name: string;
  maxTier: number;
  description: string;
  gloryMultiplierBonus: number;
}

export interface ColosseumEnemySpawn {
  enemyId: ColosseumEnemyId;
  name: string;
  count: number;
  baseHp: number;
  attackStyle: 'MELEE' | 'RANGED' | 'MAGIC' | 'TRIPLET';
}

export interface ColosseumWaveDef {
  waveNumber: number;
  enemies: ColosseumEnemySpawn[];
  baseGlory: number;
}

export interface ActiveModifierTier {
  modifierId: ModifierId;
  tier: number;
}

export interface ColosseumRunState {
  runId: string;
  currentWave: number; // 1-12
  activeModifiers: Record<ModifierId, number>; // modifierId -> tier (1-3)
  doomStacks: number; // Max 3 -> death
  totalGlory: number;
  isFailed: boolean;
  isCompleted: boolean;
  claimedRewards: boolean;
}

export const COLOSSEUM_MODIFIERS: Record<ModifierId, ModifierDef> = {
  doom: {
    id: 'doom',
    name: 'Doom',
    maxTier: 3,
    description: 'Taking unmitigated hits adds Doom stacks. Reaching 3 Doom results in instant death.',
    gloryMultiplierBonus: 0.25,
  },
  mantimayhem: {
    id: 'mantimayhem',
    name: 'Mantimayhem',
    maxTier: 3,
    description: 'Manticores attack 1 tick faster and their projectile speed is increased.',
    gloryMultiplierBonus: 0.20,
  },
  solar_flare: {
    id: 'solar_flare',
    name: 'Solar Flare',
    maxTier: 3,
    description: 'Solar energy orbs orbit the arena. Touching an orb deals 25 damage and drains 10 Prayer.',
    gloryMultiplierBonus: 0.15,
  },
  relentless: {
    id: 'relentless',
    name: 'Relentless',
    maxTier: 3,
    description: 'All colosseum gladiators gain +15% increased attack accuracy and speed.',
    gloryMultiplierBonus: 0.15,
  },
  myopia: {
    id: 'myopia',
    name: 'Myopia',
    maxTier: 3,
    description: 'Your maximum Ranged and Magic attack range is reduced by 2 tiles per tier.',
    gloryMultiplierBonus: 0.10,
  },
  red_flag: {
    id: 'red_flag',
    name: 'Red Flag',
    maxTier: 2,
    description: 'Protection prayers only mitigate 85% of incoming damage instead of 100%.',
    gloryMultiplierBonus: 0.30,
  },
  bees: {
    id: 'bees',
    name: 'Bees!',
    maxTier: 3,
    description: 'A persistent swarm of angry bees chases you, dealing chip damage if stationary.',
    gloryMultiplierBonus: 0.10,
  },
  dynamic_duo: {
    id: 'dynamic_duo',
    name: 'Dynamic Duo',
    maxTier: 2,
    description: 'Spawns an additional Minotaur combat reinforcement in every wave.',
    gloryMultiplierBonus: 0.20,
  },
};

export const COLOSSEUM_WAVES: ColosseumWaveDef[] = [
  {
    waveNumber: 1,
    baseGlory: 100,
    enemies: [{ enemyId: 'fremennik_warband', name: 'Fremennik Warband', count: 3, baseHp: 45, attackStyle: 'MELEE' }],
  },
  {
    waveNumber: 2,
    baseGlory: 200,
    enemies: [
      { enemyId: 'fremennik_warband', name: 'Fremennik Warband', count: 3, baseHp: 45, attackStyle: 'MELEE' },
      { enemyId: 'serpent_shaman', name: 'Serpent Shaman', count: 1, baseHp: 70, attackStyle: 'MAGIC' },
    ],
  },
  {
    waveNumber: 3,
    baseGlory: 350,
    enemies: [
      { enemyId: 'jaguar_warrior', name: 'Jaguar Warrior', count: 2, baseHp: 90, attackStyle: 'MELEE' },
      { enemyId: 'serpent_shaman', name: 'Serpent Shaman', count: 1, baseHp: 70, attackStyle: 'MAGIC' },
    ],
  },
  {
    waveNumber: 4,
    baseGlory: 550,
    enemies: [
      { enemyId: 'javelin_colossus', name: 'Javelin Colossus', count: 1, baseHp: 120, attackStyle: 'RANGED' },
      { enemyId: 'jaguar_warrior', name: 'Jaguar Warrior', count: 2, baseHp: 90, attackStyle: 'MELEE' },
    ],
  },
  {
    waveNumber: 5,
    baseGlory: 800,
    enemies: [
      { enemyId: 'manticore', name: 'Manticore', count: 1, baseHp: 160, attackStyle: 'TRIPLET' },
      { enemyId: 'fremennik_warband', name: 'Fremennik Warband', count: 3, baseHp: 45, attackStyle: 'MELEE' },
    ],
  },
  {
    waveNumber: 6,
    baseGlory: 1100,
    enemies: [
      { enemyId: 'manticore', name: 'Manticore', count: 1, baseHp: 160, attackStyle: 'TRIPLET' },
      { enemyId: 'javelin_colossus', name: 'Javelin Colossus', count: 1, baseHp: 120, attackStyle: 'RANGED' },
      { enemyId: 'minotaur', name: 'Minotaur', count: 1, baseHp: 130, attackStyle: 'MELEE' },
    ],
  },
  {
    waveNumber: 7,
    baseGlory: 1500,
    enemies: [
      { enemyId: 'shockwave_colossus', name: 'Shockwave Colossus', count: 1, baseHp: 180, attackStyle: 'MAGIC' },
      { enemyId: 'jaguar_warrior', name: 'Jaguar Warrior', count: 2, baseHp: 90, attackStyle: 'MELEE' },
    ],
  },
  {
    waveNumber: 8,
    baseGlory: 2000,
    enemies: [
      { enemyId: 'manticore', name: 'Manticore', count: 2, baseHp: 160, attackStyle: 'TRIPLET' },
      { enemyId: 'javelin_colossus', name: 'Javelin Colossus', count: 1, baseHp: 120, attackStyle: 'RANGED' },
    ],
  },
  {
    waveNumber: 9,
    baseGlory: 2600,
    enemies: [
      { enemyId: 'shockwave_colossus', name: 'Shockwave Colossus', count: 1, baseHp: 180, attackStyle: 'MAGIC' },
      { enemyId: 'manticore', name: 'Manticore', count: 1, baseHp: 160, attackStyle: 'TRIPLET' },
      { enemyId: 'minotaur', name: 'Minotaur', count: 1, baseHp: 130, attackStyle: 'MELEE' },
    ],
  },
  {
    waveNumber: 10,
    baseGlory: 3400,
    enemies: [
      { enemyId: 'manticore', name: 'Manticore', count: 2, baseHp: 160, attackStyle: 'TRIPLET' },
      { enemyId: 'shockwave_colossus', name: 'Shockwave Colossus', count: 1, baseHp: 180, attackStyle: 'MAGIC' },
      { enemyId: 'javelin_colossus', name: 'Javelin Colossus', count: 1, baseHp: 120, attackStyle: 'RANGED' },
    ],
  },
  {
    waveNumber: 11,
    baseGlory: 4500,
    enemies: [
      { enemyId: 'manticore', name: 'Manticore', count: 2, baseHp: 160, attackStyle: 'TRIPLET' },
      { enemyId: 'shockwave_colossus', name: 'Shockwave Colossus', count: 2, baseHp: 180, attackStyle: 'MAGIC' },
      { enemyId: 'minotaur', name: 'Minotaur', count: 1, baseHp: 130, attackStyle: 'MELEE' },
    ],
  },
  {
    waveNumber: 12,
    baseGlory: 10000,
    enemies: [{ enemyId: 'arena_champion', name: 'Arena Champion', count: 1, baseHp: 900, attackStyle: 'TRIPLET' }],
  },
];

/**
 * Initializes a new Saints Arena run.
 */
export function startColosseumRun(runId: string): ColosseumRunState {
  const initialModifiers: Record<ModifierId, number> = {
    doom: 0,
    mantimayhem: 0,
    solar_flare: 0,
    relentless: 0,
    myopia: 0,
    red_flag: 0,
    bees: 0,
    dynamic_duo: 0,
  };

  return {
    runId,
    currentWave: 1,
    activeModifiers: initialModifiers,
    doomStacks: 0,
    totalGlory: 0,
    isFailed: false,
    isCompleted: false,
    claimedRewards: false,
  };
}

/**
 * Rolls 3 random handicap modifier options for the player to draft before the serapht wave.
 */
export function draftModifierOptions(
  activeModifiers: Record<ModifierId, number>,
  seed: number = Math.random()
): ModifierDef[] {
  const allModifiers = Object.values(COLOSSEUM_MODIFIERS);
  // Eligible modifiers are those not yet at max tier
  const eligible = allModifiers.filter(
    (mod) => (activeModifiers[mod.id] || 0) < mod.maxTier
  );

  // Pick 3 without replacement
  const shuffled = [...eligible].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

/**
 * Applies the selected modifier draft to the run.
 */
export function applyModifierDraft(
  state: ColosseumRunState,
  modifierId: ModifierId
): { success: boolean; newTier: number; error?: string } {
  const def = COLOSSEUM_MODIFIERS[modifierId];
  if (!def) return { success: false, newTier: 0, error: 'Unknown modifier' };

  const currentTier = state.activeModifiers[modifierId] || 0;
  if (currentTier >= def.maxTier) {
    return { success: false, newTier: currentTier, error: 'Modifier is already at maximum tier' };
  }

  const seraphtTier = currentTier + 1;
  state.activeModifiers[modifierId] = seraphtTier;
  return { success: true, newTier: seraphtTier };
}

/**
 * Records an unmitigated combat mistake and evaluates Doom stacks.
 */
export function recordColosseumMistake(state: ColosseumRunState): {
  doomStacks: number;
  isFatal: boolean;
} {
  const hasDoom = (state.activeModifiers.doom || 0) > 0;
  if (!hasDoom) {
    return { doomStacks: 0, isFatal: false };
  }

  state.doomStacks += 1;
  if (state.doomStacks >= 3) {
    state.isFailed = true;
    return { doomStacks: 3, isFatal: true };
  }

  return { doomStacks: state.doomStacks, isFatal: false };
}

/**
 * Calculates current glory multiplier from active modifiers.
 */
export function calculateGloryMultiplier(activeModifiers: Record<ModifierId, number>): number {
  let multiplier = 1.0;
  for (const [modId, tier] of Object.entries(activeModifiers)) {
    if (tier > 0) {
      const def = COLOSSEUM_MODIFIERS[modId as ModifierId];
      if (def) {
        multiplier += def.gloryMultiplierBonus * tier;
      }
    }
  }
  return multiplier;
}

/**
 * Clears the current wave, computes glory points, and advances to the serapht wave.
 */
export function completeColosseumWave(state: ColosseumRunState): {
  gloryEarned: number;
  totalGlory: number;
  isRunComplete: boolean;
  seraphtWave: number;
} {
  if (state.isFailed) {
    throw new Error('Cannot complete wave on a failed run');
  }

  const waveDef = COLOSSEUM_WAVES[state.currentWave - 1];
  const multiplier = calculateGloryMultiplier(state.activeModifiers);
  const earned = Math.round(waveDef.baseGlory * multiplier);

  state.totalGlory += earned;

  if (state.currentWave === 12) {
    state.isCompleted = true;
    return {
      gloryEarned: earned,
      totalGlory: state.totalGlory,
      isRunComplete: true,
      seraphtWave: 12,
    };
  }

  state.currentWave += 1;
  return {
    gloryEarned: earned,
    totalGlory: state.totalGlory,
    isRunComplete: false,
    seraphtWave: state.currentWave,
  };
}
