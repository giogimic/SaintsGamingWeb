import { describe, expect, it } from 'vitest';
import {
  packVoxel,
  unpackVoxel,
  VoxelShape,
  VoxelOrientation,
  VoxelPhysics,
  VoxelLogic,
  isVoxelSolid,
  isVoxelAir,
  VoxelChunk,
  CHUNK_TOTAL_CELLS,
  CHUNK_SIZE_X,
  CHUNK_SIZE_Z,
  CHUNK_SIZE_Y,
  VoxelWorld,
  VoxelTransactionBuilder,
  VoxelHistoryStack,
  resolveSlopeShape,
  convertLegacy2DToVoxelWorld,
  resolveVoxelTarget,
  VOXEL_MAT_GRASS,
  VOXEL_MAT_GUNMETAL,
  VOXEL_WORD_GUNMETAL,
  VOXEL_WORD_GRASS,
  getVoxelBrushOffsets,
  getVoxelMaterialDef,
  getFaceUv,
} from './index';

describe('Voxel Core Engine (Option A)', () => {
  describe('VoxelWord Bitpacking', () => {
    it('accurately packs and unpacks all 32-bit fields', () => {
      const packed = packVoxel(
        255, // materialId
        VoxelShape.SLOPE_45, // shapeId
        VoxelOrientation.EAST, // orientation
        9, // aoTint
        VoxelPhysics.WALKABLE_SLOPE, // physics
        VoxelLogic.WARP_GATE // logic
      );

      const unpacked = unpackVoxel(packed);
      expect(unpacked.materialId).toBe(255);
      expect(unpacked.shapeId).toBe(VoxelShape.SLOPE_45);
      expect(unpacked.orientation).toBe(VoxelOrientation.EAST);
      expect(unpacked.aoTint).toBe(9);
      expect(unpacked.physics).toBe(VoxelPhysics.WALKABLE_SLOPE);
      expect(unpacked.logic).toBe(VoxelLogic.WARP_GATE);
    });

    it('correctly evaluates solid vs air status', () => {
      const air = packVoxel(0, VoxelShape.AIR, VoxelOrientation.NORTH, 0, VoxelPhysics.PASS_THROUGH);
      const solid = packVoxel(1, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
      const slope = packVoxel(2, VoxelShape.SLOPE_45, VoxelOrientation.NORTH, 0, VoxelPhysics.WALKABLE_SLOPE);

      expect(isVoxelAir(air)).toBe(true);
      expect(isVoxelAir(solid)).toBe(false);

      expect(isVoxelSolid(solid)).toBe(true);
      expect(isVoxelSolid(slope)).toBe(true);
      expect(isVoxelSolid(air)).toBe(false);
    });
  });

  describe('VoxelChunk & Spatial Indexing', () => {
    it('maps 3D local coordinates to 1D index and back', () => {
      const x = 7;
      const y = 19;
      const z = 11;

      const idx = VoxelChunk.getIndex(x, y, z);
      expect(idx).toBeLessThan(CHUNK_TOTAL_CELLS);

      const { lx, ly, lz } = VoxelChunk.getLocalCoords(idx);
      expect(lx).toBe(x);
      expect(ly).toBe(y);
      expect(lz).toBe(z);
    });

    it('serializes and deserializes RLE with exact data fidelity', () => {
      const chunk = new VoxelChunk(0, 0, 0);
      chunk.generateDefaultBase();

      // Write test voxels
      const testWord1 = packVoxel(50, VoxelShape.FULL_CUBE);
      const testWord2 = packVoxel(99, VoxelShape.SLOPE_45, VoxelOrientation.WEST);
      chunk.set(3, 20, 5, testWord1);
      chunk.set(4, 20, 5, testWord2);

      const rle = chunk.serializeRLE();
      expect(rle.length).toBeGreaterThan(0);
      expect(rle.length).toBeLessThan(CHUNK_TOTAL_CELLS); // Confirms compression

      const restored = VoxelChunk.deserializeRLE(rle, 0, 0, 0);
      expect(restored.get(3, 20, 5)).toBe(testWord1);
      expect(restored.get(4, 20, 5)).toBe(testWord2);
      expect(restored.get(0, 0, 0)).toBe(VOXEL_WORD_GUNMETAL); // bottom base preserved
      expect(restored.get(0, 31, 0)).toBe(0); // top air preserved
    });
  });

  describe('VoxelWorld & Global Coordinates', () => {
    it('accurately maps world coordinates across multiple chunks', () => {
      const world = new VoxelWorld('test_map', 'Test Map', 4, 4, 1, 64);
      world.generateDefaultWorld();

      // Write across chunk boundary (cx: 1, cz: 2, cy: 0)
      const wx = 16 + 5; // cx: 1, lx: 5
      const wz = 32 + 9; // cz: 2, lz: 9
      const wy = 12;

      const word = packVoxel(77, VoxelShape.STAIRS_STRAIGHT);
      world.setVoxel(wx, wy, wz, word);

      expect(world.getVoxel(wx, wy, wz)).toBe(word);
      const chunk = world.getChunk(1, 2, 0);
      expect(chunk).toBeDefined();
      expect(chunk?.get(5, 12, 9)).toBe(word);
    });
  });

  describe('Unified Voxel Transaction Pipeline', () => {
    it('records, applies, undoes, and redoes voxel transactions cleanly', () => {
      const world = new VoxelWorld('tx_test', 'Transaction Test', 2, 2, 1);
      const history = new VoxelHistoryStack();

      const builder = new VoxelTransactionBuilder('Paint Grass Patch', 'tx_test');
      const grassWord = packVoxel(VOXEL_MAT_GRASS, VoxelShape.FULL_CUBE);

      builder.record(world, 5, 16, 5, grassWord);
      builder.record(world, 6, 16, 5, grassWord);
      const tx = builder.build();
      expect(tx).not.toBeNull();

      if (tx) {
        // Apply transaction
        world.setVoxel(5, 16, 5, grassWord);
        world.setVoxel(6, 16, 5, grassWord);
        history.push(tx);

        expect(world.getVoxel(5, 16, 5)).toBe(grassWord);
        expect(world.getVoxel(6, 16, 5)).toBe(grassWord);

        // Undo
        history.undo(world);
        expect(world.getVoxel(5, 16, 5)).toBe(0); // Air
        expect(world.getVoxel(6, 16, 5)).toBe(0);

        // Redo
        history.redo(world);
        expect(world.getVoxel(5, 16, 5)).toBe(grassWord);
        expect(world.getVoxel(6, 16, 5)).toBe(grassWord);
      }
    });
  });

  describe('Slope Resolution & Auto-Tiling Solver', () => {
    it('detects single step drop and returns SLOPE_45 shape', () => {
      const world = new VoxelWorld('slope_test', 'Slope Test', 1, 1, 1);
      const solid = packVoxel(1, VoxelShape.FULL_CUBE);

      // Create higher step at y=1 (x:5, z:5) with solid back (x:5, z:6)
      world.setVoxel(5, 1, 5, solid);
      world.setVoxel(5, 1, 6, solid); // solid north neighbor

      // Lower step at y=0
      world.setVoxel(5, 0, 4, solid);

      const res = resolveSlopeShape(world, 5, 1, 5);
      expect(res.shapeId).toBe(VoxelShape.SLOPE_45);
      expect(res.orientation).toBe(VoxelOrientation.SOUTH);
    });
  });

  describe('Legacy 2D Map Migration Converter', () => {
    it('converts a 2D tile grid into a 3D volumetric VoxelWorld', () => {
      const legacy2D = {
        id: 'legacy_demo',
        name: 'Legacy Demo',
        grid: [
          [1, 1, 2],
          [1, 4, 1],
          [3, 1, 1],
        ],
      };

      const world = convertLegacy2DToVoxelWorld(legacy2D);
      expect(world.totalWidthBlocks).toBe(16);
      expect(world.totalDepthBlocks).toBe(16);
      expect(world.totalHeightBlocks).toBe(32);

      // Surface elevation is at y = 15
      const surfaceY = 15;
      const walkVoxel = world.getVoxel(0, surfaceY, 0);
      expect(isVoxelSolid(walkVoxel)).toBe(true);

      // (2, 0) was solid wall (2) -> cliff extruded at y = 16
      const cliffVoxel = world.getVoxel(2, surfaceY + 1, 0);
      expect(isVoxelSolid(cliffVoxel)).toBe(true);

      // (1, 1) was water (4) -> fluid physics
      const waterVoxel = world.getVoxel(1, surfaceY, 1);
      const unpackedWater = unpackVoxel(waterVoxel);
      expect(unpackedWater.physics).toBe(VoxelPhysics.SWIMMABLE_FLUID);
    });
  });

  describe('VoxelTargetResolver', () => {
    it('accurately resolves 3D picked block and adjacent placement voxel for top face', () => {
      const world = new VoxelWorld('target_test', 'Target Test', 2, 2, 1);
      world.generateDefaultWorld();

      // Top of chunk foundation at wy=15 is at Babylon mesh Y = -1 to 0 (top face at Y=0)
      // Center of world is X=0, Z=0 (originOffsetX = -16, originOffsetZ = -16)
      // A hit at (0.5, 0.0, 0.5) with normal (0, 1, 0)
      const mockPick = {
        hit: true,
        pickedMesh: { name: 'voxel_chunk_0_0_0' },
        pickedPoint: { x: 0.5, y: 0.0, z: 0.5 },
        getNormal: () => ({ x: 0, y: 1, z: 0 }),
      };

      const res = resolveVoxelTarget(mockPick, world);
      expect(res).not.toBeNull();
      if (res) {
        expect(res.hit).toBe(true);
        expect(res.voxelCoord.wx).toBe(16); // 0.5 - (-16) = 16.5 -> floor = 16
        expect(res.voxelCoord.wz).toBe(16);
        expect(res.voxelCoord.wy).toBe(15); // Top solid block of foundation
        expect(res.adjacentVoxelCoord.wy).toBe(16); // Air block right above
        expect(res.hitNormal).toEqual({ x: 0, y: 1, z: 0 });
      }
    });

    it('accurately resolves side face hits for building out adjacent blocks', () => {
      const world = new VoxelWorld('side_test', 'Side Test', 2, 2, 1);
      world.generateDefaultWorld();

      // Hit east face of a block at (meshX=1.0, meshY=-0.5, meshZ=0.5) with normal (+1, 0, 0)
      const mockPick = {
        hit: true,
        pickedMesh: { name: 'voxel_chunk_0_0_0' },
        pickedPoint: { x: 1.0, y: -0.5, z: 0.5 },
        getNormal: () => ({ x: 1, y: 0, z: 0 }),
      };

      const res = resolveVoxelTarget(mockPick, world);
      expect(res).not.toBeNull();
      if (res) {
        expect(res.hitNormal).toEqual({ x: 1, y: 0, z: 0 });
        expect(res.voxelCoord.wx).toBe(16);
        expect(res.adjacentVoxelCoord.wx).toBe(17); // Neighbor block to the East
      }
    });

    it('falls back to analytical foundation raycast when ray passes through open air', () => {
      const world = new VoxelWorld('ray_test', 'Ray Test', 2, 2, 1);
      world.generateDefaultWorld();

      // Camera ray pointing down towards (X=0, Y=0, Z=0)
      const ray = {
        origin: { x: 0, y: 10, z: 0 },
        direction: { x: 0, y: -1, z: 0 },
      };

      const res = resolveVoxelTarget(null, world, ray);
      expect(res).not.toBeNull();
      if (res) {
        expect(res.hit).toBe(true);
        expect(res.voxelCoord.wx).toBe(16);
        expect(res.voxelCoord.wz).toBe(16);
        expect(res.voxelCoord.wy).toBe(15);
        expect(res.adjacentVoxelCoord.wy).toBe(16);
      }
    });
  });

  describe('Voxel-Space Brush Footprint Math', () => {
    it('calculates deterministic footprints for odd and even brush sizes', () => {
      const rad1 = getVoxelBrushOffsets(1);
      expect(rad1).toEqual([{ dx: 0, dz: 0 }]);
      expect(rad1.length).toBe(1);

      const rad2 = getVoxelBrushOffsets(2);
      expect(rad2.length).toBe(4);
      expect(rad2).toContainEqual({ dx: 0, dz: 0 });
      expect(rad2).toContainEqual({ dx: 1, dz: 1 });

      const rad3 = getVoxelBrushOffsets(3);
      expect(rad3.length).toBe(9);
      expect(rad3).toContainEqual({ dx: -1, dz: -1 });
      expect(rad3).toContainEqual({ dx: 0, dz: 0 });
      expect(rad3).toContainEqual({ dx: 1, dz: 1 });
    });
  });

  describe('Canonical Voxel Material Definition & Face UV Mapping', () => {
    it('retrieves distinct face UV coordinates for Lush Grass block', () => {
      const grassDef = getVoxelMaterialDef(VOXEL_MAT_GRASS);
      expect(grassDef.slug).toBe('lush_grass');

      const topUv = getFaceUv(grassDef, 'top');
      const bottomUv = getFaceUv(grassDef, 'bottom');
      const northUv = getFaceUv(grassDef, 'north');

      expect(topUv).toEqual([0.0, 0.25, 0.25, 0.50]);
      expect(bottomUv).toEqual([0.25, 0.25, 0.50, 0.50]);
      expect(northUv).toEqual([0.0, 0.75, 0.25, 1.0]);
    });
  });

  describe('Boundary Chunk Dirtying', () => {
    it('marks adjacent neighbor chunk dirty when a voxel on the chunk boundary changes', () => {
      const world = new VoxelWorld('dirty_test', 'Dirty Test', 2, 2, 1);
      world.generateDefaultWorld();

      const chunk0 = world.getChunk(0, 0, 0)!;
      const chunk1 = world.getChunk(1, 0, 0)!;

      chunk0.isDirty = false;
      chunk1.isDirty = false;

      // Set voxel at boundary lx = 15 of chunk 0 (wx = 15)
      world.setVoxel(15, 16, 5, VOXEL_WORD_GRASS);

      expect(chunk0.isDirty).toBe(true);
      expect(chunk1.isDirty).toBe(true); // Neighbor chunk 1 was dirtied!
    });
  });
});
