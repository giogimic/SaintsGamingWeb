/**
 * Slayer Reward Shop, Unlock Matrix & Helmet Imbue Engine (Bible 09 & Bible 21).
 *
 * Implements:
 * - Slayer Reward Shop unlocks (Bigger and Badder, Malevolent Masquerade, Ring Bling, Broader Fletching).
 * - Task skipping (30 pts), task blocking (100 pts per slot up to 6 slots based on Quest Points).
 * - Slayer Helmet assembly and Nightmare Zone / Slayer Point Imbue matrix.
 * - On-task combat accuracy & damage multipliers (+16.67% melee, +15% ranged/magic for imbued helmet).
 */

export interface SlayerShopUnlock {
  id: string;
  name: string;
  category: 'PERK' | 'EXTEND' | 'CRAFTING' | 'BLOCK_SKIP';
  pointCost: number;
  description: string;
}

export const SLAYER_SHOP_UNLOCKS: Record<string, SlayerShopUnlock> = {
  bigger_and_badder: {
    id: 'bigger_and_badder',
    name: 'Bigger and Badder',
    category: 'PERK',
    pointCost: 150,
    description: 'Enables superior slayer monster variants to spawn while on slayer tasks.',
  },
  malevolent_masquerade: {
    id: 'malevolent_masquerade',
    name: 'Malevolent Masquerade',
    category: 'CRAFTING',
    pointCost: 400,
    description: 'Allows you to combine a Black Mask, Earmuffs, Face Mask, Nosepeg, and Spiny Helmet into a Slayer Helmet.',
  },
  ring_bling: {
    id: 'ring_bling',
    name: 'Ring Bling',
    category: 'CRAFTING',
    pointCost: 300,
    description: 'Allows crafting of Slayer Rings using an enchanted gem, gold bar, and ring mould.',
  },
  broader_fletching: {
    id: 'broader_fletching',
    name: 'Broader Fletching',
    category: 'CRAFTING',
    pointCost: 300,
    description: 'Allows fletching of Broad Arrows and Broad Bolts for ranged slayer combat.',
  },
  extend_gore_hound: {
    id: 'extend_gore_hound',
    name: 'Need More Blood',
    category: 'EXTEND',
    pointCost: 100,
    description: 'Extends Gore Hound slayer assignments from 140 to up to 250 kills.',
  },
  extend_stone_golem: {
    id: 'extend_stone_golem',
    name: 'Stone Golem Extension',
    category: 'EXTEND',
    pointCost: 100,
    description: 'Extends Stone Golem slayer assignments up to 250 kills.',
  },
  extend_void_fiend: {
    id: 'extend_void_fiend',
    name: 'Abyssal Extension',
    category: 'EXTEND',
    pointCost: 100,
    description: 'Extends Void Fiend slayer assignments up to 250 kills.',
  },
};

export const TASK_CANCEL_POINT_COST = 30;
export const TASK_BLOCK_POINT_COST = 100;
export const SLAYER_HELMET_IMBUE_COST = 500;

export interface SlayerShopAccountState {
  slayerPoints: number;
  questPoints: number;
  unlockedPerks: string[];
  blockedTasks: string[];
}

/**
 * Calculates max allowed blocked task slots based on Quest Points (1 slot per 50 QP, max 6).
 */
export function getMaxBlockSlots(questPoints: number): number {
  return Math.min(6, Math.max(1, Math.floor(questPoints / 50)));
}

/**
 * Purchases a permanent unlock from the Slayer Shop.
 */
export function purchaseSlayerUnlock(
  account: SlayerShopAccountState,
  unlockId: string
): { success: boolean; error?: string } {
  const item = SLAYER_SHOP_UNLOCKS[unlockId];
  if (!item) return { success: false, error: 'Unlock item does not exist' };

  if (account.unlockedPerks.includes(unlockId)) {
    return { success: false, error: 'You have already unlocked this perk' };
  }

  if (account.slayerPoints < item.pointCost) {
    return {
      success: false,
      error: `Insufficient Slayer points (Requires: ${item.pointCost}, Available: ${account.slayerPoints})`,
    };
  }

  account.slayerPoints -= item.pointCost;
  account.unlockedPerks.push(unlockId);
  return { success: true };
}

