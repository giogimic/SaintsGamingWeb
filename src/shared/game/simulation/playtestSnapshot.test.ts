import { describe, expect, it } from 'vitest';
import {
  capturePlaytestSnapshot,
  restorePlaytestSnapshot,
  type PlaytestPlayerState,
} from './playtestSnapshot';

describe('playtestSnapshot', () => {
  it('captures player state immutably without mutation side-effects', () => {
    const original: PlaytestPlayerState = {
      id: 'user_123',
      name: 'Hero Explorer',
      position: { x: 14, y: 22 },
      direction: 'down',
      currentMapId: 'SAINTS_VILLAGE',
      hp: 100,
      maxHp: 100,
      gold: 500,
      inventory: { potion: 3, wood: 10 },
      skills: { woodcutting: 12 },
    };

    const snapshot = capturePlaytestSnapshot('user_123', original);

    expect(snapshot.snapshotId).toContain('pie_snap_user_123_');
    expect(snapshot.originalState.gold).toBe(500);

    // Mutate original object
    original.gold = 99999;
    original.position = { x: 0, y: 0 };

    // Snapshot remains untouched
    expect(snapshot.originalState.gold).toBe(500);
    expect(snapshot.originalState.position?.x).toBe(14);
  });

  it('restores snapshot state and invokes apply callback', () => {
    const original: PlaytestPlayerState = {
      id: 'user_456',
      position: { x: 5, y: 8 },
      currentMapId: 'DEMO_SANDBOX',
      gold: 250,
      inventory: { copper_ore: 5 },
    };

    const snapshot = capturePlaytestSnapshot('user_456', original);

    let restoredTarget: PlaytestPlayerState | null = null;
    const restored = restorePlaytestSnapshot(snapshot, (state) => {
      restoredTarget = state;
    });

    expect(restored.gold).toBe(250);
    expect(restored.position?.x).toBe(5);
    expect(restoredTarget).toEqual(restored);
  });
});
