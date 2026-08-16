/**
 * Saints Gaming — Mining Veins & Prospecting Depletion Engine (Bible 08 & Bible 14)
 * Evaluates rock vein depletion, pickaxe tiers, respawn timers, and uncut gem drop rolls.
 */

export type RockVeinType =
  | 'COPPER'
  | 'TIN'
  | 'IRON'
  | 'SILVER'
  | 'COAL'
  | 'GOLD'
  | 'MITHRIL'
  | 'ADAMANT'
  | 'RUNITE'
  | 'SAINTS_GOLD';

export type PickaxeTier =
  | 'BRONZE'
  | 'IRON'
  | 'STEEL'
  | 'MITHRIL'
  | 'ADAMANT'
  | 'RUNE'
  | 'SAINTS_GOLD';

export interface PickaxeDefinition {
  tier: PickaxeTier;
  reqMiningLevel: number;
  miningBonus: number;
}

export const PICKAXE_STATS: Record<PickaxeTier, PickaxeDefinition> = {
  BRONZE: { tier: 'BRONZE', reqMiningLevel: 1, miningBonus: 0 },
  IRON: { tier: 'IRON', reqMiningLevel: 1, miningBonus: 2 },
  STEEL: { tier: 'STEEL', reqMiningLevel: 6, miningBonus: 5 },
  MITHRIL: { tier: 'MITHRIL', reqMiningLevel: 21, miningBonus: 10 },
  ADAMANT: { tier: 'ADAMANT', reqMiningLevel: 31, miningBonus: 18 },
  RUNE: { tier: 'RUNE', reqMiningLevel: 41, miningBonus: 28 },
  SAINTS_GOLD: { tier: 'SAINTS_GOLD', reqMiningLevel: 61, miningBonus: 40 },
};

export interface RockDefinition {
  veinType: RockVeinType;
  name: string;
  oreItemId: string;
  reqMiningLevel: number;
  baseRespawnMs: number;
  xpAwarded: number;
  baseSuccessRate: number; // 0.0 to 1.0
  gemChance: number; // e.g. 1/256 = 0.0039
}

export const CANONICAL_ROCKS: Record<RockVeinType, RockDefinition> = {
  COPPER: {
    veinType: 'COPPER',
    name: 'Copper Rock',
    oreItemId: 'ore_copper',
    reqMiningLevel: 1,
    baseRespawnMs: 3000,
    xpAwarded: 17.5,
    baseSuccessRate: 0.8,
    gemChance: 0.004,
  },
  TIN: {
    veinType: 'TIN',
    name: 'Tin Rock',
    oreItemId: 'ore_tin',
    reqMiningLevel: 1,
    baseRespawnMs: 3000,
    xpAwarded: 17.5,
    baseSuccessRate: 0.8,
    gemChance: 0.004,
  },
  IRON: {
    veinType: 'IRON',
    name: 'Iron Rock',
    oreItemId: 'ore_iron',
    reqMiningLevel: 15,
    baseRespawnMs: 6000,
    xpAwarded: 35,
    baseSuccessRate: 0.6,
    gemChance: 0.005,
  },
  SILVER: {
    veinType: 'SILVER',
    name: 'Silver Rock',
    oreItemId: 'ore_silver',
    reqMiningLevel: 20,
    baseRespawnMs: 60000,
    xpAwarded: 40,
    baseSuccessRate: 0.5,
    gemChance: 0.01,
  },
  COAL: {
    veinType: 'COAL',
    name: 'Coal Rock',
    oreItemId: 'ore_coal',
    reqMiningLevel: 30,
    baseRespawnMs: 30000,
    xpAwarded: 50,
    baseSuccessRate: 0.45,
    gemChance: 0.006,
  },
  GOLD: {
    veinType: 'GOLD',
    name: 'Gold Rock',
    oreItemId: 'ore_gold',
    reqMiningLevel: 40,
    baseRespawnMs: 60000,
    xpAwarded: 65,
    baseSuccessRate: 0.4,
    gemChance: 0.012,
  },
  MITHRIL: {
    veinType: 'MITHRIL',
    name: 'Mithril Rock',
    oreItemId: 'ore_mithril',
    reqMiningLevel: 55,
    baseRespawnMs: 120000,
    xpAwarded: 80,
    baseSuccessRate: 0.3,
    gemChance: 0.008,
  },
  ADAMANT: {
    veinType: 'ADAMANT',
    name: 'Adamantite Rock',
    oreItemId: 'ore_adamantite',
    reqMiningLevel: 70,
    baseRespawnMs: 240000,
    xpAwarded: 95,
    baseSuccessRate: 0.2,
    gemChance: 0.01,
  },
  RUNITE: {
    veinType: 'RUNITE',
    name: 'Runite Rock',
    oreItemId: 'ore_runite',
    reqMiningLevel: 85,
    baseRespawnMs: 750000,
    xpAwarded: 125,
    baseSuccessRate: 0.1,
    gemChance: 0.015,
  },
  SAINTS_GOLD: {
    veinType: 'SAINTS_GOLD',
    name: "Saint's Gold Rock",
    oreItemId: 'ore_saints_gold',
    reqMiningLevel: 95,
    baseRespawnMs: 900000,
    xpAwarded: 200,
    baseSuccessRate: 0.05,
    gemChance: 0.03,
  },
};

