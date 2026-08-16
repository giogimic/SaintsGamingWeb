import { describe, it, expect } from 'vitest';
import { attemptChopTree } from './woodcuttingEngine';

describe('Woodcutting Tree Felling & Nest Drop Engine (Bible 08)', () => {
  it('chops normal tree with bronze axe on successful roll', () => {
    // Deterministic roll = 0.1 (success)
    const result = attemptChopTree('NORMAL', 1, 'BRONZE', 0.1, 0.99);

    expect(result.success).toBe(true);
    expect(result.logItemId).toBe('logs_normal');
    expect(result.xpAwarded).toBe(25);
    expect(result.respawnDurationMs).toBe(15000);
    expect(result.foundNestItemId).toBeUndefined();
  });

  it('discovers bird nest on low nest roll', () => {
    // Nest roll = 0.001 (lower than 0.004 normal tree chance)
    const result = attemptChopTree('NORMAL', 10, 'IRON', 0.1, 0.001);

    expect(result.success).toBe(true);
    expect(result.foundNestItemId).toBeDefined();
    expect(result.foundNestItemId?.startsWith('item_birds_nest_')).toBe(true);
  });

  it('blocks woodcutting when player level is lower than tree or axe requirements', () => {
    // Attempting Magic tree (requires lvl 75) with lvl 30
    const failTree = attemptChopTree('MAGIC', 30, 'RUNE');
    expect(failTree.success).toBe(false);
    expect(failTree.reason).toContain('Requires Woodcutting level 75');

    // Attempting Rune Axe (requires lvl 41) with lvl 10
    const failAxe = attemptChopTree('OAK', 15, 'RUNE');
    expect(failAxe.success).toBe(false);
    expect(failAxe.reason).toContain('Requires Woodcutting level 41 to wield');
  });
});
