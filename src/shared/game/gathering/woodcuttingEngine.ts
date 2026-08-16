/**
 * Saints Gaming — Woodcutting Tree Felling & Nest Drop Engine (Bible 08)
 * Evaluates tree felling, hatchet tiers, stump respawn timers, and bird's nest loot drops.
 */

export type TreeType = 'NORMAL' | 'OAK' | 'WILLOW' | 'MAPLE' | 'YEW' | 'MAGIC' | 'ELDER';

export type HatchetTier =
  | 'BRONZE'
  | 'IRON'
  | 'STEEL'
  | 'MITHRIL'
  | 'ADAMANT'
  | 'RUNE'
  | 'SAINTS_GOLD';

export interface HatchetDefinition {
  tier: HatchetTier;
  reqWoodcuttingLevel: number;
  bonus: number;
}

export const HATCHET_STATS: Record<HatchetTier, HatchetDefinition> = {
  BRONZE: { tier: 'BRONZE', reqWoodcuttingLevel: 1, bonus: 0 },
  IRON: { tier: 'IRON', reqWoodcuttingLevel: 1, bonus: 2 },
  STEEL: { tier: 'STEEL', reqWoodcuttingLevel: 6, bonus: 5 },
  MITHRIL: { tier: 'MITHRIL', reqWoodcuttingLevel: 21, bonus: 10 },
  ADAMANT: { tier: 'ADAMANT', reqWoodcuttingLevel: 31, bonus: 18 },
  RUNE: { tier: 'RUNE', reqWoodcuttingLevel: 41, bonus: 28 },
  SAINTS_GOLD: { tier: 'SAINTS_GOLD', reqWoodcuttingLevel: 61, bonus: 40 },
};

export interface TreeDefinition {
  type: TreeType;
  name: string;
  logItemId: string;
  reqWoodcuttingLevel: number;
  baseRespawnMs: number;
  xpAwarded: number;
  baseSuccessRate: number;
  nestChance: number; // e.g. 1/256 = 0.0039
}

export const CANONICAL_TREES: Record<TreeType, TreeDefinition> = {
  NORMAL: {
    type: 'NORMAL',
    name: 'Tree',
    logItemId: 'logs_normal',
    reqWoodcuttingLevel: 1,
    baseRespawnMs: 15000,
    xpAwarded: 25,
    baseSuccessRate: 0.85,
    nestChance: 0.004,
  },
  OAK: {
    type: 'OAK',
    name: 'Oak Tree',
    logItemId: 'logs_oak',
    reqWoodcuttingLevel: 15,
    baseRespawnMs: 30000,
    xpAwarded: 37.5,
    baseSuccessRate: 0.65,
    nestChance: 0.005,
  },
  WILLOW: {
    type: 'WILLOW',
    name: 'Willow Tree',
    logItemId: 'logs_willow',
    reqWoodcuttingLevel: 30,
    baseRespawnMs: 20000,
    xpAwarded: 67.5,
    baseSuccessRate: 0.5,
    nestChance: 0.006,
  },
  MAPLE: {
    type: 'MAPLE',
    name: 'Maple Tree',
    logItemId: 'logs_maple',
    reqWoodcuttingLevel: 45,
    baseRespawnMs: 60000,
    xpAwarded: 100,
    baseSuccessRate: 0.4,
    nestChance: 0.008,
  },
  YEW: {
    type: 'YEW',
    name: 'Yew Tree',
    logItemId: 'logs_yew',
    reqWoodcuttingLevel: 60,
    baseRespawnMs: 100000,
    xpAwarded: 175,
    baseSuccessRate: 0.25,
    nestChance: 0.01,
  },
  MAGIC: {
    type: 'MAGIC',
    name: 'Magic Tree',
    logItemId: 'logs_magic',
    reqWoodcuttingLevel: 75,
    baseRespawnMs: 200000,
    xpAwarded: 250,
    baseSuccessRate: 0.15,
    nestChance: 0.015,
  },
  ELDER: {
    type: 'ELDER',
    name: 'Elder Redwood Tree',
    logItemId: 'logs_elder',
    reqWoodcuttingLevel: 90,
    baseRespawnMs: 300000,
    xpAwarded: 380,
    baseSuccessRate: 0.08,
    nestChance: 0.025,
  },
};

/**
 * Attempts to chop a tree on interaction swing.
 */
export function attemptChopTree(
  treeType: TreeType,
  playerWoodcuttingLevel: number,
  hatchetTier: HatchetTier,
  randomSuccessRoll: number = Math.random(),
  randomNestRoll: number = Math.random()
): {
  success: boolean;
  logItemId?: string;
  xpAwarded: number;
  foundNestItemId?: string;
  respawnDurationMs: number;
  reason?: string;
} {
  const tree = CANONICAL_TREES[treeType];
  const hatchet = HATCHET_STATS[hatchetTier];

  if (!tree || !hatchet) {
    return { success: false, xpAwarded: 0, respawnDurationMs: 0, reason: 'Invalid tree or hatchet.' };
  }

  if (playerWoodcuttingLevel < tree.reqWoodcuttingLevel) {
    return {
      success: false,
      xpAwarded: 0,
      respawnDurationMs: 0,
      reason: `Requires Woodcutting level ${tree.reqWoodcuttingLevel} (Current: ${playerWoodcuttingLevel})`,
    };
  }

  if (playerWoodcuttingLevel < hatchet.reqWoodcuttingLevel) {
    return {
      success: false,
      xpAwarded: 0,
      respawnDurationMs: 0,
      reason: `Requires Woodcutting level ${hatchet.reqWoodcuttingLevel} to wield this hatchet.`,
    };
  }

  const levelDelta = playerWoodcuttingLevel - tree.reqWoodcuttingLevel;
  const successChance = Math.min(
    0.95,
    tree.baseSuccessRate + hatchet.bonus / 100 + levelDelta / 200
  );

  if (randomSuccessRoll > successChance) {
    return { success: false, xpAwarded: 0, respawnDurationMs: 0, reason: 'You swing your axe at the tree...' };
  }

  let foundNestItemId: string | undefined = undefined;
  if (randomNestRoll < tree.nestChance) {
    const nests = ['item_birds_nest_seed', 'item_birds_nest_ring', 'item_birds_nest_egg'];
    foundNestItemId = nests[Math.floor(Math.random() * nests.length)];
  }

  return {
    success: true,
    logItemId: tree.logItemId,
    xpAwarded: tree.xpAwarded,
    foundNestItemId,
    respawnDurationMs: tree.baseRespawnMs,
  };
}
