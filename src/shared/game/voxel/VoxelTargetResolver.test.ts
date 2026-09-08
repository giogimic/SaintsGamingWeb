import { describe, it, expect } from 'vitest';
import { VoxelWorld } from './VoxelWorldDoc';
import { resolveVoxelTarget, getTargetVoxelCoord, RawPickTarget, VoxelRay } from './VoxelTargetResolver';


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
    if (res && res.kind === 'voxel-hit') {
      expect(res.hitNormal).toEqual({ x: 0, y: 1, z: 0 }); // Snapped to dominant +Y normal
  
      // In Add / Extrude mode: P_target = P_hit + n (adjacent voxel above)
      const addCoord = getTargetVoxelCoord('add', res)!;
      const extrudeCoord = getTargetVoxelCoord('extrude', res)!;
      expect(addCoord.wy).toBe(res.voxelCoord.wy + 1);
      expect(extrudeCoord.wy).toBe(res.voxelCoord.wy + 1);
  
      // In Carve / Paint / Erase mode: P_target = P_hit (underlying voxel)
      const carveCoord = getTargetVoxelCoord('carve', res)!;
      const paintCoord = getTargetVoxelCoord('paint', res)!;
      expect(carveCoord.wy).toBe(res.voxelCoord.wy);
      expect(paintCoord.wy).toBe(res.voxelCoord.wy);
    } else {
      throw new Error('Expected voxel-hit');
    }
  });


});
