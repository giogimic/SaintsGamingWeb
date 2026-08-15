export type ItemType = 'MATERIAL' | 'FOOD' | 'CONSUMABLE' | 'WEAPON' | 'HEAD' | 'CHEST' | 'LEGS';

export interface ItemSchema {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  value: number; // Shop price in Credits
  reqSkill?: string; // e.g. 'Attack', 'Defence', 'Ranged'
  reqLevel?: number; // e.g. 1, 10, 20, 25, 35, 40, 45, 50
  stats?: {
    atk?: number;
    def?: number;
    hp?: number;
  };
}

export const ITEM_DB: Record<string, ItemSchema> = {
  // Materials
  'wood_logs': { id: 'wood_logs', name: 'Wood Logs', description: 'Basic logs chopped from a tree.', type: 'MATERIAL', value: 2 },
  'wood_log': { id: 'wood_log', name: 'Wood Log', description: 'Basic timber. Craft ingredient for Standard Film.', type: 'MATERIAL', value: 5 },
  'crystal_dust': { id: 'crystal_dust', name: 'Crystal Dust', description: 'Raw dust used to craft Standard Film.', type: 'MATERIAL', value: 25 },
  'ore_copper': { id: 'ore_copper', name: 'Copper Ore', description: 'Raw copper ore from SE rocks (Q1).', type: 'MATERIAL', value: 5 },
  'copper_ore': { id: 'copper_ore', name: 'Copper Ore (legacy)', description: 'Legacy slug — prefer ore_copper.', type: 'MATERIAL', value: 5 },
  'tin_ore': { id: 'tin_ore', name: 'Tin Ore', description: 'Raw tin ore. Combine with copper for bronze.', type: 'MATERIAL', value: 5 },
  
  // Consumables
  'raw_fish': { id: 'raw_fish', name: 'Raw Fish', description: 'Needs to be cooked.', type: 'FOOD', value: 3 },
  'cooked_fish': { id: 'cooked_fish', name: 'Cooked Fish', description: 'Heals 20 HP.', type: 'FOOD', value: 10, stats: { hp: 20 } },
  'film_standard': { id: 'film_standard', name: 'Standard Film', description: 'Soul-sensitive film for turn-based capture.', type: 'CONSUMABLE', value: 100 },
  'film_fine': { id: 'film_fine', name: 'Fine Grain Film', description: '2× catch rate film stock.', type: 'CONSUMABLE', value: 250 },
  'soul_camera': { id: 'soul_camera', name: 'Soul Camera', description: 'Exposes film to bind a creature soul.', type: 'CONSUMABLE', value: 50 },
  'binding_crystal': { id: 'binding_crystal', name: 'Standard Film (legacy)', description: 'Legacy slug — prefer film_standard.', type: 'CONSUMABLE', value: 100 },
  'capture_script': { id: 'capture_script', name: 'Film (legacy)', description: 'Legacy slug. Prefer film_standard.', type: 'CONSUMABLE', value: 100 },
  'axe_bronze': { id: 'axe_bronze', name: 'Rook Hatchet', description: 'Woodcutting tool (demo starter kit).', type: 'WEAPON', value: 40, reqSkill: 'Attack', reqLevel: 1 },
  'pickaxe_bronze': { id: 'pickaxe_bronze', name: 'Crude Pickaxe', description: 'Mining tool (demo starter kit).', type: 'WEAPON', value: 40, reqSkill: 'Attack', reqLevel: 1 },
  'patch_kit': { id: 'patch_kit', name: 'Healing Salve', description: 'Heals 50 HP.', type: 'CONSUMABLE', value: 50, stats: { hp: 50 } },

  // Equipment - Melee Weapons (Attack Skill Tier Progression)
  'bronze_sword': { id: 'bronze_sword', name: 'Bronze Sword', description: 'A basic melee weapon forged from bronze.', type: 'WEAPON', value: 150, reqSkill: 'Attack', reqLevel: 1, stats: { atk: 5 } },
  'bronze_dagger': { id: 'bronze_dagger', name: 'Bronze Dagger', description: 'A lightweight fast bronze stabbing dagger.', type: 'WEAPON', value: 80, reqSkill: 'Attack', reqLevel: 1, stats: { atk: 3 } },
  'iron_sword': { id: 'iron_sword', name: 'Iron Sword', description: 'A sturdy iron melee weapon.', type: 'WEAPON', value: 450, reqSkill: 'Attack', reqLevel: 10, stats: { atk: 12 } },
  'iron_dagger': { id: 'iron_dagger', name: 'Iron Dagger', description: 'A balanced iron dagger with keen edge.', type: 'WEAPON', value: 240, reqSkill: 'Attack', reqLevel: 10, stats: { atk: 8 } },
  'steel_sword': { id: 'steel_sword', name: 'Steel Longsword', description: 'A refined high-carbon steel blade.', type: 'WEAPON', value: 800, reqSkill: 'Attack', reqLevel: 20, stats: { atk: 20 } },
  'steel_dagger': { id: 'steel_dagger', name: 'Steel Dagger', description: 'A razor-sharp thrusting dagger of hardened steel.', type: 'WEAPON', value: 450, reqSkill: 'Attack', reqLevel: 20, stats: { atk: 15 } },
  'mithril_sword': { id: 'mithril_sword', name: 'Mithril Sword', description: 'A lightweight, sharp high-tier azure blade.', type: 'WEAPON', value: 1200, reqSkill: 'Attack', reqLevel: 25, stats: { atk: 28 } },
  'mithril_dagger': { id: 'mithril_dagger', name: 'Mithril Dagger', description: 'Featherlight mithril stiletto.', type: 'WEAPON', value: 750, reqSkill: 'Attack', reqLevel: 25, stats: { atk: 22 } },
  'adamant_sword': { id: 'adamant_sword', name: 'Adamant Broadsword', description: 'Heavy emerald-green adamantine broadsword.', type: 'WEAPON', value: 2500, reqSkill: 'Attack', reqLevel: 35, stats: { atk: 40 } },
  'rune_sword': { id: 'rune_sword', name: 'Rune Scimitar', description: 'Legendary cyan runite scimitar with immense cutting power.', type: 'WEAPON', value: 5000, reqSkill: 'Attack', reqLevel: 40, stats: { atk: 55 } },
  'saintly_blade': { id: 'saintly_blade', name: 'Saintly Sunblade', description: 'Consecrated golden blade humming with divine energy.', type: 'WEAPON', value: 12000, reqSkill: 'Attack', reqLevel: 45, stats: { atk: 72 } },
  'celestial_blade': { id: 'celestial_blade', name: 'Celestial Vanguard Blade', description: 'Transcendent starmetal blade forged in the cosmic abyss.', type: 'WEAPON', value: 30000, reqSkill: 'Attack', reqLevel: 50, stats: { atk: 95 } },

  // Equipment - Ranged Weapons
  'wooden_bow': { id: 'wooden_bow', name: 'Wooden Bow', description: 'A basic ranged weapon.', type: 'WEAPON', value: 100, reqSkill: 'Ranged', reqLevel: 1, stats: { atk: 4 } },

  // Equipment - Armor (Defence Skill Tier Progression)
  'bronze_helm': { id: 'bronze_helm', name: 'Bronze Helm', description: 'Basic head protection.', type: 'HEAD', value: 80, reqSkill: 'Defence', reqLevel: 1, stats: { def: 2 } },
  'bronze_chest': { id: 'bronze_chest', name: 'Bronze Platebody', description: 'Basic chest protection.', type: 'CHEST', value: 200, reqSkill: 'Defence', reqLevel: 1, stats: { def: 5 } },
  'bronze_legs': { id: 'bronze_legs', name: 'Bronze Platelegs', description: 'Basic leg protection.', type: 'LEGS', value: 120, reqSkill: 'Defence', reqLevel: 1, stats: { def: 3 } },
  'mithril_chest': { id: 'mithril_chest', name: 'Mithril Platebody', description: 'Superior mithril chest protection.', type: 'CHEST', value: 1800, reqSkill: 'Defence', reqLevel: 25, stats: { def: 18 } },

  // Creature Capturing & Battle Items
  'capture_device': { id: 'capture_device', name: 'Capture Device', description: 'Standard device used to capture wild Creature.', type: 'CONSUMABLE', value: 200 },
  'grand_ball': { id: 'grand_ball', name: 'Grand Ball', description: 'An enhanced Capture Device with 1.5x catch rate.', type: 'CONSUMABLE', value: 600 },
  'mega_ball': { id: 'mega_ball', name: 'Mega Ball', description: 'A high-grade Capture Device with 2.0x catch rate.', type: 'CONSUMABLE', value: 1200 },
};

export const CRAFTING_RECIPES = [
  {
    id: 'capture_device',
    resultItemId: 'capture_device',
    skill: 'Crafting',
    levelReq: 1,
    xpReward: 30,
    ingredients: { 'copper_ore': 1, 'wood_logs': 1 }
  },
  {
    id: 'grand_ball',
    resultItemId: 'grand_ball',
    skill: 'Crafting',
    levelReq: 10,
    xpReward: 75,
    ingredients: { 'copper_ore': 3, 'wood_logs': 2 }
  },
  {
    id: 'cooked_fish',
    resultItemId: 'cooked_fish',
    skill: 'Cooking',
    levelReq: 1,
    xpReward: 20,
    ingredients: { 'raw_fish': 1, 'wood_logs': 1 }
  },
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
  },
  {
    id: 'mithril_sword',
    resultItemId: 'mithril_sword',
    skill: 'Smithing',
    levelReq: 25,
    xpReward: 120,
    ingredients: { 'copper_ore': 8, 'wood_logs': 3 }
  }
];

export function getItem(id: string): ItemSchema | undefined {
  return ITEM_DB[id];
}
