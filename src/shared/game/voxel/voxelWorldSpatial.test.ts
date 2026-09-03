import { describe, it, expect } from 'vitest';
import {
  VoxelWorld,
  SpatialVoxelWorldManager,
  generateDefaultWorldDoc,
} from './VoxelWorldDoc';
import { packVoxel, VOXEL_WORD_AIR } from './VoxelWord';
import { VOXEL_MAT_STONE, VOXEL_MAT_GRASS } from './VoxelMaterialDefinition';

describe('VoxelWorld Spatial Adjacency & Boundary Halo', () => {
  it('connects two adjacent worlds and resolves halo boundary voxels seamlessly', () => {
    // World A (West): 2x2 chunks = 32x32 blocks
    const docA = generateDefaultWorldDoc(2, 2, 64);
    docA.id = 'map_west';
    const worldA = VoxelWorld.deserializeFromDoc(docA);

    // World B (East): 2x2 chunks = 32x32 blocks
    const docB = generateDefaultWorldDoc(2, 2, 64);
    docB.id = 'map_east';
    const worldB = VoxelWorld.deserializeFromDoc(docB);

    // Set an identifiable stone block on the western edge of World B at (wx=0, wy=16, wz=10)
    const stoneWord = packVoxel(VOXEL_MAT_STONE, 0, 0, 0, 1);
    worldB.setVoxel(0, 16, 10, stoneWord);

    // Set an identifiable grass block on the eastern edge of World A at (wx=31, wy=16, wz=10)
    const grassWord = packVoxel(VOXEL_MAT_GRASS, 0, 0, 0, 1);
    worldA.setVoxel(31, 16, 10, grassWord);

    // Register adjacency: World A's east is World B; World B's west is World A
    worldA.registerAdjacentNeighbor('east', worldB);
    worldB.registerAdjacentNeighbor('west', worldA);

    // Querying World A beyond its eastern border (wx = 32, wy = 16, wz = 10)
    // with halo sampling should seamlessly return World B's block!
    const sampleEast = worldA.getVoxelWithHalo(32, 16, 10);
    expect(sampleEast & 0xfff).toBe(VOXEL_MAT_STONE);

    // Querying World B beyond its western border (wx = -1, wy = 16, wz = 10)
    // should seamlessly return World A's perimeter block
    const sampleWest = worldB.getVoxelWithHalo(-1, 16, 10);
    expect(sampleWest & 0xfff).toBe(VOXEL_MAT_GRASS);
  });

  it('SpatialVoxelWorldManager manages multiple worlds and connects adjacent regions', () => {
    const manager = SpatialVoxelWorldManager.getInstance();
    manager.clear();

    const world1 = new VoxelWorld('realm_north', 'North Realm', 2, 2);
    const world2 = new VoxelWorld('realm_south', 'South Realm', 2, 2);

    manager.registerWorld(world1, 0, 32);
    manager.registerWorld(world2, 0, 0);

    expect(manager.getWorld('realm_north')).toBe(world1);
    expect(manager.getWorld('realm_south')).toBe(world2);

    const connected = manager.connectAdjacent('realm_south', 'realm_north', 'north');
    expect(connected).toBe(true);

    expect(world2.adjacentNeighbors.get('north')?.mapId).toBe('realm_north');
    expect(world1.adjacentNeighbors.get('south')?.mapId).toBe('realm_south');

    manager.clear();
  });

  it('canEditVoxel enforces spatial boundaries to prevent accidental cross-boundary corruption', () => {
    const world = new VoxelWorld('guarded_realm', 'Guarded', 2, 2);
    // 32x32 blocks
    expect(world.canEditVoxel(0, 10, 0)).toBe(true);
    expect(world.canEditVoxel(31, 10, 31)).toBe(true);
    // Out of bounds
    expect(world.canEditVoxel(-1, 10, 10)).toBe(false);
    expect(world.canEditVoxel(32, 10, 10)).toBe(false);
    expect(world.canEditVoxel(10, 10, 32)).toBe(false);
    expect(world.canEditVoxel(10, 10, -1)).toBe(false);
  });
});
