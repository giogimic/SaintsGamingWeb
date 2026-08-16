import { describe, it, expect } from 'vitest';
import {
  createFarmingPatch,
  rakePatch,
  applyCompost,
  plantSeed,
  tickPatchGrowth,
  harvestPatch,
  SeedDefinition,
} from './farmingEngine';

describe('Farming Plot Soil & Growth Lifecycle Engine (Bible 08)', () => {
  const potatoSeed: SeedDefinition = {
    id: 'seed_potato',
    name: 'Potato Seed',
    patchType: 'ALLOTMENT',
    reqFarmingLevel: 1,
    maxStages: 4,
    stageDurationMs: 10000, // 10s per stage for test
    baseXp: 14,
    produceItemId: 'item_potato',
    minYield: 3,
    maxYield: 10,
  };

  it('rakes weeds and applies supercompost to empty soil', () => {
    const patch = createFarmingPatch('patch_1', 'ALLOTMENT', true);
    expect(patch.status).toBe('WEEDS');

    const rake = rakePatch(patch);
    expect(rake.success).toBe(true);
    expect(rake.xpAwarded).toBe(4);
    expect(patch.status).toBe('EMPTY');

    const compost = applyCompost(patch, 'SUPERCOMPOST');
    expect(compost.success).toBe(true);
    expect(patch.compost).toBe('SUPERCOMPOST');
  });

  it('plants seeds and advances stages to HARVESTABLE', () => {
    const patch = createFarmingPatch('patch_1', 'ALLOTMENT', false);
    const startMs = 1000000;

    const plant = plantSeed(patch, potatoSeed, 1, startMs);
    expect(plant.success).toBe(true);
    expect(patch.status).toBe('GROWING');
    expect(patch.currentStage).toBe(1);

    // Tick 1 (10s later) -> Stage 2
    tickPatchGrowth(patch, startMs + 10000);
    expect(patch.currentStage).toBe(2);

    // Tick 2 (20s later) -> Stage 3
    tickPatchGrowth(patch, startMs + 20000);
    expect(patch.currentStage).toBe(3);

    // Tick 3 (30s later) -> Stage 4 (HARVESTABLE)
    const tickFinal = tickPatchGrowth(patch, startMs + 30000);
    expect(tickFinal.status).toBe('HARVESTABLE');
    expect(patch.status).toBe('HARVESTABLE');
  });

  it('harvests crop with supercompost bonuses and resets soil to EMPTY', () => {
    const patch = createFarmingPatch('patch_1', 'ALLOTMENT', false);
    applyCompost(patch, 'SUPERCOMPOST');
    plantSeed(patch, potatoSeed, 20, 1000);

    // Force stage to harvestable
    patch.status = 'HARVESTABLE';
    patch.currentStage = 4;

    const result = harvestPatch(patch, potatoSeed, 20);
    expect(result.success).toBe(true);
    expect(result.produceItemId).toBe('item_potato');
    // base 3 + supercompost 2 + level bonus floor((20-1)/10) = 1 -> 6 yield
    expect(result.yieldCount).toBe(6);
    expect(result.xpAwarded).toBe(6 * 14);

    // Reset status
    expect(patch.status).toBe('EMPTY');
  });
});
