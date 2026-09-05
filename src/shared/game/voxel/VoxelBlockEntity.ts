/**
 * Saints Gaming — Dynamic Voxel Block Entity & State Data System
 *
 * Expands static 32-bit voxel words with rich dynamic block state, inventories,
 * agricultural growth tickers, and interactive state machines.
 */

import {
  VoxelShape,
  packVoxel,
  unpackVoxel,
  getVoxelMaterial,
  getVoxelShape,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_GRASS,
  VOXEL_MAT_WATER,
  VOXEL_MAT_FARMLAND_DRY,
  VOXEL_MAT_FARMLAND_MOIST,
  VOXEL_MAT_CROP_WHEAT,
  VOXEL_MAT_CROP_CARROT,
  VOXEL_MAT_CROP_HERB,
  VOXEL_WORD_AIR,
  VoxelPhysics,
} from './VoxelWord';
import type { VoxelWorld } from './VoxelWorldDoc';

export type VoxelBlockEntityType =
  | 'farmland'
  | 'crop'
  | 'container'
  | 'furnace'
  | 'crafting_station'
  | 'sign'
  | 'light_source'
  | 'custom';

export interface VoxelBlockEntity {
  id: string; // e.g. "be_10_5_12"
  type: VoxelBlockEntityType;
  x: number;
  y: number;
  z: number;
  data: Record<string, any>;
  createdAt?: number;
  updatedAt?: number;
}

export interface FarmlandBlockData {
  moisture: number; // 0..7 (0 = bone dry, 7 = fully saturated)
  lastMoistureUpdateTick?: number;
  trampled?: boolean;
}

export interface CropBlockData {
  cropType: 'wheat' | 'carrot' | 'potato' | 'herb' | 'berry';
  growthStage: number; // 0..7 (7 = fully mature harvestable)
  maxStage?: number; // default 7
  plantedAtTick?: number;
  growthProgress?: number; // 0.0 .. 1.0 towards next stage
}

export interface ContainerBlockData {
  slots: Array<{
    slotIndex: number;
    itemId: string;
    quantity: number;
    metadata?: Record<string, any>;
  }>;
  capacity?: number;
  customName?: string;
  locked?: boolean;
}

/** Formats a coordinate key for block entity lookups */
export function getBlockEntityKey(wx: number, wy: number, wz: number): string {
  return `${wx}_${wy}_${wz}`;
}

