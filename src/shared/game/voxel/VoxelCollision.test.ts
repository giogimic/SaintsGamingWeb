import { describe, it, expect } from 'vitest';
import { SweptAABBController, VoxelWorldCollisionQuery } from './VoxelCollision';
import { VOXEL_WORD_AIR, VOXEL_WORD_GUNMETAL, VoxelPhysics, VoxelShape } from './VoxelWord';

describe('SweptAABBController — 3D Voxel Collision Resolution', () => {
  it('prevents tunneling when running at 20 m/s toward a 1-block thick voxel wall over 1,000 iterations', () => {
    // Map with a 1-block thick wall at x = 10 (occupying x: [10..11], y: [0..10], z: [-5..5])
    // All other areas are air.
    const world: VoxelWorldCollisionQuery = {
      getVoxel: (wx, wy, wz) => {
        if (wx === 10 && wy >= 0 && wy <= 10 && wz >= -5 && wz <= 5) {
          return VOXEL_WORD_GUNMETAL; // solid obstacle
        }
        if (wy === 0) {
          return VOXEL_WORD_GUNMETAL; // floor
        }
        return VOXEL_WORD_AIR;
      },
    };

    const controller = new SweptAABBController();
    const dt = 1 / 60; // 60 Hz tick (~0.01667s)
    const highSpeed = 20; // 20 m/s

    let pos = { x: 0, y: 1.0, z: 0 };
    let vel = { x: highSpeed, y: 0, z: 0 };

    for (let tick = 0; tick < 1000; tick++) {
      vel = { x: highSpeed, y: 0, z: 0 };
      const res = controller.simulateMove(world, pos, vel, dt);
      pos = res.position;

      // Player width is 0.6m, halfW is 0.3m.
      // The wall is at x=10, so player center x MUST never exceed 10 - 0.3 = 9.7m.
      // And player must never penetrate into or tunnel past x=10.
      expect(pos.x).toBeLessThanOrEqual(9.7001);
      expect(pos.x).toBeGreaterThan(0);
      if (tick > 50) {
        // Player should be resting against wall
        expect(res.hitWall).toBe(true);
        expect(Math.abs(pos.x - 9.7)).toBeLessThan(0.01);
      }
    }
  });

  it('automatically steps up over a 0.5m slab without jump input', () => {
    // Floor at y=0. At x=5, there is a bottom half-slab (y: [1..1.5]).
    const world: VoxelWorldCollisionQuery = {
      getVoxel: (wx, wy, wz) => {
        if (wx === 5 && wy === 1 && wz === 0) {
          // Bottom half slab (height 0.5m)
          // Word with shape SLAB_BOTTOM (bits 12..16 = 3) and physics SOLID_OBSTACLE (bits 24..27 = 1)
          return (1 << 24) | (VoxelShape.SLAB_BOTTOM << 12) | 1;
        }
        if (wy === 0) {
          return VOXEL_WORD_GUNMETAL; // Ground floor at y=0, surface at y=1
        }
        return VOXEL_WORD_AIR;
      },
    };

    const controller = new SweptAABBController();
    const dt = 1 / 60;
    let pos = { x: 4.2, y: 1.0, z: 0 };
    let vel = { x: 3.0, y: 0, z: 0 }; // Walk forward at 3 m/s

    let stepped = false;
    for (let i = 0; i < 30; i++) {
      const res = controller.simulateMove(world, pos, vel, dt);
      pos = res.position;
      if (res.steppedUp) {
        stepped = true;
      }
    }

    expect(stepped).toBe(true);
    // Entity should have stepped up onto the 0.5m slab (y = 1.5) and moved past x = 5
    expect(pos.y).toBeCloseTo(1.5, 2);
    expect(pos.x).toBeGreaterThan(5.0);
  });

  it('slides smoothly along walls during diagonal movement', () => {
    // Wall running along Z axis at x = 5 (facing West)
    const world: VoxelWorldCollisionQuery = {
      getVoxel: (wx, wy, wz) => {
        if (wx === 5 && wy >= 0 && wy <= 3) {
          return VOXEL_WORD_GUNMETAL;
        }
        if (wy === 0) return VOXEL_WORD_GUNMETAL;
        return VOXEL_WORD_AIR;
      },
    };

    const controller = new SweptAABBController();
    const dt = 1 / 60;
    // Moving diagonally Northeast: +X and +Z
    let pos = { x: 4.65, y: 1.0, z: 0 };
    const vel = { x: 5.0, y: 0, z: 5.0 };

    const res = controller.simulateMove(world, pos, vel, dt);
    // X should be clamped against the wall (5 - 0.3 = 4.7), while Z moves freely (+Z)
    expect(res.hitWall).toBe(true);
    expect(res.position.x).toBeCloseTo(4.7, 2);
    expect(res.position.z).toBeGreaterThan(0);
    expect(res.velocity.x).toBe(0); // zeroed along collision normal
    expect(res.velocity.z).toBe(5.0); // slide along Z
  });
});
