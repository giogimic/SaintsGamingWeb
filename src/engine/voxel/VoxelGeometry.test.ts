import { describe, expect, it } from 'vitest';
import { VoxelMeshBuilder } from './VoxelGeometry';
import { VoxelOrientation } from '@/shared/game/voxel/VoxelWord';

describe('Voxel 3D Geometry Builders', () => {
  it('generates valid geometry for straight 2-step stairs across orientations', () => {
    const builder = new VoxelMeshBuilder();
    builder.addStairsStraight(0, 0, 0, VoxelOrientation.NORTH);
    expect(builder.positions.length).toBeGreaterThan(0);
    expect(builder.normals.length).toBe(builder.positions.length);
    expect(builder.uvs.length).toBe((builder.positions.length / 3) * 2);
    expect(builder.indices.length).toBeGreaterThan(0);
    expect(builder.colors.length).toBe((builder.positions.length / 3) * 4);

    // Test other orientations without errors
    builder.clear();
    builder.addStairsStraight(0, 0, 0, VoxelOrientation.SOUTH);
    expect(builder.positions.length).toBeGreaterThan(0);

    builder.clear();
    builder.addStairsStraight(0, 0, 0, VoxelOrientation.EAST);
    expect(builder.positions.length).toBeGreaterThan(0);

    builder.clear();
    builder.addStairsStraight(0, 0, 0, VoxelOrientation.WEST);
    expect(builder.positions.length).toBeGreaterThan(0);
  });

  it('generates valid geometry for corner stairs', () => {
    const builder = new VoxelMeshBuilder();
    builder.addStairsCorner(0, 0, 0, VoxelOrientation.NORTH);
    expect(builder.positions.length).toBeGreaterThan(0);
    expect(builder.indices.length).toBeGreaterThan(0);

    builder.clear();
    builder.addStairsCorner(0, 0, 0, VoxelOrientation.EAST);
    expect(builder.positions.length).toBeGreaterThan(0);
  });

  it('generates valid geometry for gentle slopes (base + top)', () => {
    const builder = new VoxelMeshBuilder();
    builder.addSlopeGentleBase(0, 0, 0, VoxelOrientation.NORTH);
    expect(builder.positions.length).toBeGreaterThan(0);
    expect(builder.normals.length).toBe(builder.positions.length);

    builder.clear();
    builder.addSlopeGentleTop(0, 0, 0, VoxelOrientation.NORTH);
    expect(builder.positions.length).toBeGreaterThan(0);

    builder.clear();
    builder.addSlopeGentleBase(0, 0, 0, VoxelOrientation.EAST);
    expect(builder.positions.length).toBeGreaterThan(0);

    builder.clear();
    builder.addSlopeGentleTop(0, 0, 0, VoxelOrientation.SOUTH);
    expect(builder.positions.length).toBeGreaterThan(0);
  });

  it('generates valid geometry for outer and inner corner slopes', () => {
    const builder = new VoxelMeshBuilder();
    builder.addSlopeCornerOuter(0, 0, 0, VoxelOrientation.NORTH);
    expect(builder.positions.length).toBeGreaterThan(0);

    builder.clear();
    builder.addSlopeCornerInner(0, 0, 0, VoxelOrientation.NORTH);
    expect(builder.positions.length).toBeGreaterThan(0);
  });

  it('generates valid geometry for diagonal prisms', () => {
    const builder = new VoxelMeshBuilder();
    builder.addPrismDiagonal(0, 0, 0, VoxelOrientation.NORTH);
    expect(builder.positions.length).toBeGreaterThan(0);

    builder.clear();
    builder.addPrismDiagonal(0, 0, 0, VoxelOrientation.EAST);
    expect(builder.positions.length).toBeGreaterThan(0);
  });

  it('generates valid geometry for centered columns and fence rails', () => {
    const builder = new VoxelMeshBuilder();
    builder.addColumnCenter(0, 0, 0);
    expect(builder.positions.length).toBeGreaterThan(0);

    builder.clear();
    builder.addFenceRail(0, 0, 0, VoxelOrientation.NORTH);
    expect(builder.positions.length).toBeGreaterThan(0);

    builder.clear();
    builder.addFenceRail(0, 0, 0, VoxelOrientation.EAST);
    expect(builder.positions.length).toBeGreaterThan(0);
  });

  it('correctly discriminates full cube occluders from slopes and non-cubes via isVoxelFaceOccluding', async () => {
    const { 
      packVoxel, 
      VoxelShape, 
      VoxelOrientation, 
      VoxelPhysics, 
      VOXEL_MAT_GRASS, 
      VOXEL_MAT_AIR,
      VOXEL_WORD_AIR,
      isVoxelFaceOccluding 
    } = await import('@/shared/game/voxel/VoxelWord');

    const fullCube = packVoxel(VOXEL_MAT_GRASS, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    const slope = packVoxel(VOXEL_MAT_GRASS, VoxelShape.SLOPE_45, VoxelOrientation.NORTH, 0, VoxelPhysics.WALKABLE_SLOPE);
    const slab = packVoxel(VOXEL_MAT_GRASS, VoxelShape.SLAB_BOTTOM, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    const stairs = packVoxel(VOXEL_MAT_GRASS, VoxelShape.STAIRS_STRAIGHT, VoxelOrientation.NORTH, 0, VoxelPhysics.WALKABLE_SLOPE);
    const column = packVoxel(VOXEL_MAT_GRASS, VoxelShape.COLUMN_CENTER, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    const air = VOXEL_WORD_AIR;

    expect(isVoxelFaceOccluding(fullCube)).toBe(true);
    expect(isVoxelFaceOccluding(slope)).toBe(false);
    expect(isVoxelFaceOccluding(slab)).toBe(false);
    expect(isVoxelFaceOccluding(stairs)).toBe(false);
    expect(isVoxelFaceOccluding(column)).toBe(false);
    expect(isVoxelFaceOccluding(air)).toBe(false);
  });

  it('generates uniform outward-facing quads for all 6 faces of a cube with 4 vertices and 2 triangles per face', () => {
    const builder = new VoxelMeshBuilder();
    const wx = 5, wy = 16, wz = 5;

    // Top Face (+Y)
    builder.addQuad(
      [wx, wy + 1, wz],
      [wx + 1, wy + 1, wz],
      [wx + 1, wy + 1, wz + 1],
      [wx, wy + 1, wz + 1],
      [0, 1, 0]
    );

    // Bottom Face (-Y)
    builder.addQuad(
      [wx, wy, wz + 1],
      [wx + 1, wy, wz + 1],
      [wx + 1, wy, wz],
      [wx, wy, wz],
      [0, -1, 0]
    );

    // North Face (+Z)
    builder.addQuad(
      [wx + 1, wy, wz + 1],
      [wx, wy, wz + 1],
      [wx, wy + 1, wz + 1],
      [wx + 1, wy + 1, wz + 1],
      [0, 0, 1]
    );

    // South Face (-Z)
    builder.addQuad(
      [wx, wy, wz],
      [wx + 1, wy, wz],
      [wx + 1, wy + 1, wz],
      [wx, wy + 1, wz],
      [0, 0, -1]
    );

    // East Face (+X)
    builder.addQuad(
      [wx + 1, wy, wz + 1],
      [wx + 1, wy, wz],
      [wx + 1, wy + 1, wz],
      [wx + 1, wy + 1, wz + 1],
      [1, 0, 0]
    );

    // West Face (-X)
    builder.addQuad(
      [wx, wy, wz],
      [wx, wy, wz + 1],
      [wx, wy + 1, wz + 1],
      [wx, wy + 1, wz],
      [-1, 0, 0]
    );

    // 6 faces * 4 vertices = 24 vertices
    expect(builder.positions.length).toBe(24 * 3);
    expect(builder.normals.length).toBe(24 * 3);
    // 6 faces * 2 triangles * 3 indices = 36 indices
    expect(builder.indices.length).toBe(36);
    // 6 faces * 4 UV pairs = 48 floats
    expect(builder.uvs.length).toBe(24 * 2);
  });
});
