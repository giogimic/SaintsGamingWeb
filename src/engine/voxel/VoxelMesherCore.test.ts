import { describe, it, expect } from 'vitest';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { meshChunkWithHalo34, computeVertexAO, aoToFactor } from './VoxelMesherCore';
import { VOXEL_WORD_GUNMETAL, VOXEL_WORD_AIR } from '@/shared/game/voxel/VoxelWord';

describe('VoxelMesherCore — 34³ Halo Ingestion & Ambient Occlusion', () => {
  it('extracts a 34x34x34 halo buffer with exactly 39,304 elements', () => {
    const world = new VoxelWorld({
      id: 'test_world',
      name: 'Test World',
      dimensions: { widthChunks: 2, depthChunks: 2, heightChunks: 1 },
    });
    world.generateDefaultWorld();

    const halo = world.extractChunkHalo34(0, 0, 0);
    expect(halo.length).toBe(34 * 34 * 34);
    expect(halo.length).toBe(39304);
  });

  it('culls boundary faces between two touching solid chunks with zero phantom faces', () => {
    const world = new VoxelWorld({
      id: 'touching_chunks',
      name: 'Touching Chunks',
      dimensions: { widthChunks: 2, depthChunks: 1, heightChunks: 1 },
    });

    // Solid wall spanning across chunk 0 (x: 0..31) and chunk 1 (x: 32..63) at y=5, z=5
    for (let x = 0; x < 64; x++) {
      world.setVoxel(x, 5, 5, VOXEL_WORD_GUNMETAL);
    }

    const halo0 = world.extractChunkHalo34(0, 0, 0);
    const res0 = meshChunkWithHalo34({
      chunkKey: '0,0,0',
      cx: 0,
      cy: 0,
      cz: 0,
      halo: halo0,
      originOffsetX: 0,
      originOffsetY: 0,
      originOffsetZ: 0,
    });

    const halo1 = world.extractChunkHalo34(1, 0, 0);
    const res1 = meshChunkWithHalo34({
      chunkKey: '1,0,0',
      cx: 1,
      cy: 0,
      cz: 0,
      halo: halo1,
      originOffsetX: 0,
      originOffsetY: 0,
      originOffsetZ: 0,
    });

    // In Chunk 0, block at x=31 has an East neighbor at x=32 in Chunk 1.
    // Because x=32 is solid gunmetal, the East face (+X) of block x=31 MUST be culled!
    // Check all normals in res0: no normal with [1, 0, 0] should be positioned at x=32!
    for (let i = 0; i < res0.positions.length; i += 3) {
      const px = res0.positions[i];
      const nx = res0.normals[i];
      if (Math.abs(px - 32) < 0.001 && nx > 0.9) {
        expect.fail('Found unculled phantom East face between chunk boundaries!');
      }
    }

    // In Chunk 1, block at x=0 (world x=32) has West neighbor at x=31 in Chunk 0.
    // Its West face (-X) MUST be culled!
    for (let i = 0; i < res1.positions.length; i += 3) {
      const px = res1.positions[i];
      const nx = res1.normals[i];
      if (Math.abs(px - 32) < 0.001 && nx < -0.9) {
        expect.fail('Found unculled phantom West face between chunk boundaries!');
      }
    }
  });

  it('computes concave vertex ambient occlusion to naturally darken corners', () => {
    // Flat exposed block: 0 side neighbors, 0 corner neighbors -> AO = 3 (1.0 factor)
    const flatAO = computeVertexAO(VOXEL_WORD_AIR, VOXEL_WORD_AIR, VOXEL_WORD_AIR);
    expect(flatAO).toBe(3);
    expect(aoToFactor(flatAO)).toBe(1.0);

    // Concave inner corner: both adjacent side blocks solid -> AO = 0 (0.5 factor)
    const concaveCornerAO = computeVertexAO(VOXEL_WORD_GUNMETAL, VOXEL_WORD_GUNMETAL, VOXEL_WORD_GUNMETAL);
    expect(concaveCornerAO).toBe(0);
    expect(aoToFactor(concaveCornerAO)).toBe(0.5);

    // Single step obstacle: 1 side solid, 0 corner -> AO = 2 (0.84 factor)
    const stepAO = computeVertexAO(VOXEL_WORD_GUNMETAL, VOXEL_WORD_AIR, VOXEL_WORD_AIR);
    expect(stepAO).toBe(2);
    expect(aoToFactor(stepAO)).toBe(0.84);
  });

  it('mutating a voxel on a chunk boundary automatically invalidates the neighbor chunk', () => {
    const world = new VoxelWorld({
      id: 'dirty_test',
      name: 'Dirty Test',
      dimensions: { widthChunks: 2, depthChunks: 1, heightChunks: 1 },
    });

    const c0 = world.getChunk(0, 0, 0, true)!;
    const c1 = world.getChunk(1, 0, 0, true)!;
    c0.isDirty = false;
    c1.isDirty = false;

    // Mutate boundary voxel at x=31 in chunk 0 (touching chunk 1 at x=32)
    world.setVoxel(31, 10, 5, VOXEL_WORD_GUNMETAL);

    expect(c0.isDirty).toBe(true);
    expect(c1.isDirty).toBe(true); // Neighbor chunk automatically flagged dirty!
  });
});
