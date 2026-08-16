/**
 * Saints Gaming — Equipment Slot & Stat Compatibility Engine (Bible 12)
 * Manages player equipment slots, stat aggregation, and skill/level prerequisite checks.
 */

export type EquipmentSlot =
  | 'weapon'
  | 'shield'
  | 'head'
  | 'chest'
  | 'legs'
  | 'feet'
  | 'accessory'
  | 'tool';

export interface EquippableItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  reqSkill?: string;
  reqLevel?: number;
  stats?: {
    atk?: number;
    def?: number;
    hp?: number;
    speed?: number;
    critChance?: number;
  };
}

export type PlayerEquipment = Partial<Record<EquipmentSlot, EquippableItem | null>>;

export interface TotalEquipmentStats {
  atk: number;
  def: number;
  hp: number;
  speed: number;
  critChance: number;
}

/**
 * Checks whether a player meets the skill level prerequisites to equip an item.
 */
export function canEquipItem(
  item: EquippableItem,
  playerSkills: Record<string, number> = {}
): { canEquip: boolean; reason?: string } {
  if (!item.reqSkill || !item.reqLevel) {
    return { canEquip: true };
  }

  const playerLevel = playerSkills[item.reqSkill.toLowerCase()] ?? playerSkills[item.reqSkill] ?? 1;

  if (playerLevel < item.reqLevel) {
    return {
      canEquip: false,
      reason: `Requires ${item.reqSkill} level ${item.reqLevel} (Current: ${playerLevel})`,
    };
  }

  return { canEquip: true };
}

/**
 * Calculates total aggregate stat bonuses provided by all equipped items.
 */
export function calculateEquipmentStats(equipment: PlayerEquipment): TotalEquipmentStats {
  const totals: TotalEquipmentStats = {
    atk: 0,
    def: 0,
    hp: 0,
    speed: 0,
    critChance: 0,
  };

  for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
    const item = equipment[slot];
    if (!item || !item.stats) continue;

    totals.atk += item.stats.atk ?? 0;
    totals.def += item.stats.def ?? 0;
    totals.hp += item.stats.hp ?? 0;
    totals.speed += item.stats.speed ?? 0;
    totals.critChance += item.stats.critChance ?? 0;
  }

  return totals;
}

/**
 * Equips an item into the appropriate equipment slot. Returns the displaced item if one was equipped.
 */
export function equipItem(
  equipment: PlayerEquipment,
  item: EquippableItem,
  playerSkills: Record<string, number> = {}
): { success: boolean; unequippedItem?: EquippableItem | null; reason?: string } {
  const check = canEquipItem(item, playerSkills);
  if (!check.canEquip) {
    return { success: false, reason: check.reason };
  }

  const previousItem = equipment[item.slot] ?? null;
  equipment[item.slot] = item;

  return {
    success: true,
    unequippedItem: previousItem,
  };
}

/**
 * Unequips an item from a specific equipment slot.
 */
export function unequipItem(
  equipment: PlayerEquipment,
  slot: EquipmentSlot
): EquippableItem | null {
  const item = equipment[slot] ?? null;
  equipment[slot] = null;
  return item;
}
