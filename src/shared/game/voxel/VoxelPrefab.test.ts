import { describe, it, expect } from 'vitest';
import { VoxelWorld } from './VoxelWorldDoc';
import {
  extractVoxelPrefab,
  stampVoxelPrefab,
  rotatePrefab90CW,
  unpackPrefabVoxels,
} from './VoxelPrefab';
import {
  VOXEL_WORD_GUNMETAL,
  VOXEL_WORD_AIR,
  VoxelShape,
  VoxelOrientation,
  withVoxelOrientation,
  getVoxelOrientation,
} from './VoxelWord';

describe('VoxelPrefab — 3D Blueprint Extraction, Stamping & 90° CW Rotation', () => {
  it('extracts a 10x10x10 structure, stamps it into another location, and verifies voxel fidelity', () => {
    const world = new VoxelWorld({
      id: 'prefab_test',
      name: 'Prefab Test',
      dimensions: { widthChunks: 2, depthChunks: 2, heightChunks: 1 },
    });

    // Populate a 10x10x10 structure at (5, 5, 5) with a distinctive pattern
    for (let x = 5; x <= 14; x++) {
      for (let y = 5; y <= 14; y++) {
        for (let z = 5; z <= 14; z++) {
          if ((x + y + z) % 2 === 0) {
            world.setVoxel(x, y, z, VOXEL_WORD_GUNMETAL);
          }
        }
      }
    }

    // Extract prefab
    const prefab = extractVoxelPrefab(
      world,
      { minX: 5, minY: 5, minZ: 5, maxX: 14, maxY: 14, maxZ: 14 },
      'Watchtower'
    );

    expect(prefab.dimensions).toEqual([10, 10, 10]);
    expect(prefab.name).toBe('Watchtower');

    // Stamp at another region (35, 5, 35)
    const { modifiedCount } = stampVoxelPrefab(world, prefab, 35, 5, 35);
    expect(modifiedCount).toBeGreaterThan(0);

    // Verify fidelity
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        for (let z = 0; z < 10; z++) {
          const orig = world.getVoxel(5 + x, 5 + y, 5 + z);
          const stamped = world.getVoxel(35 + x, 5 + y, 35 + z);
          expect(stamped).toBe(orig);
        }
      }
    }
  });

  it('rotates a 3x2x5 prefab 90° CW around Y-axis with matrix transformation', () => {
    const world = new VoxelWorld({
      id: 'rot_test',
      name: 'Rotation Test',
      dimensions: { widthChunks: 1, depthChunks: 1, heightChunks: 1 },
    });

    // Create 3 (dx) x 2 (dy) x 5 (dz) structure:
    // Place a directional stair at local (0, 0, 0) facing NORTH
    const northStair = withVoxelOrientation(
      (1 << 24) | (VoxelShape.STAIRS_STRAIGHT << 12) | 1,
      VoxelOrientation.NORTH
    );
    world.setVoxel(0, 0, 0, northStair);

    const prefab = extractVoxelPrefab(
      world,
      { minX: 0, minY: 0, minZ: 0, maxX: 2, maxY: 1, maxZ: 4 },
      'Staircase'
    );
    expect(prefab.dimensions).toEqual([3, 2, 5]);

    // Rotate 90° CW
    const rot1 = rotatePrefab90CW(prefab);
    // [dx=3, dy=2, dz=5] -> [dz=5, dy=2, dx=3]
    expect(rot1.dimensions).toEqual([5, 2, 3]);

    // In 90 CW around Y:
    // (x=0, y=0, z=0) maps to (rotX = dz - 1 - z = 5 - 1 - 0 = 4, rotY = 0, rotZ = x = 0)
    const rotatedVoxels = unpackPrefabVoxels(rot1);
    // Index in rot1 (5 x 2 x 3): rotX + rotY * 5 + rotZ * 10 = 4 + 0 + 0 = 4
    const rotatedStair = rotatedVoxels[4];
    expect(rotatedStair).not.toBe(VOXEL_WORD_AIR);
    // Orientation should have rotated from NORTH (0) to EAST (1)
    expect(getVoxelOrientation(rotatedStair)).toBe(VoxelOrientation.EAST);
  });

  it('four successive 90° CW rotations restores exact original dimensions and orientation (360° identity)', () => {
    const world = new VoxelWorld({
      id: 'identity_test',
      name: 'Identity Test',
      dimensions: { widthChunks: 1, depthChunks: 1, heightChunks: 1 },
    });

    world.setVoxel(
      1,
      2,
      3,
      withVoxelOrientation(
        (1 << 24) | (VoxelShape.SLOPE_45 << 12) | 2,
        VoxelOrientation.WEST
      )
    );

    const original = extractVoxelPrefab(
      world,
      { minX: 0, minY: 0, minZ: 0, maxX: 4, maxY: 3, maxZ: 6 },
      'Asymmetric'
    );
    expect(original.dimensions).toEqual([5, 4, 7]);

    const r90 = rotatePrefab90CW(original);
    expect(r90.dimensions).toEqual([7, 4, 5]);

    const r180 = rotatePrefab90CW(r90);
    expect(r180.dimensions).toEqual([5, 4, 7]);

    const r270 = rotatePrefab90CW(r180);
    expect(r270.dimensions).toEqual([7, 4, 5]);

    const r360 = rotatePrefab90CW(r270);
    expect(r360.dimensions).toEqual([5, 4, 7]);

    const origData = unpackPrefabVoxels(original);
    const r360Data = unpackPrefabVoxels(r360);

    for (let i = 0; i < origData.length; i++) {
      expect(r360Data[i]).toBe(origData[i]);
    }
  });
});
