import { describe, it, expect } from 'vitest';
import {
  unlockPraesulCurse,
  getTier99CurseBonus,
  rollSeraphLoot,
  type PlayerCurseState,
} from './seraphLootEngine';

describe('Seraph: Angel of Death Praesul Codex & Loot Engine', () => {
  it('enforces Prayer 99 and unlocks Tier 99 curses', () => {
    const player: PlayerCurseState = {
      prayerLevel: 95,
      unlockedTier99Curses: [],
    };

    // Fails: Prayer level 95 < 99
    const failRes = unlockPraesulCurse(player, 'MALEVOLENCE');
    expect(failRes.success).toBe(false);
    expect(failRes.error).toContain('Prayer level 99');

    // Level up to 99
    player.prayerLevel = 99;
    const passRes = unlockPraesulCurse(player, 'MALEVOLENCE');
    expect(passRes.success).toBe(true);
    expect(player.unlockedTier99Curses).toContain('MALEVOLENCE');

    // Duplicate unlock prevention
    const dupRes = unlockPraesulCurse(player, 'MALEVOLENCE');
    expect(dupRes.success).toBe(false);
  });

  it('calculates Tier 99 curse stat multipliers (+12% dmg, +12% acc, +10% def)', () => {
    const active = getTier99CurseBonus('AFFLICTION');
    expect(active.damageMultiplier).toBe(1.12);
    expect(active.accuracyMultiplier).toBe(1.12);
    expect(active.defenceMultiplier).toBe(1.10);

    const inactive = getTier99CurseBonus(null);
    expect(inactive.damageMultiplier).toBe(1.0);
    expect(inactive.accuracyMultiplier).toBe(1.0);
  });

  it('rolls unique and standard loot drops upon Seraph defeat', () => {
    // Force unique drop (seed 0.001 < 0.025) and roll Wand of the Praesul
    const loot = rollSeraphLoot(0.20, 0.001, 0.35);
    expect(loot.hasUnique).toBe(true);
    expect(loot.uniqueDrop).not.toBeNull();
    expect(loot.standardDrops.length).toBe(3);
    expect(loot.standardDrops[0].itemId).toBe('blood_rune');
  });
});
