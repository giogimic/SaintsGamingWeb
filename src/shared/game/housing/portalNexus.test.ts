import { describe, it, expect } from 'vitest';
import {
  createPortalNexus,
  attunePortalFrame,
  unlockNexusDestination,
  activatePortalTeleport,
} from './portalNexus';

describe('Sanctuary Portal Nexus & Teleport Attunement Engine (Bible 13)', () => {
  it('creates portal nexus with default starter dests and first frame attuned', () => {
    const nexus = createPortalNexus('player_1', 3);

    expect(nexus.ownerId).toBe('player_1');
    expect(nexus.frames.length).toBe(3);
    expect(nexus.frames[0].attunedDestinationId).toBe('dest_saints_plaza');
    expect(nexus.unlockedDestinations).toContain('dest_saints_plaza');
    expect(nexus.unlockedDestinations).toContain('dest_wild_meadows');
  });

  it('attunes portal frame and blocks locked/under-leveled destinations', () => {
    const nexus = createPortalNexus('player_1', 3);

    // Attune frame 1 to Wild Meadows (requires Magic level 25, player has 30 -> success)
    const attune1 = attunePortalFrame(nexus, 1, 'dest_wild_meadows', 30);
    expect(attune1.success).toBe(true);
    expect(nexus.frames[1].attunedDestinationId).toBe('dest_wild_meadows');

    // Attempt to attune to locked Quarry Mine without unlocking first (blocked)
    const attuneLocked = attunePortalFrame(nexus, 2, 'dest_quarry_mine', 50);
    expect(attuneLocked.success).toBe(false);
    expect(attuneLocked.reason).toContain('has not been unlocked yet');

    // Unlock Quarry Mine, then try with insufficient magic level (requires 45, player has 30 -> blocked)
    unlockNexusDestination(nexus, 'dest_quarry_mine');
    const attuneLowMagic = attunePortalFrame(nexus, 2, 'dest_quarry_mine', 30);
    expect(attuneLowMagic.success).toBe(false);
    expect(attuneLowMagic.reason).toContain('Requires Magic level 45');
  });

  it('activates portal teleportation and resolves map target coordinates', () => {
    const nexus = createPortalNexus('player_1', 3);

    const warp = activatePortalTeleport(nexus, 0, 10);
    expect(warp.success).toBe(true);
    expect(warp.targetMapId).toBe('DEMO_SANDBOX');
    expect(warp.spawnX).toBe(14);
    expect(warp.spawnY).toBe(15);
  });
});
