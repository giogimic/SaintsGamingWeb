import { describe, expect, it } from 'vitest';
import {
  isLegacyChunkRle,
  isLegacy16CubicDoc,
  migrateLegacyDocTo32Cubic,
  LEGACY_CHUNK_TOTAL_CELLS,
} from './chunkMigration';
import { VoxelChunk, CHUNK_TOTAL_CELLS } from './VoxelChunk';
import { VoxelWorld, type VoxelWorldDocV3 } from './VoxelWorldDoc';
import { packVoxel, VoxelShape, VoxelPhysics, VOXEL_MAT_GRASS, VOXEL_MAT_STONE } from './VoxelWord';
import { generateGridFromVoxelDoc, TILE_LOGIC_WALL, TILE_LOGIC_WALK } from './voxelToGrid';

describe('32³ Isotropic Chunk Migration & Voxel-To-Grid Projection', () => {
  it('detects legacy 16x16x32 RLE chunk payloads (8192 cells)', () => {
    // 8192 cells in RLE format
    const legacyRle = [8192, 1];
    expect(isLegacyChunkRle(legacyRle)).toBe(true);

    const modern32Rle = [32768, 1];
    expect(isLegacyChunkRle(modern32Rle)).toBe(false);
  });

  it('migrates legacy 16x16x32 VoxelWorldDocV3 to 32³ chunks preserving voxel positions', () => {
    // Construct legacy 16x16x32 world doc
    const stoneWord = packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE);
    const legacyDoc: VoxelWorldDocV3 = {
      formatVersion: 3,
      id: 'test_legacy',
      name: 'Legacy Map',
      gameId: 'saints',
      version: 1,
      blockSizePx: 64,
      dimensions: {
        widthChunks: 2, // 2 * 16 = 32 blocks
        depthChunks: 2, // 2 * 16 = 32 blocks
        heightChunks: 1, // 32 blocks
      },
      palette: [],
      chunks: {
        // Chunk (1, 1, 0) has a stone block at local (5, 10, 5)
        // In legacy 16x16x32: index = 5 + 5 * 16 + 10 * 256 = 5 + 80 + 2560 = 2645
        '1_1_0': [
          2645, 0,
          1, stoneWord,
          8192 - 2646, 0,
        ],
      },
    };

    expect(isLegacy16CubicDoc(legacyDoc)).toBe(true);

    const migrated = migrateLegacyDocTo32Cubic(legacyDoc);
    expect(migrated.dimensions.widthChunks).toBe(1); // 32 blocks = 1 chunk of 32
    expect(migrated.dimensions.depthChunks).toBe(1); // 32 blocks = 1 chunk of 32
    expect(migrated.dimensions.heightChunks).toBe(1);

    // World coordinate: wx = 1 * 16 + 5 = 21. wz = 1 * 16 + 5 = 21. wy = 0 + 10 = 10.
    // In new 32³: cx = 0, cz = 0, cy = 0. lx = 21, lz = 21, ly = 10.
    const world = VoxelWorld.deserializeFromDoc(migrated);
    expect(world.getVoxel(21, 10, 21)).toBe(stoneWord);
  });

  it('generates a 2D logic grid accurately from a 3D VoxelWorldDoc', () => {
    const world = new VoxelWorld('grid_test', 'Grid Test', 1, 1, 1);
    world.generateDefaultWorld(); // Gunmetal foundation at Y=0..15, surface at Y=15

    const doc = world.serializeToDoc();
    const grid = generateGridFromVoxelDoc(doc, 10, 10);

    expect(grid.length).toBe(10);
    expect(grid[0].length).toBe(10);

    // Perimeter should be walls
    expect(grid[0][0]).toBe(TILE_LOGIC_WALL);
    expect(grid[0][5]).toBe(TILE_LOGIC_WALL);
    expect(grid[9][9]).toBe(TILE_LOGIC_WALL);

    // Interior should be walkable
    expect(grid[5][5]).toBe(TILE_LOGIC_WALK);
  });
});
