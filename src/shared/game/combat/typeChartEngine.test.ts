import { describe, it, expect } from 'vitest';
import {
  CANONICAL_TYPE_CHART,
  getElementalMultiplier,
} from './typeChartEngine';

describe('Canonical Elemental Type Chart Engine (Bible 25 §3.7)', () => {
  it('calculates standard super-effective elemental advantages (2.0x)', () => {
    expect(getElementalMultiplier('fire', 'grass')).toBe(2.0);
    expect(getElementalMultiplier('water', 'fire')).toBe(2.0);
    expect(getElementalMultiplier('grass', 'water')).toBe(2.0);
    expect(getElementalMultiplier('electric', 'water')).toBe(2.0);
    expect(getElementalMultiplier('holy', 'shadow')).toBe(2.0);
  });

  it('calculates resisted damage multipliers (0.5x)', () => {
    expect(getElementalMultiplier('fire', 'water')).toBe(0.5);
    expect(getElementalMultiplier('water', 'grass')).toBe(0.5);
    expect(getElementalMultiplier('grass', 'fire')).toBe(0.5);
  });

  it('handles immunity multipliers (0.0x)', () => {
    expect(getElementalMultiplier('electric', 'earth')).toBe(0.0);
  });

  it('calculates compound multipliers for dual-type defenders', () => {
    // Fire attacking Grass + Ice (2.0 * 2.0 = 4.0x)
    expect(getElementalMultiplier('fire', ['grass', 'ice'])).toBe(4.0);
    // Fire attacking Grass + Water (2.0 * 0.5 = 1.0x)
    expect(getElementalMultiplier('fire', ['grass', 'water'])).toBe(1.0);
  });
});
