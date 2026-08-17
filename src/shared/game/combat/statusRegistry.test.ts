import { describe, it, expect } from 'vitest';
import {
  CANONICAL_STATUS_EFFECTS,
  getStatusDef,
  getAllStatusDefs,
} from './statusRegistry';

describe('Canonical Status Effects Registry (Bible 25 §3.2)', () => {
  it('defines all core combat status effects with valid durations and categories', () => {
    const list = getAllStatusDefs();
    expect(list.length).toBeGreaterThanOrEqual(6);

    for (const status of list) {
      expect(status.id).toBeDefined();
      expect(status.name.length).toBeGreaterThan(0);
      expect(status.description.length).toBeGreaterThan(0);
      expect(['BUFF', 'DEBUFF', 'CONTROL', 'DAMAGE_OVER_TIME']).toContain(status.category);
      expect(status.durationMsDefault).toBeGreaterThan(0);
      expect(status.durationTurnsDefault).toBeGreaterThan(0);
      expect(status.colorHex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(status.isActive).toBe(true);
    }
  });

  it('provides capture modifiers for incapacitating debuffs', () => {
    const stun = getStatusDef('stun');
    expect(stun).toBeDefined();
    expect(stun?.captureModifier).toBeGreaterThan(1.0);

    const burn = getStatusDef('burn');
    expect(burn).toBeDefined();
    expect(burn?.captureModifier).toBeGreaterThan(1.0);
  });

  it('correctly fetches status definition case-insensitively', () => {
    expect(getStatusDef('BURN')).toEqual(getStatusDef('burn'));
    expect(getStatusDef('FROSTBITE')).toEqual(getStatusDef('frostbite'));
  });
});
