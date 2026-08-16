import { describe, it, expect } from 'vitest';
import {
  calculateBurnChance,
  cookFood,
  CANONICAL_COOKING_RECIPES,
} from './cookingEngine';

describe('Cooking & Culinary Recipe Formulation Engine (Bible 22)', () => {
  const shrimp = CANONICAL_COOKING_RECIPES.raw_shrimp;

  it('calculates zero burn chance when player reaches stopBurnLevel', () => {
    // Shrimp stop burn is level 34
    const burnAt34 = calculateBurnChance(34, shrimp, 'FIRE');
    expect(burnAt34).toBe(0.0);

    const burnAt99 = calculateBurnChance(99, shrimp, 'FIRE');
    expect(burnAt99).toBe(0.0);
  });

  it('calculates higher burn rates on standard fires compared to chef ranges', () => {
    const burnOnFire = calculateBurnChance(1, shrimp, 'FIRE');
    const burnOnRange = calculateBurnChance(1, shrimp, 'RANGE');
    const burnOnChefRange = calculateBurnChance(1, shrimp, 'CHEF_RANGE');

    expect(burnOnFire).toBe(0.5);
    expect(burnOnRange).toBe(0.35);
    expect(burnOnChefRange).toBe(0.2);
  });

  it('cooks raw food successfully with XP and healing rewards when not burnt', () => {
    // Deterministic roll = 0.9 (higher than burn chance -> success)
    const result = cookFood(shrimp, 20, 'RANGE', 0.9);

    expect(result.success).toBe(true);
    expect(result.isBurnt).toBe(false);
    expect(result.resultItemId).toBe('cooked_shrimp');
    expect(result.healAmount).toBe(3);
    expect(result.xpAwarded).toBe(30);
  });

  it('produces burnt food with 0 XP on bad roll', () => {
    // Deterministic roll = 0.05 (lower than burn chance -> burns)
    const result = cookFood(shrimp, 1, 'FIRE', 0.05);

    expect(result.success).toBe(true);
    expect(result.isBurnt).toBe(true);
    expect(result.resultItemId).toBe('burnt_shrimp');
    expect(result.healAmount).toBe(0);
    expect(result.xpAwarded).toBe(0);
  });
});
