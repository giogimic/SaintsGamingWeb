import { describe, expect, it } from 'vitest';
import {
  generateVoxelWorldDoc,
  generateChunkVoxels,
  DeterministicRandom,
  DeterministicNoise2D,
  hashSeed,
} from './VoxelWorldGenerator';
import { VOXEL_MAT_GRASS, VOXEL_MAT_STONE, VOXEL_MAT_SAND, VOXEL_MAT_WATER } from './VoxelWord';
import { VoxelWorld } from './VoxelWorldDoc';

describe('VoxelWorldGenerator (Procedural Voxel Generation)', () => {
  it('computes deterministic seed hashes and pseudo-random streams', () => {
    const hash1 = hashSeed('saints_realm_1337');
    const hash2 = hashSeed('saints_realm_1337');
    expect(hash1).toBe(hash2);

    const rngA = new DeterministicRandom('test_seed');
    const rngB = new DeterministicRandom('test_seed');
    const valuesA = [rngA.seraphtFloat(), rngA.seraphtFloat(), rngA.seraphtInt(1, 100)];
    const valuesB = [rngB.seraphtFloat(), rngB.seraphtFloat(), rngB.seraphtInt(1, 100)];
    expect(valuesA).toEqual(valuesB);
  });

  it('generates completely identical voxel chunks from the same seed (determinism)', () => {
    const configA = {
      id: 'test_map_1',
      name: 'Test Map',
      widthChunks: 2,
      depthChunks: 2,
      mode: 'procedural' as const,
      terrainProfile: 'rolling_hills' as const,
      seed: 'alpha_seed_42',
      baseMaterial: VOXEL_MAT_GRASS,
    };

    const configB = {
      ...configA,
      id: 'test_map_2',
    };

    const docA = generateVoxelWorldDoc(configA);
    const docB = generateVoxelWorldDoc(configB);

    // Chunks should be byte-for-byte / word-for-word identical
    expect(Object.keys(docA.chunks)).toEqual(Object.keys(docB.chunks));
    for (const key of Object.keys(docA.chunks)) {
      expect(docA.chunks[key]).toEqual(docB.chunks[key]);
    }
  });

  it('generates divergent terrain from different seeds', () => {
    const configA = {
      id: 'test_map_1',
      name: 'Test Map 1',
      widthChunks: 2,
      depthChunks: 2,
      mode: 'procedural' as const,
      terrainProfile: 'mountains' as const,
      seed: 'seed_mountain_alpha',
    };

    const configB = {
      ...configA,
      id: 'test_map_2',
      name: 'Test Map 2',
      seed: 'seed_mountain_beta',
    };

    const docA = generateVoxelWorldDoc(configA);
    const docB = generateVoxelWorldDoc(configB);

    // At least one chunk's RLE stream should differ
    let hasDifference = false;
    for (const key of Object.keys(docA.chunks)) {
      if (JSON.stringify(docA.chunks[key]) !== JSON.stringify(docB.chunks[key])) {
        hasDifference = true;
        break;
      }
    }
    expect(hasDifference).toBe(true);
  });

  it('generates an empty canvas for blank mode', () => {
    const doc = generateVoxelWorldDoc({
      id: 'blank_world',
      name: 'Blank World',
      widthChunks: 2,
      depthChunks: 2,
      mode: 'blank',
    });

    const world = VoxelWorld.deserializeFromDoc(doc);
    for (let wx = 0; wx < world.totalWidthBlocks; wx++) {
      for (let wz = 0; wz < world.totalDepthBlocks; wz++) {
        for (let wy = 0; wy < world.totalHeightBlocks; wy++) {
          expect(world.getVoxel(wx, wy, wz)).toBe(0); // All air
        }
      }
    }
  });

  it('generates a flat solid foundation up to baseElevation', () => {
    const baseElev = 14;
    const doc = generateVoxelWorldDoc({
      id: 'foundation_world',
      name: 'Foundation World',
      widthChunks: 1,
      depthChunks: 1,
      mode: 'foundation',
      baseMaterial: VOXEL_MAT_STONE,
      baseElevation: baseElev,
    });

    const world = VoxelWorld.deserializeFromDoc(doc);
    // Under baseElevation should be solid
    expect(world.getVoxel(5, 0, 5)).not.toBe(0);
    expect(world.getVoxel(5, baseElev - 1, 5)).not.toBe(0);
    // At and above baseElevation should be air
    expect(world.getVoxel(5, baseElev, 5)).toBe(0);
    expect(world.getVoxel(5, 31, 5)).toBe(0);
  });

  it('generates islands profile with water and landforms', () => {
    const doc = generateVoxelWorldDoc({
      id: 'islands_world',
      name: 'Islands World',
      widthChunks: 2,
      depthChunks: 2,
      mode: 'procedural',
      terrainProfile: 'islands',
      seed: 'ocean_breeze',
      baseMaterial: VOXEL_MAT_GRASS,
      baseElevation: 10,
      elevationRange: 8,
    });

    const world = VoxelWorld.deserializeFromDoc(doc);
    let foundWater = false;
    let foundSolid = false;

    for (let wx = 0; wx < world.totalWidthBlocks; wx++) {
      for (let wz = 0; wz < world.totalDepthBlocks; wz++) {
        for (let wy = 0; wy < 20; wy++) {
          const cell = world.getVoxel(wx, wy, wz);
          const mat = cell & 0xfff;
          if (mat === VOXEL_MAT_WATER) foundWater = true;
          if (mat === VOXEL_MAT_STONE || mat === VOXEL_MAT_SAND || mat === VOXEL_MAT_GRASS) foundSolid = true;
        }
      }
    }

    expect(foundWater).toBe(true);
    expect(foundSolid).toBe(true);
  });
});
