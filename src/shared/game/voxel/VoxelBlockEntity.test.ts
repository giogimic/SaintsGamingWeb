import { describe, it, expect } from 'vitest';
import {
  VoxelWorld,
  generateDefaultWorldDoc,
} from './VoxelWorldDoc';
import {
  packVoxel,
  VoxelShape,
  VoxelPhysics,
  getVoxelShape,
  getVoxelMaterial,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_GRASS,
  VOXEL_MAT_STONE,
  VOXEL_MAT_WATER,
  VOXEL_MAT_FARMLAND_DRY,
  VOXEL_MAT_FARMLAND_MOIST,
  VOXEL_MAT_CROP_WHEAT,
} from './VoxelWord';
import {
  createFarmlandEntity,
  createCropEntity,
  updateFarmlandHydration,
  tillSoil,
  plantCrop,
  tickCropGrowth,
  harvestCrop,
} from './VoxelBlockEntity';

describe('Voxel Block Entities & Agricultural Simulation', () => {
  it('tills grass/dirt into farmland with block entity', () => {
    const world = new VoxelWorld('farm_realm', 'Farm Realm', 2, 2);
    // Put dirt at (5, 10, 5)
    world.setVoxel(5, 10, 5, packVoxel(VOXEL_MAT_DIRT, VoxelShape.FULL_CUBE));

    const tilled = tillSoil(world, 5, 10, 5);
    expect(tilled).toBe(true);

    const word = world.getVoxel(5, 10, 5);
    expect(getVoxelShape(word)).toBe(VoxelShape.FARMLAND);
    expect(getVoxelMaterial(word)).toBe(VOXEL_MAT_FARMLAND_DRY);

    const entity = world.getBlockEntity(5, 10, 5);
    expect(entity).toBeDefined();
    expect(entity?.type).toBe('farmland');
    expect(entity?.data.moisture).toBe(0);
  });

  it('rejects tilling non-soil blocks like stone', () => {
    const world = new VoxelWorld('farm_realm', 'Farm Realm', 2, 2);
    world.setVoxel(5, 10, 5, packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE));

    const tilled = tillSoil(world, 5, 10, 5);
    expect(tilled).toBe(false);
  });

  it('hydrates farmland when water is within 4 blocks horizontally', () => {
    const world = new VoxelWorld('farm_realm', 'Farm Realm', 2, 2);
    // Farmland at (10, 10, 10)
    world.setVoxel(10, 10, 10, packVoxel(VOXEL_MAT_FARMLAND_DRY, VoxelShape.FARMLAND));
    world.setBlockEntity(10, 10, 10, createFarmlandEntity(10, 10, 10, 0));

    // Place water 3 blocks away at (13, 10, 10)
    world.setVoxel(13, 10, 10, packVoxel(VOXEL_MAT_WATER, VoxelShape.FULL_CUBE, 0, 0, VoxelPhysics.SWIMMABLE_FLUID));

    const moisture = updateFarmlandHydration(world, 10, 10, 10);
    expect(moisture).toBe(7);

    // Block material should transition to moist
    const word = world.getVoxel(10, 10, 10);
    expect(getVoxelMaterial(word)).toBe(VOXEL_MAT_FARMLAND_MOIST);

    const entity = world.getBlockEntity(10, 10, 10);
    expect(entity?.data.moisture).toBe(7);
  });

  it('plants seeds on farmland and enforces valid placement', () => {
    const world = new VoxelWorld('farm_realm', 'Farm Realm', 2, 2);
    world.setVoxel(8, 10, 8, packVoxel(VOXEL_MAT_FARMLAND_DRY, VoxelShape.FARMLAND));

    // Can plant on farmland
    const planted = plantCrop(world, 8, 11, 8, 'wheat');
    expect(planted).toBe(true);

    const cropWord = world.getVoxel(8, 11, 8);
    expect(getVoxelShape(cropWord)).toBe(VoxelShape.CROSS_QUAD);
    expect(getVoxelMaterial(cropWord)).toBe(VOXEL_MAT_CROP_WHEAT);

    const cropEntity = world.getBlockEntity(8, 11, 8);
    expect(cropEntity).toBeDefined();
    expect(cropEntity?.type).toBe('crop');
    expect(cropEntity?.data.cropType).toBe('wheat');
    expect(cropEntity?.data.growthStage).toBe(0);

    // Cannot plant on stone
    world.setVoxel(12, 10, 12, packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE));
    const plantedStone = plantCrop(world, 12, 11, 12, 'wheat');
    expect(plantedStone).toBe(false);
  });

  it('simulates crop growth and harvests mature yield', () => {
    const world = new VoxelWorld('farm_realm', 'Farm Realm', 2, 2);
    world.setVoxel(8, 10, 8, packVoxel(VOXEL_MAT_FARMLAND_MOIST, VoxelShape.FARMLAND));
    world.setBlockEntity(8, 10, 8, createFarmlandEntity(8, 10, 8, 7)); // fully moist

    plantCrop(world, 8, 11, 8, 'wheat');

    // Tick growth until stage 7
    for (let i = 0; i < 7; i++) {
      const res = tickCropGrowth(world, 8, 11, 8);
      expect(res.grown).toBe(true);
    }

    const cropEntity = world.getBlockEntity(8, 11, 8);
    expect(cropEntity?.data.growthStage).toBe(7);

    // Harvest
    const harvestResult = harvestCrop(world, 8, 11, 8);
    expect(harvestResult.harvested).toBe(true);
    expect(harvestResult.itemDrops.length).toBeGreaterThan(0);
    expect(harvestResult.itemDrops.some((d) => d.itemId === 'item_wheat')).toBe(true);

    // Resets to stage 0 after harvest
    expect(cropEntity?.data.growthStage).toBe(0);
  });

  it('persists and restores block entities through world serialization', () => {
    const world = new VoxelWorld('farm_save_realm', 'Save Realm', 2, 2);
    world.setVoxel(2, 5, 2, packVoxel(VOXEL_MAT_FARMLAND_MOIST, VoxelShape.FARMLAND));
    world.setBlockEntity(2, 5, 2, createFarmlandEntity(2, 5, 2, 7));

    plantCrop(world, 2, 6, 2, 'carrot');
    const crop = world.getBlockEntity(2, 6, 2);
    if (crop) crop.data.growthStage = 4;

    // Serialize to Doc
    const doc = world.serializeToDoc();
    expect(doc.blockEntities).toBeDefined();
    expect(doc.blockEntities?.['2_5_2']).toBeDefined();
    expect(doc.blockEntities?.['2_6_2']).toBeDefined();

    // Deserialize
    const restored = VoxelWorld.deserializeFromDoc(doc);
    const restoredFarmland = restored.getBlockEntity(2, 5, 2);
    expect(restoredFarmland).toBeDefined();
    expect(restoredFarmland?.type).toBe('farmland');
    expect(restoredFarmland?.data.moisture).toBe(7);

    const restoredCrop = restored.getBlockEntity(2, 6, 2);
    expect(restoredCrop).toBeDefined();
    expect(restoredCrop?.type).toBe('crop');
    expect(restoredCrop?.data.cropType).toBe('carrot');
    expect(restoredCrop?.data.growthStage).toBe(4);
  });
});
