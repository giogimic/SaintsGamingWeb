import { describe, it, expect } from 'vitest';
import { attemptMineRock, prospectRock } from './miningEngine';

describe('Mining Veins & Prospecting Depletion Engine (Bible 08 & 14)', () => {
  it('prospects rocks accurately', () => {
    expect(prospectRock('IRON')).toBe('This rock contains Iron ore.');
    expect(prospectRock('RUNITE')).toBe('This rock contains Runite ore.');
  });

  it('mines copper with bronze pickaxe on successful roll', () => {
    // Deterministic roll = 0.1 (success)
    const result = attemptMineRock('COPPER', 1, 'BRONZE', 0.1, 0.99);

    expect(result.success).toBe(true);
    expect(result.oreItemId).toBe('ore_copper');
    expect(result.xpAwarded).toBe(17.5);
    expect(result.respawnDurationMs).toBe(3000);
    expect(result.foundGemItemId).toBeUndefined();
  });

  it('discovers uncut gem on low gem roll', () => {
    // Gem roll = 0.001 (lower than 0.004 copper chance)
    const result = attemptMineRock('COPPER', 10, 'IRON', 0.1, 0.001);

    expect(result.success).toBe(true);
    expect(result.foundGemItemId).toBeDefined();
    expect(result.foundGemItemId?.startsWith('gem_uncut_')).toBe(true);
  });

  it('blocks mining when player level is lower than rock or pickaxe requirements', () => {
    // Attempting Runite (requires lvl 85) with lvl 40
    const failRock = attemptMineRock('RUNITE', 40, 'RUNE');
    expect(failRock.success).toBe(false);
    expect(failRock.reason).toContain('Requires Mining level 85');

    // Attempting Rune Pickaxe (requires lvl 41) with lvl 10
    const failPick = attemptMineRock('IRON', 15, 'RUNE');
    expect(failPick.success).toBe(false);
    expect(failPick.reason).toContain('Requires Mining level 41 to wield');
  });
});
