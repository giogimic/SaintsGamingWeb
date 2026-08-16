import { describe, it, expect } from 'vitest';
import {
  evaluateEvolution,
  applyEvolution,
  CreatureState,
} from './evolutionEngine';

describe('Creature Evolution Branch & Milestone Metamorphosis Engine (Bible 12)', () => {
  it('evaluates level-up evolution for flame lizard reaching level 36', () => {
    // Level 30 -> cannot evolve yet
    const preLevel = evaluateEvolution('creature_flame_lizard', 30);
    expect(preLevel.canEvolve).toBe(false);

    // Level 36 -> evolves into Inferno Dragon
    const evolveOk = evaluateEvolution('creature_flame_lizard', 36);
    expect(evolveOk.canEvolve).toBe(true);
    expect(evolveOk.branch?.targetSpeciesId).toBe('creature_inferno_dragon');
    expect(evolveOk.branch?.baseStatMultiplier).toBe(1.5);
  });

  it('evaluates stone infusion evolution and applies stat scaling', () => {
    const creature: CreatureState = {
      id: 'c_1',
      speciesId: 'creature_spark_mouse',
      level: 25,
      friendship: 100,
      stats: { hp: 50, atk: 40, def: 35, spAtk: 45, spDef: 35, speed: 60 },
    };

    // Wrong item (Water Stone on Spark Mouse -> fails)
    const wrongStone = evaluateEvolution('creature_spark_mouse', 25, 'item_water_stone');
    expect(wrongStone.canEvolve).toBe(false);

    // Thunder Stone -> evolves into Thunder Raichu
    const rightStone = evaluateEvolution('creature_spark_mouse', 25, 'item_thunder_stone');
    expect(rightStone.canEvolve).toBe(true);

    const applied = applyEvolution(creature, rightStone.branch!);
    expect(applied.success).toBe(true);
    expect(creature.speciesId).toBe('creature_thunder_raichu');
    expect(creature.stats.hp).toBe(70); // 50 * 1.4 = 70
    expect(creature.stats.speed).toBe(84); // 60 * 1.4 = 84
  });

  it('evaluates friendship and environmental biome requirements for branched evolutions', () => {
    // Low friendship
    const lowFriendship = evaluateEvolution('creature_saints_fox', 30, undefined, 150, 'SANCTUARY');
    expect(lowFriendship.canEvolve).toBe(false);

    // High friendship but wrong biome
    const wrongBiome = evaluateEvolution('creature_saints_fox', 30, undefined, 230, 'VOLCANIC');
    expect(wrongBiome.canEvolve).toBe(false);

    // High friendship + correct Sanctuary biome -> evolves into Saints Espeon
    const espeon = evaluateEvolution('creature_saints_fox', 30, undefined, 230, 'SANCTUARY');
    expect(espeon.canEvolve).toBe(true);
    expect(espeon.branch?.targetSpeciesId).toBe('creature_saints_espeon');
  });
});
