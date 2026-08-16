/**
 * Saints Gaming — Sanctuary Portal Nexus & Teleport Attunement Engine (Bible 13)
 * Manages housing portal chamber frames, destination attunements, Magic level prerequisites, and warp validation.
 */

export type PortalTier = 'BASIC' | 'LUNAR' | 'CRYSTAL' | 'GRANDMASTER';

export interface PortalDestination {
  id: string;
  name: string;
  targetMapId: string;
  spawnX: number;
  spawnY: number;
  reqMagicLevel: number;
  unlockedByDefault: boolean;
}

export const CANONICAL_PORTAL_DESTINATIONS: Record<string, PortalDestination> = {
  dest_saints_plaza: {
    id: 'dest_saints_plaza',
    name: "Saints Central Plaza",
    targetMapId: 'DEMO_SANDBOX',
    spawnX: 14,
    spawnY: 15,
    reqMagicLevel: 1,
    unlockedByDefault: true,
  },
  dest_wild_meadows: {
    id: 'dest_wild_meadows',
    name: 'Wild Meadows Valley',
    targetMapId: 'WILD_MEADOWS',
    spawnX: 12,
    spawnY: 10,
    reqMagicLevel: 25,
    unlockedByDefault: true,
  },
  dest_quarry_mine: {
    id: 'dest_quarry_mine',
    name: 'Quarry Mine Depths',
    targetMapId: 'QUARRY_MINE',
    spawnX: 15,
    spawnY: 12,
    reqMagicLevel: 45,
    unlockedByDefault: false,
  },
  dest_whispering_forest: {
    id: 'dest_whispering_forest',
    name: 'Whispering Forest Grove',
    targetMapId: 'WHISPERING_FOREST',
    spawnX: 20,
    spawnY: 18,
    reqMagicLevel: 65,
    unlockedByDefault: false,
  },
};

export interface PortalChamberFrame {
  frameIndex: number;
  tier: PortalTier;
  attunedDestinationId?: string;
}

export interface NexusState {
  ownerId: string;
  frames: PortalChamberFrame[];
  unlockedDestinations: string[];
}

/**
 * Creates a new Portal Nexus state for a player's estate.
 */
export function createPortalNexus(ownerId: string, frameCount: number = 3): NexusState {
  const frames: PortalChamberFrame[] = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push({
      frameIndex: i,
      tier: 'BASIC',
      attunedDestinationId: i === 0 ? 'dest_saints_plaza' : undefined,
    });
  }

  const unlocked = Object.values(CANONICAL_PORTAL_DESTINATIONS)
    .filter((d) => d.unlockedByDefault)
    .map((d) => d.id);

  return {
    ownerId,
    frames,
    unlockedDestinations: unlocked,
  };
}

/**
 * Attunes a portal chamber frame to a selected destination.
 */
export function attunePortalFrame(
  nexus: NexusState,
  frameIndex: number,
  destinationId: string,
  playerMagicLevel: number
): { success: boolean; reason?: string } {
  const frame = nexus.frames.find((f) => f.frameIndex === frameIndex);
  if (!frame) {
    return { success: false, reason: 'Portal frame index not found.' };
  }

  const dest = CANONICAL_PORTAL_DESTINATIONS[destinationId];
  if (!dest) {
    return { success: false, reason: 'Destination does not exist.' };
  }

  if (!nexus.unlockedDestinations.includes(destinationId)) {
    return { success: false, reason: 'Destination has not been unlocked yet.' };
  }

  if (playerMagicLevel < dest.reqMagicLevel) {
    return {
      success: false,
      reason: `Requires Magic level ${dest.reqMagicLevel} (Current: ${playerMagicLevel})`,
    };
  }

  frame.attunedDestinationId = destinationId;
  return { success: true };
}

/**
 * Unlocks a destination in the player's portal nexus.
 */
export function unlockNexusDestination(
  nexus: NexusState,
  destinationId: string
): boolean {
  if (!CANONICAL_PORTAL_DESTINATIONS[destinationId]) return false;
  if (nexus.unlockedDestinations.includes(destinationId)) return true;

  nexus.unlockedDestinations.push(destinationId);
  return true;
}

/**
 * Activates teleportation through an attuned portal frame.
 */
export function activatePortalTeleport(
  nexus: NexusState,
  frameIndex: number,
  playerMagicLevel: number
): {
  success: boolean;
  targetMapId?: string;
  spawnX?: number;
  spawnY?: number;
  reason?: string;
} {
  const frame = nexus.frames.find((f) => f.frameIndex === frameIndex);
  if (!frame || !frame.attunedDestinationId) {
    return { success: false, reason: 'Portal frame is not attuned to any destination.' };
  }

  const dest = CANONICAL_PORTAL_DESTINATIONS[frame.attunedDestinationId];
  if (!dest) {
    return { success: false, reason: 'Attuned destination invalid.' };
  }

  if (playerMagicLevel < dest.reqMagicLevel) {
    return {
      success: false,
      reason: `Requires Magic level ${dest.reqMagicLevel} to activate portal.`,
    };
  }

  return {
    success: true,
    targetMapId: dest.targetMapId,
    spawnX: dest.spawnX,
    spawnY: dest.spawnY,
  };
}
