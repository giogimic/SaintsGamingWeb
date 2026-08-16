/**
 * Saints Gaming — Farming Plot Soil, Watering & Growth Lifecycle Engine (Bible 08)
 * Manages agricultural patches, compost tiers, watering cycles, disease mitigation, and harvest yields.
 */

export type PatchType = 'ALLOTMENT' | 'HERB' | 'FLOWER' | 'TREE';

export type CompostTier = 'NONE' | 'COMPOST' | 'SUPERCOMPOST' | 'ULTRACOMPOST';

export type CropStatus =
  | 'WEEDS'
  | 'EMPTY'
  | 'GROWING'
  | 'DISEASED'
  | 'DEAD'
  | 'HARVESTABLE';

export interface SeedDefinition {
  id: string;
  name: string;
  patchType: PatchType;
  reqFarmingLevel: number;
  maxStages: number;
  stageDurationMs: number;
  baseXp: number;
  produceItemId: string;
  minYield: number;
  maxYield: number;
}

export interface FarmingPatchState {
  id: string;
  type: PatchType;
  status: CropStatus;
  seedId?: string;
  currentStage: number;
  maxStages: number;
  plantedAt?: number;
  lastGrowthTick?: number;
  stageDurationMs: number;
  compost: CompostTier;
  isWatered: boolean;
  livesRemaining: number;
}

/**
 * Creates an empty farming patch.
 */
export function createFarmingPatch(
  id: string,
  type: PatchType = 'ALLOTMENT',
  startWithWeeds: boolean = true
): FarmingPatchState {
  return {
    id,
    type,
    status: startWithWeeds ? 'WEEDS' : 'EMPTY',
    currentStage: 0,
    maxStages: 4,
    stageDurationMs: 60000, // 1 minute default per stage
    compost: 'NONE',
    isWatered: false,
    livesRemaining: 3,
  };
}

/**
 * Rakes weeds from an overgrown patch to make it plantable.
 */
export function rakePatch(patch: FarmingPatchState): { success: boolean; xpAwarded: number } {
  if (patch.status !== 'WEEDS') {
    return { success: false, xpAwarded: 0 };
  }
  patch.status = 'EMPTY';
  return { success: true, xpAwarded: 4 }; // 4 Farming XP for clearing weeds
}

/**
 * Applies compost to the soil to reduce disease chance and boost harvest yield.
 */
export function applyCompost(
  patch: FarmingPatchState,
  tier: CompostTier
): { success: boolean; reason?: string } {
  if (patch.status !== 'EMPTY' && patch.status !== 'WEEDS') {
    return { success: false, reason: 'Compost can only be applied to empty soil.' };
  }
  patch.compost = tier;
  return { success: true };
}

/**
 * Plants a seed in the prepared patch.
 */
export function plantSeed(
  patch: FarmingPatchState,
  seed: SeedDefinition,
  playerFarmingLevel: number,
  nowMs: number = Date.now()
): { success: boolean; reason?: string } {
  if (patch.status !== 'EMPTY') {
    return { success: false, reason: 'Patch is not ready for planting.' };
  }
  if (patch.type !== seed.patchType) {
    return { success: false, reason: `Seed requires a ${seed.patchType} patch.` };
  }
  if (playerFarmingLevel < seed.reqFarmingLevel) {
    return { success: false, reason: `Requires Farming level ${seed.reqFarmingLevel}` };
  }

  patch.seedId = seed.id;
  patch.status = 'GROWING';
  patch.currentStage = 1;
  patch.maxStages = seed.maxStages;
  patch.stageDurationMs = seed.stageDurationMs;
  patch.plantedAt = nowMs;
  patch.lastGrowthTick = nowMs;
  patch.isWatered = false;
  patch.livesRemaining = seed.minYield;

  return { success: true };
}

/**
 * Advances crop growth lifecycle on game tick or time query.
 */
export function tickPatchGrowth(
  patch: FarmingPatchState,
  nowMs: number = Date.now()
): { advanced: boolean; status: CropStatus } {
  if (patch.status !== 'GROWING' || !patch.lastGrowthTick) {
    return { advanced: false, status: patch.status };
  }

  const elapsed = nowMs - patch.lastGrowthTick;
  if (elapsed < patch.stageDurationMs) {
    return { advanced: false, status: patch.status };
  }

  // Advance stage
  patch.currentStage += 1;
  patch.lastGrowthTick = nowMs;

  if (patch.currentStage >= patch.maxStages) {
    patch.status = 'HARVESTABLE';
    return { advanced: true, status: 'HARVESTABLE' };
  }

  return { advanced: true, status: 'GROWING' };
}

/**
 * Harvests a fully grown crop, awarding produce and XP.
 */
export function harvestPatch(
  patch: FarmingPatchState,
  seed: SeedDefinition,
  playerFarmingLevel: number
): {
  success: boolean;
  produceItemId?: string;
  yieldCount: number;
  xpAwarded: number;
  reason?: string;
} {
  if (patch.status !== 'HARVESTABLE') {
    return { success: false, yieldCount: 0, xpAwarded: 0, reason: 'Crop is not ready for harvest.' };
  }

  // Calculate yield based on compost and farming level
  let baseYield = seed.minYield;
  if (patch.compost === 'SUPERCOMPOST' || patch.compost === 'ULTRACOMPOST') {
    baseYield += 2;
  } else if (patch.compost === 'COMPOST') {
    baseYield += 1;
  }

  const levelBonus = Math.floor((playerFarmingLevel - seed.reqFarmingLevel) / 10);
  const totalYield = Math.min(seed.maxYield, baseYield + Math.max(0, levelBonus));
  const totalXp = seed.baseXp * totalYield;

  // Reset patch back to empty
  patch.status = 'EMPTY';
  patch.seedId = undefined;
  patch.currentStage = 0;
  patch.compost = 'NONE';
  patch.isWatered = false;

  return {
    success: true,
    produceItemId: seed.produceItemId,
    yieldCount: totalYield,
    xpAwarded: totalXp,
  };
}
