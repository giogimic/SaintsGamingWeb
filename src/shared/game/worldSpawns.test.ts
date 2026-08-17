import { describe, it, expect } from 'vitest';
import {
  resolveSafePlayerSpawn,
  canCastUnstuck,
  UNSTUCK_COOLDOWN_MS,
  DEFAULT_FALLBACK_SPAWN,
} from './worldSpawns';

describe('World Spawn & Unstuck Resolution Engine', () => {
  it('keeps players on their current map if the map still exists in available maps', () => {
    const result = resolveSafePlayerSpawn({
      savedMapId: 'CRYSTAL_CAVERNS',
      savedX: 12,
      savedY: 18,
      availableMapIds: ['LOBBY', 'CRYSTAL_CAVERNS', 'WILD_MEADOWS'],
    });

    expect(result.mapId).toBe('CRYSTAL_CAVERNS');
    expect(result.x).toBe(12);
    expect(result.y).toBe(18);
  });

  it('transports players to world spawn / hub if their saved map was deleted', () => {
    const result = resolveSafePlayerSpawn({
      savedMapId: 'DELETED_DUNGEON',
      savedX: 5,
      savedY: 5,
      availableMapIds: ['SAINTS_HAVEN', 'WILD_MEADOWS'],
      worldDefaultSpawn: { mapId: 'SAINTS_HAVEN', x: 20, y: 25 },
    });

    expect(result.mapId).toBe('SAINTS_HAVEN');
    expect(result.x).toBe(20);
    expect(result.y).toBe(25);
  });

  it('handles empty or missing saved map by sending to default spawn', () => {
    const result = resolveSafePlayerSpawn({
      savedMapId: null,
      availableMapIds: ['LOBBY', 'TRAINING_GROUNDS'],
    });

    expect(result.mapId).toBe('LOBBY');
    expect(result.x).toBe(DEFAULT_FALLBACK_SPAWN.x);
    expect(result.y).toBe(DEFAULT_FALLBACK_SPAWN.y);
  });

  it('enforces a 5-minute cooldown on unstuck ability', () => {
    const now = 1000000;
    // No prior use
    expect(canCastUnstuck(null, now).canCast).toBe(true);

    // Used 1 minute ago -> blocked
    const recentUse = now - 60 * 1000;
    const check1 = canCastUnstuck(recentUse, now);
    expect(check1.canCast).toBe(false);
    expect(check1.remainingCooldownMs).toBe(4 * 60 * 1000);

    // Used 6 minutes ago -> allowed
    const oldUse = now - 6 * 60 * 1000;
    const check2 = canCastUnstuck(oldUse, now);
    expect(check2.canCast).toBe(true);
    expect(check2.remainingCooldownMs).toBe(0);
  });
});
