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

  // Equipment - Heavy & Crushing Weapons (Strength Skill Tier Progression)
  'bronze_battleaxe': { id: 'bronze_battleaxe', name: 'Bronze Battleaxe', description: 'A hefty bronze battleaxe with broad cleave edge.', type: 'WEAPON', value: 180, reqSkill: 'Strength', reqLevel: 1, stats: { atk: 7 } },
  'bronze_warhammer': { id: 'bronze_warhammer', name: 'Bronze Warhammer', description: 'Heavy bludgeoning hammer that shatters light armor.', type: 'WEAPON', value: 200, reqSkill: 'Strength', reqLevel: 1, stats: { atk: 8 } },
  'iron_battleaxe': { id: 'iron_battleaxe', name: 'Iron Battleaxe', description: 'Weighted iron battleaxe designed for crushing blows.', type: 'WEAPON', value: 500, reqSkill: 'Strength', reqLevel: 10, stats: { atk: 15 } },
  'iron_warhammer': { id: 'iron_warhammer', name: 'Iron Warhammer', description: 'Solid iron warhammer delivering punishing impact.', type: 'WEAPON', value: 550, reqSkill: 'Strength', reqLevel: 10, stats: { atk: 18 } },
  'steel_battleaxe': { id: 'steel_battleaxe', name: 'Steel Battleaxe', description: 'Hardened steel axe designed for brutal overhead strikes.', type: 'WEAPON', value: 900, reqSkill: 'Strength', reqLevel: 20, stats: { atk: 25 } },
  'steel_warhammer': { id: 'steel_warhammer', name: 'Steel Warhammer', description: 'A massive steel maul capable of denting plate armor.', type: 'WEAPON', value: 1050, reqSkill: 'Strength', reqLevel: 20, stats: { atk: 30 } },
  'mithril_battleaxe': { id: 'mithril_battleaxe', name: 'Mithril Battleaxe', description: 'High-balance mithril greataxe delivering swift, heavy cuts.', type: 'WEAPON', value: 1500, reqSkill: 'Strength', reqLevel: 25, stats: { atk: 35 } },
  'mithril_warhammer': { id: 'mithril_warhammer', name: 'Mithril Warhammer', description: 'Resonant azure warhammer dealing severe shockwaves.', type: 'WEAPON', value: 1750, reqSkill: 'Strength', reqLevel: 25, stats: { atk: 42 } },
  'adamant_battleaxe': { id: 'adamant_battleaxe', name: 'Adamant Battleaxe', description: 'Monolithic adamantine battleaxe with immense cleaving force.', type: 'WEAPON', value: 3000, reqSkill: 'Strength', reqLevel: 35, stats: { atk: 50 } },
  'adamant_2h': { id: 'adamant_2h', name: 'Adamant 2H Greatsword', description: 'A gargantuan two-handed sword swinging with unstoppable momentum.', type: 'WEAPON', value: 3800, reqSkill: 'Strength', reqLevel: 35, stats: { atk: 62 } },
  'rune_battleaxe': { id: 'rune_battleaxe', name: 'Rune Battleaxe', description: 'Masterwork runite axe infused with devastating momentum.', type: 'WEAPON', value: 6500, reqSkill: 'Strength', reqLevel: 40, stats: { atk: 68 } },
  'rune_2h': { id: 'rune_2h', name: 'Rune 2H Greatsword', description: 'Legendary two-handed runite blade that cleaves entire swarms.', type: 'WEAPON', value: 8500, reqSkill: 'Strength', reqLevel: 40, stats: { atk: 80 } },
  'colossus_maul': { id: 'colossus_maul', name: 'Colossus Earthshaker Maul', description: 'An ancient titan stone maul that causes localized tectonic rifts.', type: 'WEAPON', value: 18000, reqSkill: 'Strength', reqLevel: 45, stats: { atk: 98 } },
  'titan_crusher': { id: 'titan_crusher', name: 'Titan Worldbreaker Hammer', description: 'A cataclysmic cosmic warhammer capable of shattering continental plates.', type: 'WEAPON', value: 45000, reqSkill: 'Strength', reqLevel: 50, stats: { atk: 125 } },

  // Equipment - Ranged Weapons
  'wooden_bow': { id: 'wooden_bow', name: 'Wooden Bow', description: 'A basic ranged weapon.', type: 'WEAPON', value: 100, reqSkill: 'Ranged', reqLevel: 1, stats: { atk: 4 } },

  // Equipment - Armor & Shields (Defence Skill Tier Progression)
  'bronze_shield': { id: 'bronze_shield', name: 'Bronze Kiteshield', description: 'Basic bronze shield providing reliable frontal deflection.', type: 'LEGS', value: 100, reqSkill: 'Defence', reqLevel: 1, stats: { def: 4 } },
  'bronze_helm': { id: 'bronze_helm', name: 'Bronze Full Helm', description: 'Basic bronze head protection.', type: 'HEAD', value: 80, reqSkill: 'Defence', reqLevel: 1, stats: { def: 2 } },
  'bronze_chest': { id: 'bronze_chest', name: 'Bronze Platebody', description: 'Basic hammered bronze chest protection.', type: 'CHEST', value: 200, reqSkill: 'Defence', reqLevel: 1, stats: { def: 5 } },
  'bronze_legs': { id: 'bronze_legs', name: 'Bronze Platelegs', description: 'Basic bronze leg protection.', type: 'LEGS', value: 120, reqSkill: 'Defence', reqLevel: 1, stats: { def: 3 } },

  'iron_shield': { id: 'iron_shield', name: 'Iron Kiteshield', description: 'Sturdy iron shield capable of absorbing heavy strikes.', type: 'LEGS', value: 300, reqSkill: 'Defence', reqLevel: 10, stats: { def: 8 } },
  'iron_helm': { id: 'iron_helm', name: 'Iron Full Helm', description: 'Riveted iron helmet with protective face visor.', type: 'HEAD', value: 250, reqSkill: 'Defence', reqLevel: 10, stats: { def: 5 } },
  'iron_chest': { id: 'iron_chest', name: 'Iron Platebody', description: 'Interlocking iron cuirass with solid rib reinforcement.', type: 'CHEST', value: 550, reqSkill: 'Defence', reqLevel: 10, stats: { def: 12 } },
  'iron_legs': { id: 'iron_legs', name: 'Iron Platelegs', description: 'Heavy iron greaves and cuisses.', type: 'LEGS', value: 350, reqSkill: 'Defence', reqLevel: 10, stats: { def: 8 } },

  'steel_shield': { id: 'steel_shield', name: 'Steel Tower Shield', description: 'Reinforced carbon steel tower shield for total body warding.', type: 'LEGS', value: 700, reqSkill: 'Defence', reqLevel: 20, stats: { def: 14 } },
  'steel_helm': { id: 'steel_helm', name: 'Steel Full Helm', description: 'Tempered steel helmet deflecting crushing blows.', type: 'HEAD', value: 600, reqSkill: 'Defence', reqLevel: 20, stats: { def: 9 } },
  'steel_chest': { id: 'steel_chest', name: 'Steel Platebody', description: 'Tempered steel breastplate offering balanced physical deflection.', type: 'CHEST', value: 1200, reqSkill: 'Defence', reqLevel: 20, stats: { def: 20 } },
  'steel_legs': { id: 'steel_legs', name: 'Steel Platelegs', description: 'Articulated steel leg armor allowing full combat mobility.', type: 'LEGS', value: 850, reqSkill: 'Defence', reqLevel: 20, stats: { def: 14 } },

  'mithril_shield': { id: 'mithril_shield', name: 'Mithril Kiteshield', description: 'Lightweight azure mithril shield granting rapid parry responses.', type: 'LEGS', value: 1400, reqSkill: 'Defence', reqLevel: 25, stats: { def: 20 } },
  'mithril_helm': { id: 'mithril_helm', name: 'Mithril Full Helm', description: 'Gleaming blue mithril helmet with reinforced crown.', type: 'HEAD', value: 1100, reqSkill: 'Defence', reqLevel: 25, stats: { def: 14 } },
  'mithril_chest': { id: 'mithril_chest', name: 'Mithril Platebody', description: 'Superior mithril chestplate balancing featherweight agility with high defense.', type: 'CHEST', value: 2400, reqSkill: 'Defence', reqLevel: 25, stats: { def: 28 } },
  'mithril_legs': { id: 'mithril_legs', name: 'Mithril Platelegs', description: 'Resilient azure platelegs forged from refined mithril.', type: 'LEGS', value: 1600, reqSkill: 'Defence', reqLevel: 25, stats: { def: 20 } },

  'adamant_shield': { id: 'adamant_shield', name: 'Adamant Tower Shield', description: 'Impenetrable emerald-hued adamantine tower shield.', type: 'LEGS', value: 3200, reqSkill: 'Defence', reqLevel: 35, stats: { def: 30 } },
  'adamant_helm': { id: 'adamant_helm', name: 'Adamant Full Helm', description: 'Heavy adamantine visor designed for front-line siege warfare.', type: 'HEAD', value: 2600, reqSkill: 'Defence', reqLevel: 35, stats: { def: 22 } },
  'adamant_chest': { id: 'adamant_chest', name: 'Adamant Platebody', description: 'Dense adamantine platebody capable of turning aside ballista bolts.', type: 'CHEST', value: 5500, reqSkill: 'Defence', reqLevel: 35, stats: { def: 40 } },
  'adamant_legs': { id: 'adamant_legs', name: 'Adamant Platelegs', description: 'Monolithic adamantine greaves providing unshakeable stability.', type: 'LEGS', value: 3800, reqSkill: 'Defence', reqLevel: 35, stats: { def: 30 } },

  'rune_shield': { id: 'rune_shield', name: 'Rune Kiteshield', description: 'Legendary cyan runite kiteshield engraved with protection wards.', type: 'LEGS', value: 7500, reqSkill: 'Defence', reqLevel: 40, stats: { def: 42 } },
  'rune_helm': { id: 'rune_helm', name: 'Rune Full Helm', description: 'Masterwork runite full helm radiating faint defensive wards.', type: 'HEAD', value: 6200, reqSkill: 'Defence', reqLevel: 40, stats: { def: 32 } },
  'rune_chest': { id: 'rune_chest', name: 'Rune Platebody', description: 'Immaculate runite cuirass forged by master armorsmiths.', type: 'CHEST', value: 12000, reqSkill: 'Defence', reqLevel: 40, stats: { def: 55 } },
  'rune_legs': { id: 'rune_legs', name: 'Rune Platelegs', description: 'Runite platelegs providing top-tier battle resistance.', type: 'LEGS', value: 8500, reqSkill: 'Defence', reqLevel: 40, stats: { def: 42 } },

  'saintly_aegis': { id: 'saintly_aegis', name: 'Saintly Bastion Aegis', description: 'Consecrated golden bastion shield that emanates holy defensive warding.', type: 'LEGS', value: 22000, reqSkill: 'Defence', reqLevel: 45, stats: { def: 60, hp: 40 } },
  'saintly_plate': { id: 'saintly_plate', name: 'Saintly Radiant Cuirass', description: 'Divine golden armor forged in sacred fires, blessing the wearer with immense resilience.', type: 'CHEST', value: 35000, reqSkill: 'Defence', reqLevel: 45, stats: { def: 75, hp: 60 } },

  'celestial_bulwark': { id: 'celestial_bulwark', name: 'Celestial Cosmos Bulwark', description: 'Transcendent starmetal greatshield reflecting hostile reality itself.', type: 'LEGS', value: 60000, reqSkill: 'Defence', reqLevel: 50, stats: { def: 85, hp: 80 } },
  'celestial_plate': { id: 'celestial_plate', name: 'Celestial Vanguard Fortress Plate', description: 'Ultimate armor forged from dying stars, rendering the wearer an immovable bastion.', type: 'CHEST', value: 95000, reqSkill: 'Defence', reqLevel: 50, stats: { def: 110, hp: 100 } },

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
