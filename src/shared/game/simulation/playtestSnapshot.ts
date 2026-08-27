/**
 * Saints Gaming — Playtest Sandbox State Snapshot & Restore Engine (Studio Master Plan Phase 4)
 * Ensures non-destructive Studio playtesting by isolating player inventory, stats & position.
 */

export interface PlaytestPlayerState {
  id?: string;
  name?: string;
  position?: { x: number; y: number };
  direction?: string;
  currentMapId?: string;
  hp?: number;
  maxHp?: number;
  gold?: number;
  inventory?: Record<string, number>;
  skills?: Record<string, number>;
  quests?: Record<string, { stage: number; isCompleted: boolean; isActive: boolean }>;
}

export interface PlaytestSnapshot {
  snapshotId: string;
  userId: string;
  capturedAt: number;
  originalState: PlaytestPlayerState;
}

/**
 * Creates an immutable snapshot of player state prior to entering Playtest Mode.
 */
export function capturePlaytestSnapshot(
  userId: string,
  state: PlaytestPlayerState
): PlaytestSnapshot {
  return {
    snapshotId: `pie_snap_${userId}_${Date.now()}`,
    userId,
    capturedAt: Date.now(),
    originalState: JSON.parse(JSON.stringify(state)),
  };
}

/**
 * Restores the player's original state from a pre-playtest snapshot.
 */
export function restorePlaytestSnapshot(
  snapshot: PlaytestSnapshot,
  applyCallback?: (restoredState: PlaytestPlayerState) => void
): PlaytestPlayerState {
  const restored = JSON.parse(JSON.stringify(snapshot.originalState)) as PlaytestPlayerState;
  if (applyCallback) {
    applyCallback(restored);
  }
  return restored;
}
