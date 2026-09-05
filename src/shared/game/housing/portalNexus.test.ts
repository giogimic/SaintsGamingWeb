import { describe, it, expect } from 'vitest';
import {
  createPortalSeraphus,
  attunePortalFrame,
  unlockSeraphusDestination,
  activatePortalTeleport,
} from './portalSeraphus';

describe('Sanctuary Portal Seraphus & Teleport Attunement Engine (Bible 13)', () => {
  it('creates portal seraphus with default starter dests and first frame attuned', () => {
    const seraphus = createPortalSeraphus('player_1', 3);

    expect(seraphus.ownerId).toBe('player_1');
    expect(seraphus.frames.length).toBe(3);
    expect(seraphus.frames[0].attunedDestinationId).toBe('dest_saints_plaza');
    expect(seraphus.unlockedDestinations).toContain('dest_saints_plaza');
    expect(seraphus.unlockedDestinations).toContain('dest_wild_meadows');
  });

  it('attunes portal frame and blocks locked/under-leveled destinations', () => {
    const seraphus = createPortalSeraphus('player_1', 3);

    // Attune frame 1 to Wild Meadows (requires Magic level 25, player has 30 -> success)
    const attune1 = attunePortalFrame(seraphus, 1, 'dest_wild_meadows', 30);
    expect(attune1.success).toBe(true);
    expect(seraphus.frames[1].attunedDestinationId).toBe('dest_wild_meadows');

    // Attempt to attune to locked Quarry Mine without unlocking first (blocked)
    const attuneLocked = attunePortalFrame(seraphus, 2, 'dest_quarry_mine', 50);
    expect(attuneLocked.success).toBe(false);
    expect(attuneLocked.reason).toContain('has not been unlocked yet');

    // Unlock Quarry Mine, then try with insufficient magic level (requires 45, player has 30 -> blocked)
    unlockSeraphusDestination(seraphus, 'dest_quarry_mine');
    const attuneLowMagic = attunePortalFrame(seraphus, 2, 'dest_quarry_mine', 30);
    expect(attuneLowMagic.success).toBe(false);
    expect(attuneLowMagic.reason).toContain('Requires Magic level 45');
  });

  it('activates portal teleportation and resolves map target coordinates', () => {
    const seraphus = createPortalSeraphus('player_1', 3);

    const warp = activatePortalTeleport(seraphus, 0, 10);
    expect(warp.success).toBe(true);
    expect(warp.targetMapId).toBe('DEMO_SANDBOX');
    expect(warp.spawnX).toBe(14);
    expect(warp.spawnY).toBe(15);
  });
});
