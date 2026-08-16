/**
 * Saints Gaming — Creature Evolution Branch & Milestone Metamorphosis Engine (Bible 12)
 * Evaluates creature evolution branches, level thresholds, elemental stones, friendship affinity, and stat scaling.
 */

export type EvolutionTrigger = 'LEVEL_UP' | 'ITEM_STONE' | 'FRIENDSHIP_MAX' | 'LOCATION_BIOME';

export interface EvolutionBranch {
  targetSpeciesId: string;
  targetSpeciesName: string;
  trigger: EvolutionTrigger;
  minLevel?: number;
  reqItemId?: string;
  minFriendship?: number; // 0 to 255
  reqBiome?: string;
  baseStatMultiplier: number;
}

export const CANONICAL_EVOLUTIONS: Record<string, EvolutionBranch[]> = {
  creature_spark_mouse: [
    {
      targetSpeciesId: 'creature_thunder_raichu',
      targetSpeciesName: 'Thunder Raichu',
      trigger: 'ITEM_STONE',
      reqItemId: 'item_thunder_stone',
      baseStatMultiplier: 1.4,
    },
  ],
  creature_flame_lizard: [
    {
      targetSpeciesId: 'creature_inferno_dragon',
      targetSpeciesName: 'Inferno Dragon',
      trigger: 'LEVEL_UP',
      minLevel: 36,
      baseStatMultiplier: 1.5,
    },
  ],
  creature_aqua_turtle: [
    {
      targetSpeciesId: 'creature_tidal_blastoise',
      targetSpeciesName: 'Tidal Blastoise',
      trigger: 'LEVEL_UP',
      minLevel: 36,
      baseStatMultiplier: 1.5,
    },
  ],
  creature_saints_fox: [
    {
      targetSpeciesId: 'creature_saints_flareon',
      targetSpeciesName: 'Saints Flareon',
      trigger: 'ITEM_STONE',
      reqItemId: 'item_fire_stone',
      baseStatMultiplier: 1.35,
    },
    {
      targetSpeciesId: 'creature_saints_vaporeon',
      targetSpeciesName: 'Saints Vaporeon',
      trigger: 'ITEM_STONE',
      reqItemId: 'item_water_stone',
      baseStatMultiplier: 1.35,
    },
    {
      targetSpeciesId: 'creature_saints_espeon',
      targetSpeciesName: 'Saints Espeon',
      trigger: 'FRIENDSHIP_MAX',
      minFriendship: 220,
      reqBiome: 'SANCTUARY',
      baseStatMultiplier: 1.35,
    },
  ],
};

export interface CreatureState {
  id: string;
  speciesId: string;
  level: number;
  friendship: number; // 0 to 255
  stats: {
    hp: number;
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
}

/**
 * Checks whether a creature meets the criteria to evolve.
 */
export function evaluateEvolution(
  speciesId: string,
  currentLevel: number,
  usedItemId?: string,
  currentFriendship: number = 0,
  currentBiome?: string
): {
  canEvolve: boolean;
  branch?: EvolutionBranch;
  reason?: string;
} {
  const branches = CANONICAL_EVOLUTIONS[speciesId];
  if (!branches || branches.length === 0) {
    return { canEvolve: false, reason: 'This creature has no known evolutionary branches.' };
  }

  for (const branch of branches) {
    if (branch.trigger === 'LEVEL_UP') {
      if (currentLevel >= (branch.minLevel ?? 1)) {
        return { canEvolve: true, branch };
      }
    } else if (branch.trigger === 'ITEM_STONE') {
      if (usedItemId && usedItemId === branch.reqItemId) {
        return { canEvolve: true, branch };
      }
    } else if (branch.trigger === 'FRIENDSHIP_MAX') {
      const friendshipOk = currentFriendship >= (branch.minFriendship ?? 220);
      const biomeOk = !branch.reqBiome || branch.reqBiome === currentBiome;
      if (friendshipOk && biomeOk) {
        return { canEvolve: true, branch };
      }
    }
  }

  return { canEvolve: false, reason: 'Evolution requirements not met.' };
}

/**
 * Applies evolution to a creature, upgrading its species and scaling its combat stats.
 */
export function applyEvolution(
  creature: CreatureState,
  branch: EvolutionBranch
): {
  success: boolean;
  previousSpeciesId: string;
  newSpeciesId: string;
  upgradedStats: CreatureState['stats'];
} {
  const prevSpecies = creature.speciesId;
  creature.speciesId = branch.targetSpeciesId;

  // Scale stats by multiplier
  creature.stats = {
    hp: Math.round(creature.stats.hp * branch.baseStatMultiplier),
    atk: Math.round(creature.stats.atk * branch.baseStatMultiplier),
    def: Math.round(creature.stats.def * branch.baseStatMultiplier),
    spAtk: Math.round(creature.stats.spAtk * branch.baseStatMultiplier),
    spDef: Math.round(creature.stats.spDef * branch.baseStatMultiplier),
    speed: Math.round(creature.stats.speed * branch.baseStatMultiplier),
  };

  return {
    success: true,
    previousSpeciesId: prevSpecies,
    newSpeciesId: branch.targetSpeciesId,
    upgradedStats: creature.stats,
  };
}
