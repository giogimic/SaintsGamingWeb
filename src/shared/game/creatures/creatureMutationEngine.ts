/**
 * Saints Gaming — Pet Gene Mutations, Evolutionary Branching & Elemental Affinity Matrix Engine (Bible 11-13)
 * Manages branching evolutionary trees, rare genetic allele mutations, and elemental weather resonance.
 */

export type Element =
  | 'FIRE'
  | 'WATER'
  | 'GRASS'
  | 'ELECTRIC'
  | 'EARTH'
  | 'WIND'
  | 'LIGHT'
  | 'SHADOW';

export type WeatherCondition =
  | 'CLEAR'
  | 'SUNNY'
  | 'RAIN'
  | 'THUNDERSTORM'
  | 'SNOW'
  | 'SANDSTORM'
  | 'FOG'
  | 'ECLIPSE';

export interface MutationTrait {
  id: string;
  name: string;
  statModifiers: {
    hpMultiplier: number;
    attackMultiplier: number;
    defenseMultiplier: number;
    speedMultiplier: number;
  };
  scaleModifier: number;
  hueShiftDegrees: number;
  passiveEffect?: string;
}

export const RARE_MUTATIONS: Record<string, MutationTrait> = {
  MUTATION_ALBINO: {
    id: 'MUTATION_ALBINO',
    name: 'Albino Radiant',
    statModifiers: { hpMultiplier: 1.05, attackMultiplier: 1.05, defenseMultiplier: 1.05, speedMultiplier: 1.05 },
    scaleModifier: 0.95,
    hueShiftDegrees: 180,
    passiveEffect: 'Glint Aura: +5% critical strike chance',
  },
  MUTATION_SHADOW_TOUCHED: {
    id: 'MUTATION_SHADOW_TOUCHED',
    name: 'Shadow Touched',
    statModifiers: { hpMultiplier: 0.95, attackMultiplier: 1.2, defenseMultiplier: 0.9, speedMultiplier: 1.15 },
    scaleModifier: 1.05,
    hueShiftDegrees: 270,
    passiveEffect: 'Shadow Veil: 10% chance to evade physical attacks',
  },
  MUTATION_TITAN_SIZE: {
    id: 'MUTATION_TITAN_SIZE',
    name: 'Titan Colossus',
    statModifiers: { hpMultiplier: 1.35, attackMultiplier: 1.1, defenseMultiplier: 1.2, speedMultiplier: 0.8 },
    scaleModifier: 1.4,
    hueShiftDegrees: 0,
    passiveEffect: 'Colossal Fortitude: Immune to knockback and stun',
  },
  MUTATION_CELESTIAL_AURA: {
    id: 'MUTATION_CELESTIAL_AURA',
    name: 'Celestial Luminary',
    statModifiers: { hpMultiplier: 1.1, attackMultiplier: 1.1, defenseMultiplier: 1.1, speedMultiplier: 1.1 },
    scaleModifier: 1.1,
    hueShiftDegrees: 90,
    passiveEffect: 'Starfall Luminescence: Periodic area healing pulse to owner',
  },
};

export interface EvolutionBranch {
  targetSpeciesId: string;
  targetSpeciesName: string;
  requiredItem?: string;
  minLoyalty?: number;
  minLevel?: number;
  timeOfDay?: 'DAY' | 'NIGHT';
  requiredBiome?: string;
}

export class CreatureMutationEngine {
  /**
   * Evaluates if a newborn or tamed creature rolls a rare genetic mutation (1% base chance).
   */
  public rollGeneticMutation(forcedRoll?: number): MutationTrait | null {
    const roll = forcedRoll !== undefined ? forcedRoll : Math.random();
    // 1% chance (roll < 0.01)
    if (roll >= 0.01) return null;

    const traitKeys = Object.keys(RARE_MUTATIONS);
    const selectedKey = traitKeys[Math.floor(Math.random() * traitKeys.length)];
    return { ...RARE_MUTATIONS[selectedKey] };
  }

  /**
   * Evaluates branching evolution conditions to determine valid evolutionary paths.
   */
  public evaluateBranchingEvolution(
    creature: { level: number; loyalty: number; currentSpeciesId: string },
    branches: EvolutionBranch[],
    context: { itemUsed?: string; isNight?: boolean; biome?: string } = {}
  ): EvolutionBranch | null {
    for (const branch of branches) {
      if (branch.minLevel && creature.level < branch.minLevel) continue;
      if (branch.minLoyalty && creature.loyalty < branch.minLoyalty) continue;
      if (branch.requiredItem && context.itemUsed !== branch.requiredItem) continue;
      if (branch.timeOfDay === 'DAY' && context.isNight === true) continue;
      if (branch.timeOfDay === 'NIGHT' && context.isNight !== true) continue;
      if (branch.requiredBiome && context.biome !== branch.requiredBiome) continue;

      return branch;
    }

    return null;
  }

  /**
   * Computes elemental damage effectiveness and environmental weather resonance.
   */
  public calculateElementalResonance(
    attackElement: Element,
    defenderElement: Element,
    weather: WeatherCondition = 'CLEAR'
  ): { baseMultiplier: number; weatherMultiplier: number; finalMultiplier: number } {
    let baseMultiplier = 1.0;

    // Classic 8-element matchup table
    if (attackElement === 'FIRE') {
      if (defenderElement === 'GRASS') baseMultiplier = 2.0;
      if (defenderElement === 'WATER' || defenderElement === 'FIRE') baseMultiplier = 0.5;
    } else if (attackElement === 'WATER') {
      if (defenderElement === 'FIRE' || defenderElement === 'EARTH') baseMultiplier = 2.0;
      if (defenderElement === 'GRASS' || defenderElement === 'WATER') baseMultiplier = 0.5;
    } else if (attackElement === 'GRASS') {
      if (defenderElement === 'WATER' || defenderElement === 'EARTH') baseMultiplier = 2.0;
      if (defenderElement === 'FIRE' || defenderElement === 'GRASS') baseMultiplier = 0.5;
    } else if (attackElement === 'ELECTRIC') {
      if (defenderElement === 'WATER' || defenderElement === 'WIND') baseMultiplier = 2.0;
      if (defenderElement === 'EARTH') baseMultiplier = 0.0;
    } else if (attackElement === 'LIGHT') {
      if (defenderElement === 'SHADOW') baseMultiplier = 2.0;
      if (defenderElement === 'LIGHT') baseMultiplier = 0.5;
    } else if (attackElement === 'SHADOW') {
      if (defenderElement === 'LIGHT') baseMultiplier = 2.0;
      if (defenderElement === 'SHADOW') baseMultiplier = 0.5;
    }

    // Weather Resonance Multiplier
    let weatherMultiplier = 1.0;
    if (weather === 'SUNNY') {
      if (attackElement === 'FIRE') weatherMultiplier = 1.3;
      if (attackElement === 'WATER') weatherMultiplier = 0.7;
    } else if (weather === 'RAIN' || weather === 'THUNDERSTORM') {
      if (attackElement === 'WATER') weatherMultiplier = 1.3;
      if (attackElement === 'FIRE') weatherMultiplier = 0.7;
      if (attackElement === 'ELECTRIC' && weather === 'THUNDERSTORM') weatherMultiplier = 1.25;
    } else if (weather === 'ECLIPSE') {
      if (attackElement === 'SHADOW') weatherMultiplier = 1.4;
      if (attackElement === 'LIGHT') weatherMultiplier = 0.6;
    }

    const finalMultiplier = Number((baseMultiplier * weatherMultiplier).toFixed(2));
    return { baseMultiplier, weatherMultiplier, finalMultiplier };
  }
}
