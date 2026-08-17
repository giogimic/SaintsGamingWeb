import { describe, it, expect } from 'vitest';
import {
  CANONICAL_SKILL_DEFINITIONS,
  CANONICAL_XP_CURVES,
  getCanonicalSkillDef,
  getAllCanonicalSkillDefs,
  calculateLevelFromXp,
  calculateXpForLevel,
} from './skillRegistry';

describe('Canonical SkillDef & XP Curves (Bible 25 §3.3 & §3.4)', () => {
  it('defines exactly all 27 canonical skills across the 4 categories', () => {
    const list = getAllCanonicalSkillDefs();
    expect(list.length).toBe(27);

    const categories = list.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(categories.combat).toBe(9);
    expect(categories.gathering).toBe(5);
    expect(categories.artisan).toBe(8);
    expect(categories.support).toBe(5);
  });

  it('accurately calculates levels on combat_curve_50', () => {
    expect(calculateLevelFromXp(0, 'combat_curve_50')).toBe(1);
    expect(calculateLevelFromXp(50, 'combat_curve_50')).toBe(2);
    expect(calculateLevelFromXp(125000, 'combat_curve_50')).toBe(50);
  });

  it('accurately calculates levels on standard_curve_99', () => {
    expect(calculateLevelFromXp(0, 'standard_curve_99')).toBe(1);
    expect(calculateLevelFromXp(83, 'standard_curve_99')).toBe(2);
    expect(calculateLevelFromXp(13034431, 'standard_curve_99')).toBe(99);
  });

  it('calculates XP required for level targets', () => {
    expect(calculateXpForLevel(1, 'combat_curve_50')).toBe(0);
    expect(calculateXpForLevel(2, 'combat_curve_50')).toBe(50);
    expect(calculateXpForLevel(50, 'combat_curve_50')).toBe(120050);
  });
});
