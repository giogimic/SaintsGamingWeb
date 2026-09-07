/**
 * Saints Gaming — Canonical World Spawn & Unstuck Resolution Engine
 * Handles canonical world hub/spawn resolution, safe map fallbacks for deleted maps,
 * and unstuck timer/cooldown logic.
 */

export interface WorldSpawnPoint {
  mapId: string;
  x: number;
  y: number;
}

export const DEFAULT_FALLBACK_SPAWN: WorldSpawnPoint = {
  mapId: 'STARTING_MEADOW',
  x: 32,
  y: 32,
};

export const UNSTUCK_COOLDOWN_MS = 5 * 60 * 1000; // 5 minute cooldown
export const UNSTUCK_CAST_DURATION_MS = 5000; // 5 second cast timer

/**
 * Resolves a safe map and spawn coordinate for a character.
 * If the player's saved map was deleted or doesn't exist, transports them to the active world spawn / lobby.
 */
export function resolveSafePlayerSpawn(params: {
  savedMapId?: string | null;
  savedX?: number | null;
  savedY?: number | null;
  availableMapIds: string[];
  worldDefaultSpawn?: WorldSpawnPoint;
}): WorldSpawnPoint {
  const worldSpawn = params.worldDefaultSpawn || DEFAULT_FALLBACK_SPAWN;
  const rawSavedMap = params.savedMapId ? params.savedMapId.replace(/_ch\d+$/, '').trim() : '';

  // 1. If saved map exists in available maps list (or available list is empty/loading), keep player on that map
  if (rawSavedMap && (params.availableMapIds.length === 0 || params.availableMapIds.includes(rawSavedMap))) {
    return {
      mapId: rawSavedMap,
      x: typeof params.savedX === 'number' ? params.savedX : 15,
      y: typeof params.savedY === 'number' ? params.savedY : 15,
    };
  }

  // 2. If the world default spawn map exists, send to world default spawn
  if (params.availableMapIds.includes(worldSpawn.mapId)) {
    return {
      mapId: worldSpawn.mapId,
      x: worldSpawn.x,
      y: worldSpawn.y,
    };
  }

  // 3. If STARTING_MEADOW exists in available maps, send to STARTING_MEADOW
  if (params.availableMapIds.includes('STARTING_MEADOW')) {
    return {
      mapId: 'STARTING_MEADOW',
      x: 32,
      y: 32,
    };
  }

  // 4. Fallback to the first available map or fallback constant
  const firstAvailable = params.availableMapIds[0] || 'STARTING_MEADOW';
  return {
    mapId: firstAvailable,
    x: 15,
    y: 15,
  };
}

/**
 * Validates whether an unstuck teleport can be initiated based on the last unstuck timestamp.
 */
export function canCastUnstuck(lastUnstuckTimestamp?: number | null, now: number = Date.now()): {
  canCast: boolean;
  remainingCooldownMs: number;
} {
  if (!lastUnstuckTimestamp) {
    return { canCast: true, remainingCooldownMs: 0 };
  }

  const elapsed = now - lastUnstuckTimestamp;
  if (elapsed >= UNSTUCK_COOLDOWN_MS) {
    return { canCast: true, remainingCooldownMs: 0 };
  }

  return {
    canCast: false,
    remainingCooldownMs: UNSTUCK_COOLDOWN_MS - elapsed,
  };
}
