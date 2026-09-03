import { describe, it, expect } from 'vitest';
import { VoxelWorld } from './VoxelWorldDoc';
import { resolveVoxelTarget, getTargetVoxelCoord, RawPickTarget, VoxelRay } from './VoxelTargetResolver';
import { VOXEL_WORD_GUNMETAL } from './VoxelWord';

describe('VoxelTargetResolver — Raycast, Surface Normal & Elevation Correction', () => {
  it('computes exact intersected face normal and separates Add vs Carve target coordinates', () => {
    const world = new VoxelWorld({
      id: 'target_test',
      name: 'Target Test',
      dimensions: { widthChunks: 2, depthChunks: 2, heightChunks: 1 },
    });

    // Pick top face (+Y) of a block
    const mockPick: RawPickTarget = {
      hit: true,
      pickedPoint: { x: 5.5 + world.originOffsetX, y: 1.0 + world.originOffsetY, z: 5.5 + world.originOffsetZ },
      getNormal: () => ({ x: 0.1, y: 0.98, z: 0.05 }), // raw normal predominantly +Y
    };

    const res = resolveVoxelTarget(mockPick, world);
    expect(res).not.toBeNull();
    expect(res!.hitNormal).toEqual({ x: 0, y: 1, z: 0 }); // Snapped to dominant +Y normal

    // In Add / Extrude mode: P_target = P_hit + n (adjacent voxel above)
    const addCoord = getTargetVoxelCoord('add', res!);
    const extrudeCoord = getTargetVoxelCoord('extrude', res!);
    expect(addCoord.wy).toBe(res!.voxelCoord.wy + 1);
    expect(extrudeCoord.wy).toBe(res!.voxelCoord.wy + 1);

    // In Carve / Paint / Erase mode: P_target = P_hit (underlying voxel)
    const carveCoord = getTargetVoxelCoord('carve', res!);
    const paintCoord = getTargetVoxelCoord('paint', res!);
    expect(carveCoord.wy).toBe(res!.voxelCoord.wy);
    expect(paintCoord.wy).toBe(res!.voxelCoord.wy);
  });

  it('derives ground plane directly from elevated top voxel surface for upward normals', () => {
    const world = new VoxelWorld({
      id: 'elevation_test',
      name: 'Elevation Test',
      dimensions: { widthChunks: 2, depthChunks: 2, heightChunks: 1 },
    });

    // Build elevated pillar at wx=10, wz=10 reaching up to wy=25
    for (let wy = 0; wy <= 25; wy++) {
      world.setVoxel(10, wy, 10, VOXEL_WORD_GUNMETAL);
    }

    // Ray shooting downward toward wx=10, wz=10
    const meshCoord = world.voxelToWorldMesh(10, 0, 10);
    const ray: VoxelRay = {
      origin: { x: meshCoord.x + 0.5, y: 50, z: meshCoord.z + 0.5 },
      direction: { x: 0, y: -1, z: 0 },
    };

    const res = resolveVoxelTarget(null, world, ray);
    expect(res).not.toBeNull();
    expect(res!.hitNormal).toEqual({ x: 0, y: 1, z: 0 });
    // Should target the top elevated voxel at wy=25, not Y=0 / wy=16
    expect(res!.voxelCoord.wx).toBe(10);
    expect(res!.voxelCoord.wz).toBe(10);
    expect(res!.voxelCoord.wy).toBe(25);
  });
});
