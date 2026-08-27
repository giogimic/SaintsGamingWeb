import { describe, expect, it } from 'vitest';
import {
  CreatureMutationEngine,
  EvolutionBranch,
} from './creatureMutationEngine';

describe('Pet Gene Mutations, Evolutionary Branching & Elemental Affinity Matrix Engine (Phase 24)', () => {
  it('rolls genetic mutations based on probability thresholds', () => {
    const engine = new CreatureMutationEngine();

    // 1. Roll 0.005 (< 0.01 threshold) -> successfully rolls a mutation trait
    const trait = engine.rollGeneticMutation(0.005);
    expect(trait).not.toBeNull();
    expect(trait?.scaleModifier).toBeGreaterThan(0);
    expect(trait?.statModifiers.hpMultiplier).toBeGreaterThan(0);

    // 2. Roll 0.50 (>= 0.01) -> no mutation
    const noTrait = engine.rollGeneticMutation(0.5);
    expect(noTrait).toBeNull();
  });

  it('evaluates branching evolutionary pathways accurately', () => {
    const engine = new CreatureMutationEngine();

    const branches: EvolutionBranch[] = [
      {
        targetSpeciesId: 'species_inferno_fox',
        targetSpeciesName: 'Inferno Fox',
        requiredItem: 'item_fire_stone',
      },
      {
        targetSpeciesId: 'species_solar_fox',
        targetSpeciesName: 'Solar Fox',
        minLevel: 25,
        timeOfDay: 'DAY',
      },
      {
        targetSpeciesId: 'species_lunar_fox',
        targetSpeciesName: 'Lunar Fox',
        minLoyalty: 80,
        timeOfDay: 'NIGHT',
      },
    ];

    const pet = { level: 28, loyalty: 85, currentSpeciesId: 'species_ember_fox' };

    // 1. Using Fire Stone -> evolves to Inferno Fox
    const evo1 = engine.evaluateBranchingEvolution(pet, branches, { itemUsed: 'item_fire_stone' });
    expect(evo1?.targetSpeciesId).toBe('species_inferno_fox');

    // 2. Day time without stone -> evolves to Solar Fox (Level >= 25)
    const evo2 = engine.evaluateBranchingEvolution(pet, branches, { isNight: false });
    expect(evo2?.targetSpeciesId).toBe('species_solar_fox');

    // 3. Night time -> evolves to Lunar Fox (Loyalty >= 80)
    const evo3 = engine.evaluateBranchingEvolution(pet, branches, { isNight: true });
    expect(evo3?.targetSpeciesId).toBe('species_lunar_fox');
  });

  it('computes elemental damage matchups and weather resonance multipliers', () => {
    const engine = new CreatureMutationEngine();

    // 1. Fire vs Grass in SUNNY weather: 2.0x base * 1.3x weather = 2.6x final
    const res1 = engine.calculateElementalResonance('FIRE', 'GRASS', 'SUNNY');
    expect(res1.baseMultiplier).toBe(2.0);
    expect(res1.weatherMultiplier).toBe(1.3);
    expect(res1.finalMultiplier).toBe(2.6);

    // 2. Water vs Fire in RAIN weather: 2.0x base * 1.3x weather = 2.6x final
    const res2 = engine.calculateElementalResonance('WATER', 'FIRE', 'RAIN');
    expect(res2.baseMultiplier).toBe(2.0);
    expect(res2.weatherMultiplier).toBe(1.3);
    expect(res2.finalMultiplier).toBe(2.6);

    // 3. Electric vs Earth: 0.0x immunity
    const res3 = engine.calculateElementalResonance('ELECTRIC', 'EARTH', 'CLEAR');
    expect(res3.baseMultiplier).toBe(0.0);
    expect(res3.finalMultiplier).toBe(0.0);

    // 4. Shadow vs Light in ECLIPSE: 2.0x base * 1.4x weather = 2.8x final
    const res4 = engine.calculateElementalResonance('SHADOW', 'LIGHT', 'ECLIPSE');
    expect(res4.baseMultiplier).toBe(2.0);
    expect(res4.weatherMultiplier).toBe(1.4);
    expect(res4.finalMultiplier).toBe(2.8);
  });
});
