export type ItemType = 'MATERIAL' | 'FOOD' | 'CONSUMABLE' | 'WEAPON' | 'HEAD' | 'CHEST' | 'LEGS';

export interface ItemSchema {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  value: number; // Shop price in Credits
  stats?: {
    atk?: number;
    def?: number;
    hp?: number;
  };
}

export const ITEM_DB: Record<string, ItemSchema> = {
  // Materials
  'wood_logs': { id: 'wood_logs', name: 'Wood Logs', description: 'Basic logs chopped from a tree.', type: 'MATERIAL', value: 2 },
  'copper_ore': { id: 'copper_ore', name: 'Copper Ore', description: 'Raw copper ore. Can be smelted.', type: 'MATERIAL', value: 5 },
  'tin_ore': { id: 'tin_ore', name: 'Tin Ore', description: 'Raw tin ore. Combine with copper for bronze.', type: 'MATERIAL', value: 5 },
  
  // Consumables
  'raw_fish': { id: 'raw_fish', name: 'Raw Fish', description: 'Needs to be cooked.', type: 'FOOD', value: 3 },
  'cooked_fish': { id: 'cooked_fish', name: 'Cooked Fish', description: 'Heals 20 HP.', type: 'FOOD', value: 10, stats: { hp: 20 } },
  'capture_script': { id: 'capture_script', name: 'Binding Crystal', description: 'Used to capture wild Beasts.', type: 'CONSUMABLE', value: 100 },
  'patch_kit': { id: 'patch_kit', name: 'Healing Salve', description: 'Heals 50 HP.', type: 'CONSUMABLE', value: 50, stats: { hp: 50 } },

  // Equipment - Weapons
  'bronze_sword': { id: 'bronze_sword', name: 'Bronze Sword', description: 'A basic melee weapon.', type: 'WEAPON', value: 150, stats: { atk: 5 } },
  'iron_sword': { id: 'iron_sword', name: 'Iron Sword', description: 'A sturdy melee weapon.', type: 'WEAPON', value: 450, stats: { atk: 12 } },
  'wooden_bow': { id: 'wooden_bow', name: 'Wooden Bow', description: 'A basic ranged weapon.', type: 'WEAPON', value: 100, stats: { atk: 4 } },

  // Equipment - Armor
  'bronze_helm': { id: 'bronze_helm', name: 'Bronze Helm', description: 'Basic head protection.', type: 'HEAD', value: 80, stats: { def: 2 } },
  'bronze_chest': { id: 'bronze_chest', name: 'Bronze Platebody', description: 'Basic chest protection.', type: 'CHEST', value: 200, stats: { def: 5 } },
  'bronze_legs': { id: 'bronze_legs', name: 'Bronze Platelegs', description: 'Basic leg protection.', type: 'LEGS', value: 120, stats: { def: 3 } },
};

export const CRAFTING_RECIPES = [
  {
    id: 'bronze_sword',
    resultItemId: 'bronze_sword',
    skill: 'Smithing',
    levelReq: 1,
    xpReward: 25,
    ingredients: { 'copper_ore': 2, 'wood_logs': 1 }
  },
  {
    id: 'bronze_chest',
    resultItemId: 'bronze_chest',
    skill: 'Smithing',
    levelReq: 5,
    xpReward: 50,
    ingredients: { 'copper_ore': 5 }
  },
  {
    id: 'wooden_bow',
    resultItemId: 'wooden_bow',
    skill: 'Fletching',
    levelReq: 1,
    xpReward: 15,
    ingredients: { 'wood_logs': 2 }
  }
];

export function getItem(id: string): ItemSchema | undefined {
  return ITEM_DB[id];
}
