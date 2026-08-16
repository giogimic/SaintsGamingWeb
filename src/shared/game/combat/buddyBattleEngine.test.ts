import { describe, it, expect } from 'vitest';
import {
  calculateMoveDamage,
  calculateCatchProbability,
  BattleCombatantStats,
  BattleMove,
} from './buddyBattleEngine';

describe('Turn-Based Buddy Battle Calculation Engine (Bible 07 & 11)', () => {
  const attacker: BattleCombatantStats = {
    level: 10,
    maxHp: 50,
    currentHp: 50,
    attack: 30,
    defense: 20,
    speed: 25,
    element: 'Solar',
  };

  const defender: BattleCombatantStats = {
    level: 10,
    maxHp: 40,
    currentHp: 40,
    attack: 25,
    defense: 20,
    speed: 20,
    element: 'Bio', // Solar is strong against Bio (1.5x)
  };

  const solarEmber: BattleMove = {
    id: 'solar_ember',
    name: 'Solar Ember',
    power: 40,
    accuracy: 100,
    element: 'Solar',
  };

  const aquaSplash: BattleMove = {
    id: 'aqua_splash',
    name: 'Aqua Splash',
    power: 40,
    accuracy: 100,
    element: 'Hydro', // Hydro is neutral against Bio
  };

  it('calculates STAB bonus (1.25x) and super-effective multiplier (1.5x)', () => {
    const result = calculateMoveDamage(solarEmber, attacker, defender);

    expect(result.stabBonus).toBe(true);
    expect(result.typeMultiplier).toBe(1.5);
    expect(result.finalEffectiveness).toBe('super_effective');
    expect(result.damage).toBeGreaterThan(15);
  });

  it('applies environmental weather multipliers to move damage', () => {
    const rainMultiplier = 0.7; // Fire/Solar reduced in rain
    const result = calculateMoveDamage(solarEmber, attacker, defender, rainMultiplier);

    expect(result.weatherMultiplier).toBe(0.7);
  });

  it('calculates higher capture probability on weakened / status-inflicted targets', () => {
    const fullHpHero: BattleCombatantStats = {
      ...defender,
      currentHp: 40,
      status: null,
    };

    const lowHpHero: BattleCombatantStats = {
      ...defender,
      currentHp: 5,
      status: 'sleep',
    };

    const fullHpCatch = calculateCatchProbability(fullHpHero, 120, 'film_standard');
    const lowHpCatch = calculateCatchProbability(lowHpHero, 120, 'film_standard');

    expect(lowHpCatch.probability).toBeGreaterThan(fullHpCatch.probability);
    expect(lowHpCatch.probability).toBeGreaterThan(0.5);
  });

  it('guarantees 100% capture with master soul film (film_soul)', () => {
    const fullHpHero: BattleCombatantStats = {
      ...defender,
      currentHp: 40,
    };

    const soulCatch = calculateCatchProbability(fullHpHero, 120, 'film_soul');
    expect(soulCatch.isGuaranteed).toBe(true);
    expect(soulCatch.probability).toBe(1.0);
  });
});
