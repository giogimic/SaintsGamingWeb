import { describe, it, expect } from 'vitest';
import {
  CANONICAL_ABILITIES,
  getAbilityDef,
  getAllAbilityDefs,
  getAbilitiesByDomain,
} from './abilityRegistry';

describe('Canonical Ability Registry Engine (Bible 25 §3.1)', () => {
  it('defines all canonical abilities with valid styles, targets, and effects', () => {
    const abilities = getAllAbilityDefs();
    expect(abilities.length).toBeGreaterThanOrEqual(6);

    for (const ab of abilities) {
      expect(ab.id).toBeDefined();
      expect(ab.name.length).toBeGreaterThan(0);
      expect(['player_rt', 'creature_tb', 'both']).toContain(ab.domain);
      expect(['MELEE', 'MAGIC', 'RANGED', 'SUPPORT', 'TECH']).toContain(ab.style);
      expect(['self', 'enemy', 'ally', 'aoe_enemies', 'aoe_allies', 'tile']).toContain(ab.target);
      expect(ab.effects).toBeInstanceOf(Array);
      expect(ab.isActive).toBe(true);
    }
  });

  it('strictly isolates capture abilities from player RT combat', () => {
    const rtAbilities = getAbilitiesByDomain('player_rt');
    for (const ab of rtAbilities) {
      if (ab.isCapture) {
        expect(ab.domain).not.toBe('player_rt');
      }
    }

    const captureMove = getAbilityDef('tuxemon_capture');
    expect(captureMove).toBeDefined();
    expect(captureMove?.isCapture).toBe(true);
    expect(captureMove?.domain).toBe('creature_tb');
  });

  it('maps XP grants to valid skill slugs', () => {
    const strike = getAbilityDef('strike');
    expect(strike?.grantsSkillXp).toBeDefined();
    expect(strike?.grantsSkillXp?.length).toBeGreaterThan(0);
    expect(strike?.grantsSkillXp?.[0].skillSlug).toBe('attack');
  });
});
