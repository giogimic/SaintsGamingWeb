import { describe, it, expect } from 'vitest';
import {
  GridMovementController,
  FreeMovementController,
  MovementProfile,
  MovementWorldContext,
} from './index';

describe('Pluggable Movement System (Bible 34 §7-8)', () => {
  const world: MovementWorldContext = {
    mapWidth: 10,
    mapHeight: 10,
    mapGrid: [
      [0, 0, 1, 0, 0], // row 0: wall at (2,0)
      [0, 2, 0, 0, 0], // row 1: water at (1,1)
      [0, 0, 0, 0, 0],
    ],
    logicTiles: {
      0: { id: 0, name: 'Grass', isSolid: false, interactable: false, movementCost: 1.0 },
      1: { id: 1, name: 'Wall', isSolid: true, interactable: false },
      2: {
        id: 2,
        name: 'Water',
        isSolid: true,
        interactable: false,
        passableBy: ['swim', 'fly'],
        movementCost: 1.5,
      },
    },
    occupiedPositions: [{ x: 4, y: 0 }],
  };

  const walkingProfile: MovementProfile = {
    mode: 'grid',
    baseSpeed: 5, // 5 tiles/sec = 200ms per step
    capabilities: ['walk'],
  };

  const aquaticProfile: MovementProfile = {
    mode: 'grid',
    baseSpeed: 5,
    capabilities: ['walk', 'swim'],
  };

  const flyingProfile: MovementProfile = {
    mode: 'grid',
    baseSpeed: 5,
    capabilities: ['fly'],
  };

  it('allows standard walking across empty grass tiles', () => {
    const grid = new GridMovementController();
    const res = grid.evaluateMove({ x: 0, y: 0 }, { dx: 1, dy: 0 }, walkingProfile, world);

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.targetX).toBe(1);
      expect(res.targetY).toBe(0);
      expect(res.stepDurationMs).toBe(200);
    }
  });

  it('blocks walking entities from entering water, but permits aquatic and flying entities', () => {
    const grid = new GridMovementController();

    // Walking blocked by water
    const walkRes = grid.evaluateMove({ x: 1, y: 0 }, { dx: 0, dy: 1 }, walkingProfile, world);
    expect(walkRes.success).toBe(false);
    if (!walkRes.success) expect(walkRes.reason).toBe('NO_CAPABILITY');

    // Aquatic permitted (with 1.5x movement cost)
    const swimRes = grid.evaluateMove({ x: 1, y: 0 }, { dx: 0, dy: 1 }, aquaticProfile, world);
    expect(swimRes.success).toBe(true);
    if (swimRes.success) {
      expect(swimRes.targetX).toBe(1);
      expect(swimRes.targetY).toBe(1);
      expect(swimRes.stepDurationMs).toBe(300); // 200ms * 1.5 = 300ms
    }

    // Flying permitted
    const flyRes = grid.evaluateMove({ x: 1, y: 0 }, { dx: 0, dy: 1 }, flyingProfile, world);
    expect(flyRes.success).toBe(true);
  });

  it('allows flying entities to bypass walls', () => {
    const grid = new GridMovementController();

    const walkWall = grid.evaluateMove({ x: 1, y: 0 }, { dx: 1, dy: 0 }, walkingProfile, world);
    expect(walkWall.success).toBe(false);

    const flyWall = grid.evaluateMove({ x: 1, y: 0 }, { dx: 1, dy: 0 }, flyingProfile, world);
    expect(flyWall.success).toBe(true);
  });

  it('blocks moves into occupied coordinates or out of map bounds', () => {
    const grid = new GridMovementController();

    // Occupied
    const occupiedRes = grid.evaluateMove({ x: 3, y: 0 }, { dx: 1, dy: 0 }, walkingProfile, world);
    expect(occupiedRes.success).toBe(false);
    if (!occupiedRes.success) expect(occupiedRes.reason).toBe('OCCUPIED');

    // Bounds
    const boundsRes = grid.evaluateMove({ x: 0, y: 0 }, { dx: -1, dy: 0 }, walkingProfile, world);
    expect(boundsRes.success).toBe(false);
    if (!boundsRes.success) expect(boundsRes.reason).toBe('BOUNDS');
  });

  it('calculates continuous delta moves in FreeMovementController', () => {
    const free = new FreeMovementController();
    const res = free.evaluateMove({ x: 5.0, y: 5.0 }, { dx: 1, dy: 0, dt: 0.1 }, walkingProfile, world);

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.targetX).toBeCloseTo(5.5, 2); // 5.0 + 5.0 * 0.1
      expect(res.targetY).toBe(5.0);
    }
  });
});