/**
 * Attempts to mine an ore rock on interaction swing.
 */
export function attemptMineRock(
  rockType: RockVeinType,
  playerMiningLevel: number,
  pickaxeTier: PickaxeTier,
  randomSuccessRoll: number = Math.random(),
  randomGemRoll: number = Math.random()
): {
  success: boolean;
  oreItemId?: string;
  xpAwarded: number;
  foundGemItemId?: string;
  respawnDurationMs: number;
  reason?: string;
} {
  const rock = CANONICAL_ROCKS[rockType];
  const pick = PICKAXE_STATS[pickaxeTier];

  if (!rock || !pick) {
    return { success: false, xpAwarded: 0, respawnDurationMs: 0, reason: 'Invalid rock or pickaxe.' };
  }

  if (playerMiningLevel < rock.reqMiningLevel) {
    return {
      success: false,
      xpAwarded: 0,
      respawnDurationMs: 0,
      reason: `Requires Mining level ${rock.reqMiningLevel} (Current: ${playerMiningLevel})`,
    };
  }

  if (playerMiningLevel < pick.reqMiningLevel) {
    return {
      success: false,
      xpAwarded: 0,
      respawnDurationMs: 0,
      reason: `Requires Mining level ${pick.reqMiningLevel} to wield this pickaxe.`,
    };
  }

  // Calculate success probability: baseSuccess + (miningBonus / 100) + (levelDelta / 200)
  const levelDelta = playerMiningLevel - rock.reqMiningLevel;
  const successChance = Math.min(
    0.95,
    rock.baseSuccessRate + pick.miningBonus / 100 + levelDelta / 200
  );

  if (randomSuccessRoll > successChance) {
    return { success: false, xpAwarded: 0, respawnDurationMs: 0, reason: 'You swing your pickaxe at the rock...' };
  }

  // Gem roll
  let foundGemItemId: string | undefined = undefined;
  if (randomGemRoll < rock.gemChance) {
    const gems = ['gem_uncut_sapphire', 'gem_uncut_emerald', 'gem_uncut_ruby', 'gem_uncut_diamond'];
    foundGemItemId = gems[Math.floor(Math.random() * gems.length)];
  }

  return {
    success: true,
    oreItemId: rock.oreItemId,
    xpAwarded: rock.xpAwarded,
    foundGemItemId,
    respawnDurationMs: rock.baseRespawnMs,
  };
}

/**
 * Prospects a rock to identify its ore type.
 */
export function prospectRock(rockType: RockVeinType): string {
  const rock = CANONICAL_ROCKS[rockType];
  if (!rock) return 'This rock contains nothing of value.';
  return `This rock contains ${rock.name.replace(' Rock', '')} ore.`;
}
