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
});
