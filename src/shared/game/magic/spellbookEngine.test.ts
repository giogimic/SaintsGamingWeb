import { describe, it, expect } from 'vitest';
import { castCombatSpell } from './spellbookEngine';

describe('Combat Spellbook & Rune Catalyst Engine (Bible 10)', () => {
  it('casts Wind Strike with standard rune consumption and level requirements', () => {
    const runes = { rune_air: 10, rune_mind: 5 };

    // Deterministic roll 0.9 -> max hit 2
    const cast = castCombatSpell('spell_wind_strike', 1, runes, undefined, 0.9);

    expect(cast.success).toBe(true);
    expect(cast.damageDealt).toBe(2);
    expect(cast.consumedRunes).toEqual({ rune_air: 1, rune_mind: 1 });
    expect(cast.xpAwarded).toBe(5.5 + 4); // 5.5 base + 4 damage xp
  });

  it('leverages elemental staff catalyst to eliminate fire rune requirements on Fire Bolt', () => {
    // Player has chaos and air runes, but NO fire runes
    const runes = { rune_air: 10, rune_chaos: 5 };

    // Cast with equipped Staff of Fire (infinite rune_fire)
    const cast = castCombatSpell('spell_fire_bolt', 35, runes, 'rune_fire', 0.5);

    expect(cast.success).toBe(true);
    expect(cast.consumedRunes).toEqual({ rune_air: 3, rune_chaos: 1 });
    expect(cast.consumedRunes['rune_fire']).toBeUndefined(); // Fire runes waived
  });

  it('blocks spell when Magic level or runes are insufficient', () => {
    const runes = { rune_air: 10, rune_mind: 5 };

    // Insufficient level for Fire Wave (requires 75, player has 50)
    const failLevel = castCombatSpell('spell_fire_wave', 50, runes);
    expect(failLevel.success).toBe(false);
    expect(failLevel.reason).toContain('Requires Magic level 75');

    // Missing runes for Fire Bolt
    const failRunes = castCombatSpell('spell_fire_bolt', 35, { rune_air: 1 });
    expect(failRunes.success).toBe(false);
    expect(failRunes.reason).toContain('Missing required runes');
  });
});