/** Factory: Create Farmland Block Entity */
export function createFarmlandEntity(
  wx: number,
  wy: number,
  wz: number,
  moisture: number = 0
): VoxelBlockEntity {
  return {
    id: `farmland_${wx}_${wy}_${wz}`,
    type: 'farmland',
    x: wx,
    y: wy,
    z: wz,
    data: {
      moisture: Math.max(0, Math.min(7, moisture)),
      lastMoistureUpdateTick: Date.now(),
      trampled: false,
    } satisfies FarmlandBlockData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Factory: Create Crop Block Entity */
export function createCropEntity(
  wx: number,
  wy: number,
  wz: number,
  cropType: 'wheat' | 'carrot' | 'potato' | 'herb' | 'berry' = 'wheat',
  initialStage: number = 0
): VoxelBlockEntity {
  return {
    id: `crop_${wx}_${wy}_${wz}`,
    type: 'crop',
    x: wx,
    y: wy,
    z: wz,
    data: {
      cropType,
      growthStage: Math.max(0, Math.min(7, initialStage)),
      maxStage: 7,
      plantedAtTick: Date.now(),
      growthProgress: 0.0,
    } satisfies CropBlockData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Factory: Create Container / Storage Block Entity */
export function createContainerEntity(
  wx: number,
  wy: number,
  wz: number,
  capacity = 16,
  customName = 'Chest'
): VoxelBlockEntity {
  return {
    id: `container_${wx}_${wy}_${wz}`,
    type: 'container',
    x: wx,
    y: wy,
    z: wz,
    data: {
      slots: [],
      capacity,
      customName,
      locked: false,
    } satisfies ContainerBlockData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Checks for water voxels within a 4-block horizontal radius and updates farmland moisture.
 * Returns the new moisture level (0..7).
 */
export function updateFarmlandHydration(
  world: VoxelWorld,
  wx: number,
  wy: number,
  wz: number,
  searchRadius = 4
): number {
  let hasNearbyWater = false;

  // Scan a horizontal Chebyshev box within searchRadius, vertical range [-1..+1]
  searchLoop: for (let dx = -searchRadius; dx <= searchRadius; dx++) {
    for (let dz = -searchRadius; dz <= searchRadius; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = wx + dx;
        const ny = wy + dy;
        const nz = wz + dz;
        const word = world.getVoxelWithHalo(nx, ny, nz);
        const mat = getVoxelMaterial(word);
        if (mat === VOXEL_MAT_WATER) {
          hasNearbyWater = true;
          break searchLoop;
        }
      }
    }
  }

  const existing = world.getBlockEntity(wx, wy, wz);
  const currentMoisture = existing?.data?.moisture ?? 0;
  let newMoisture = currentMoisture;

  if (hasNearbyWater) {
    newMoisture = 7; // fully hydrated
  } else {
    // Decays if no water is present
    newMoisture = Math.max(0, currentMoisture - 1);
  }

  // Update voxel material tint between dry and moist farmland
  const currentWord = world.getVoxel(wx, wy, wz);
  const currentShape = getVoxelShape(currentWord);
  if (currentShape === VoxelShape.FARMLAND) {
    const newMat = newMoisture > 0 ? VOXEL_MAT_FARMLAND_MOIST : VOXEL_MAT_FARMLAND_DRY;
    world.setVoxel(wx, wy, wz, packVoxel(newMat, VoxelShape.FARMLAND, 0, 0, VoxelPhysics.SOLID_OBSTACLE));
  }

  // Persist updated block entity
  if (existing) {
    existing.data.moisture = newMoisture;
    existing.updatedAt = Date.now();
  } else {
    world.setBlockEntity(wx, wy, wz, createFarmlandEntity(wx, wy, wz, newMoisture));
  }

  return newMoisture;
}

/**
 * Tills a grass/dirt block into farmland.
 * Transforms the voxel word to VoxelShape.FARMLAND and registers a Farmland Block Entity.
 */
export function tillSoil(world: VoxelWorld, wx: number, wy: number, wz: number): boolean {
  if (!world.canEditVoxel(wx, wy, wz)) return false;

  const currentWord = world.getVoxel(wx, wy, wz);
  const currentMat = getVoxelMaterial(currentWord);

  // Must be soil/dirt/grass
  if (currentMat !== VOXEL_MAT_DIRT && currentMat !== VOXEL_MAT_GRASS) {
    return false;
  }

  // Block directly above must be transparent/air
  const aboveWord = world.getVoxel(wx, wy + 1, wz);
  if (aboveWord !== VOXEL_WORD_AIR && getVoxelShape(aboveWord) !== VoxelShape.AIR) {
    return false;
  }

  // Check initial hydration
  const initialMoisture = updateFarmlandHydration(world, wx, wy, wz);
  const mat = initialMoisture > 0 ? VOXEL_MAT_FARMLAND_MOIST : VOXEL_MAT_FARMLAND_DRY;
  const farmlandWord = packVoxel(mat, VoxelShape.FARMLAND, 0, 0, VoxelPhysics.SOLID_OBSTACLE);

  world.setVoxel(wx, wy, wz, farmlandWord);
  world.setBlockEntity(wx, wy, wz, createFarmlandEntity(wx, wy, wz, initialMoisture));
  return true;
}

/**
 * Plants a seed on top of farmland.
 */
export function plantCrop(
  world: VoxelWorld,
  wx: number,
  wy: number,
  wz: number,
  cropType: 'wheat' | 'carrot' | 'potato' | 'herb' | 'berry' = 'wheat'
): boolean {
  const belowWord = world.getVoxel(wx, wy - 1, wz);
  const belowShape = getVoxelShape(belowWord);

  if (belowShape !== VoxelShape.FARMLAND) {
    return false; // Can only plant on farmland
  }

  const currentWord = world.getVoxel(wx, wy, wz);
  if (currentWord !== VOXEL_WORD_AIR && getVoxelShape(currentWord) !== VoxelShape.AIR) {
    return false; // Spot must be open air
  }

  let cropMat = VOXEL_MAT_CROP_WHEAT;
  if (cropType === 'carrot') cropMat = VOXEL_MAT_CROP_CARROT;
  else if (cropType === 'herb') cropMat = VOXEL_MAT_CROP_HERB;

  const cropWord = packVoxel(cropMat, VoxelShape.CROSS_QUAD, 0, 0, VoxelPhysics.PASS_THROUGH);
  world.setVoxel(wx, wy, wz, cropWord);
  world.setBlockEntity(wx, wy, wz, createCropEntity(wx, wy, wz, cropType, 0));
  return true;
}

/**
 * Ticks a crop block entity towards maturity.
 */
export function tickCropGrowth(
  world: VoxelWorld,
  wx: number,
  wy: number,
  wz: number
): { grown: boolean; newStage: number } {
  const cropEntity = world.getBlockEntity(wx, wy, wz);
  if (!cropEntity || cropEntity.type !== 'crop') {
    return { grown: false, newStage: 0 };
  }

  const currentStage = cropEntity.data.growthStage ?? 0;
  const maxStage = cropEntity.data.maxStage ?? 7;
  if (currentStage >= maxStage) {
    return { grown: false, newStage: currentStage }; // Already fully mature
  }

  // Check farmland moisture underneath
  const farmlandEntity = world.getBlockEntity(wx, wy - 1, wz);
  const moisture = farmlandEntity?.data?.moisture ?? 0;

  // Hydrated crops grow faster
  const growthIncrement = moisture > 0 ? 1 : 0.5;
  const currentProgress = (cropEntity.data.growthProgress ?? 0) + growthIncrement;

  if (currentProgress >= 1.0) {
    const nextStage = Math.min(maxStage, currentStage + 1);
    cropEntity.data.growthStage = nextStage;
    cropEntity.data.growthProgress = 0.0;
    cropEntity.updatedAt = Date.now();
    return { grown: true, newStage: nextStage };
  } else {
    cropEntity.data.growthProgress = currentProgress;
    return { grown: false, newStage: currentStage };
  }
}

/**
 * Harvests a mature crop, returning yield items and resetting or clearing the crop block.
 */
export function harvestCrop(
  world: VoxelWorld,
  wx: number,
  wy: number,
  wz: number
): { harvested: boolean; itemDrops: Array<{ itemId: string; count: number }> } {
  const cropEntity = world.getBlockEntity(wx, wy, wz);
  if (!cropEntity || cropEntity.type !== 'crop') {
    return { harvested: false, itemDrops: [] };
  }

  const stage = cropEntity.data.growthStage ?? 0;
  const maxStage = cropEntity.data.maxStage ?? 7;
  if (stage < maxStage) {
    return { harvested: false, itemDrops: [] }; // Not mature yet
  }

  const cropType = cropEntity.data.cropType || 'wheat';
  const drops: Array<{ itemId: string; count: number }> = [];

  if (cropType === 'wheat') {
    drops.push({ itemId: 'item_wheat', count: 1 + Math.floor(Math.random() * 2) });
    drops.push({ itemId: 'seed_wheat', count: 1 + Math.floor(Math.random() * 3) });
  } else if (cropType === 'carrot') {
    drops.push({ itemId: 'item_carrot', count: 2 + Math.floor(Math.random() * 3) });
  } else if (cropType === 'herb') {
    drops.push({ itemId: 'item_clean_herb', count: 1 + Math.floor(Math.random() * 2) });
    drops.push({ itemId: 'seed_herb', count: 1 });
  } else {
    drops.push({ itemId: `item_${cropType}`, count: 2 });
  }

  // Reset to stage 0 (perennial) or clear block
  cropEntity.data.growthStage = 0;
  cropEntity.data.growthProgress = 0.0;
  cropEntity.updatedAt = Date.now();

  return { harvested: true, itemDrops: drops };
}