/**
 * Blocks a monster from ever being assigned as a task (costs 100 Slayer points).
 */
export function blockSlayerTask(
  account: SlayerShopAccountState,
  monsterId: string
): { success: boolean; error?: string } {
  const maxSlots = getMaxBlockSlots(account.questPoints);

  if (account.blockedTasks.length >= maxSlots) {
    return {
      success: false,
      error: `All ${maxSlots} block slots are occupied. Unblock an existing monster first.`,
    };
  }

  if (account.blockedTasks.includes(monsterId)) {
    return { success: false, error: 'Monster is already on your block list' };
  }

  if (account.slayerPoints < TASK_BLOCK_POINT_COST) {
    return {
      success: false,
      error: `Insufficient Slayer points (Requires: ${TASK_BLOCK_POINT_COST}, Available: ${account.slayerPoints})`,
    };
  }

  account.slayerPoints -= TASK_BLOCK_POINT_COST;
  account.blockedTasks.push(monsterId);
  return { success: true };
}

/**
 * Cancels the current task without resetting the streak (costs 30 Slayer points).
 */
export function cancelActiveTaskWithPoints(
  account: SlayerShopAccountState,
  hasActiveTask: boolean
): { success: boolean; error?: string } {
  if (!hasActiveTask) {
    return { success: false, error: 'No active Slayer task to cancel' };
  }

  if (account.slayerPoints < TASK_CANCEL_POINT_COST) {
    return {
      success: false,
      error: `Insufficient Slayer points (Requires: ${TASK_CANCEL_POINT_COST}, Available: ${account.slayerPoints})`,
    };
  }

  account.slayerPoints -= TASK_CANCEL_POINT_COST;
  return { success: true };
}

export type SlayerHelmetType = 'NONE' | 'BLACK_MASK' | 'SLAYER_HELMET' | 'SLAYER_HELMET_IMBUED';

export interface SlayerDamageBonus {
  meleeMultiplier: number;
  rangedMultiplier: number;
  magicMultiplier: number;
  isActive: boolean;
}

/**
 * Calculates Slayer Helmet damage and accuracy multipliers during combat.
 *
 * Mechanics:
 * - Black Mask / Standard Slayer Helm: +16.67% (7/6) Melee bonus on-task only.
 * - Imbued Slayer Helm: +16.67% Melee, +15.0% Ranged, and +15.0% Magic bonus on-task.
 * - Off-task: 1.0 (no bonus).
 */
export function calculateSlayerCombatBonus(
  helmet: SlayerHelmetType,
  targetMonsterId: string,
  assignedTaskMonsterId: string | null
): SlayerDamageBonus {
  const isOnTask = assignedTaskMonsterId !== null && assignedTaskMonsterId === targetMonsterId;

  if (!isOnTask || helmet === 'NONE') {
    return { meleeMultiplier: 1.0, rangedMultiplier: 1.0, magicMultiplier: 1.0, isActive: false };
  }

  if (helmet === 'BLACK_MASK' || helmet === 'SLAYER_HELMET') {
    return {
      meleeMultiplier: 7 / 6, // ~1.1667
      rangedMultiplier: 1.0,
      magicMultiplier: 1.0,
      isActive: true,
    };
  }

  if (helmet === 'SLAYER_HELMET_IMBUED') {
    return {
      meleeMultiplier: 7 / 6, // ~1.1667
      rangedMultiplier: 1.15, // +15% Ranged
      magicMultiplier: 1.15,  // +15% Magic
      isActive: true,
    };
  }

  return { meleeMultiplier: 1.0, rangedMultiplier: 1.0, magicMultiplier: 1.0, isActive: false };
}
