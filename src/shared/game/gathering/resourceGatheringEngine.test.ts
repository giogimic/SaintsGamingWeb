import { describe, expect, it } from 'vitest';
import {
  ResourceGatheringEngine,
  ResourceNodeDefinition,
  ToolProficiency,
} from './resourceGatheringEngine';

describe('Master Gathering Node Respawn & Quality Engine (Phase 52)', () => {
  const runiteRockDef: ResourceNodeDefinition = {
    id: 'node_runite_rock',
    name: 'Runite Ore Vein',
    profession: 'MINING',
    requiredSkillLevel: 85,
    baseYieldItemId: 'runite_ore',
    baseYieldQuantity: 1,
    rareYieldItemId: 'uncut_diamond',
    maxCharges: 3,
    baseRespawnDurationMs: 60000, // 60 seconds
    baseXp: 125,
  };

  const crystalPickaxe: ToolProficiency = {
    toolTier: 'CRYSTAL',
    doubleStrikeChancePct: 25,
    xpMultiplier: 1.2,
  };

  it('validates skill level requirements and quality multipliers on harvest', () => {
    const engine = new ResourceGatheringEngine();
    engine.registerNodeDefinition(runiteRockDef);

    const node = engine.spawnNode('node_runite_rock', 'zone_wilderness', 'PRISTINE_CORE');

    // 1. Player with Level 70 tries to mine Runite (requires 85) -> Rejected
    const lowLvlHarvest = engine.harvestNode(node, 70, crystalPickaxe);
    expect(lowLvlHarvest.success).toBe(false);
    expect(lowLvlHarvest.error).toContain('Requires MINING level 85');

    // 2. Player with Level 90 mines Pristine Core node with forced double strike
    const harvest = engine.harvestNode(node, 90, crystalPickaxe, 1, true);
    expect(harvest.success).toBe(true);
    expect(harvest.isDoubleStrike).toBe(true);

    // Pristine Core (2.5x) * Double Strike (2x) = 5 Runite Ore + Uncut Diamond
    const runiteOre = harvest.itemsAwarded.find((i) => i.itemId === 'runite_ore');
    const uncutDiamond = harvest.itemsAwarded.find((i) => i.itemId === 'uncut_diamond');

    expect(runiteOre?.quantity).toBe(5);
    expect(uncutDiamond?.quantity).toBe(2);
    expect(node.remainingCharges).toBe(2);
    expect(harvest.nodeDepleted).toBe(false);
  });

  it('depletes node charges and handles density-adjusted respawn cycles', () => {
    const engine = new ResourceGatheringEngine();
    engine.registerNodeDefinition(runiteRockDef);

    const now = 1000000;
    const node = engine.spawnNode('node_runite_rock', 'zone_mining_guild', 'NORMAL');

    // 1. Mine charge 1
    engine.harvestNode(node, 99, crystalPickaxe, 5, false, now);
    expect(node.remainingCharges).toBe(2);

    // 2. Mine charge 2
    engine.harvestNode(node, 99, crystalPickaxe, 5, false, now + 1000);
    expect(node.remainingCharges).toBe(1);

    // 3. Mine charge 3 (Final charge -> Depletes node with 5 nearby players speeding up respawn)
    const finalHarvest = engine.harvestNode(node, 99, crystalPickaxe, 5, false, now + 2000);
    expect(finalHarvest.nodeDepleted).toBe(true);
    expect(node.isDepleted).toBe(true);
    expect(node.remainingCharges).toBe(0);

    // 5 players = 20% speedup (60s base -> 48s adjusted)
    expect(node.respawnAt).toBe(now + 2000 + 48000);

    // 4. Update respawns at +30s -> Still depleted
    const earlyTick = engine.updateRespawns('zone_mining_guild', now + 32000);
    expect(earlyTick).toHaveLength(0);
    expect(node.isDepleted).toBe(true);

    // 5. Update respawns at +55s -> Node restored to full charges
    const respawnTick = engine.updateRespawns('zone_mining_guild', now + 55000);
    expect(respawnTick).toHaveLength(1);
    expect(respawnTick[0]).toBe(node.instanceId);
    expect(node.isDepleted).toBe(false);
    expect(node.remainingCharges).toBe(3);
  });
});
