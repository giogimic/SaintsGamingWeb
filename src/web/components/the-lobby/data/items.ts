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
  // Materials & Farming Crops (Farming Skill Tier Progression)
  'seed_potato': { id: 'seed_potato', name: 'Potato Allotment Seed', description: 'Fast-growing potato seeds for beginner farming plots.', type: 'MATERIAL', value: 4, reqSkill: 'Farming', reqLevel: 1 },
  'seed_guam': { id: 'seed_guam', name: 'Guam Herb Seed', description: 'Aromatic herb seeds used in basic restorative herblore potions.', type: 'MATERIAL', value: 15, reqSkill: 'Farming', reqLevel: 9 },
  'supercompost_bucket': { id: 'supercompost_bucket', name: 'Supercompost Soil Pail', description: 'Enriched organic compost granting complete disease protection and +20% harvest yield.', type: 'CONSUMABLE', value: 80, reqSkill: 'Farming', reqLevel: 15 },
  'sweetcorn_seed': { id: 'sweetcorn_seed', name: 'Sweetcorn Allotment Seed', description: 'Hearty golden sweetcorn seeds yielding nutritious cobs.', type: 'MATERIAL', value: 45, reqSkill: 'Farming', reqLevel: 20 },
  'ranarr_seed': { id: 'ranarr_seed', name: 'Ranarr Herb Seed', description: 'Coveted prayer herb seeds used in sacred restoration draughts.', type: 'MATERIAL', value: 180, reqSkill: 'Farming', reqLevel: 32 },
  'watermelon_seed': { id: 'watermelon_seed', name: 'Watermelon Vine Seed', description: 'Rich juicy melon seeds delivering succulent combat food and supercompost material.', type: 'MATERIAL', value: 400, reqSkill: 'Farming', reqLevel: 47 },
  'magic_watering_can': { id: 'magic_watering_can', name: 'Enchanted Bottomless Can', description: 'Infinite wellspring watering can that halves crop growth timer intervals.', type: 'HEAD', value: 3500, reqSkill: 'Farming', reqLevel: 50, stats: { hp: 30 } },
  'magic_sapling': { id: 'magic_sapling', name: 'Magic Tree Sapling', description: 'Potted glowing sapling maturing into majestic magic timber trees.', type: 'MATERIAL', value: 3000, reqSkill: 'Farming', reqLevel: 75 },
  'spirit_tree_seed': { id: 'spirit_tree_seed', name: 'Spirit Tree Acorn', description: 'Sentient tree seed allowing worldwide fast-travel teleportation roots.', type: 'MATERIAL', value: 10000, reqSkill: 'Farming', reqLevel: 83 },
  'celestial_starflower_seed': { id: 'celestial_starflower_seed', name: 'Celestial Starflower Bulb', description: 'Mythic cosmic flower blooming in starlight and yielding immortal nectar.', type: 'MATERIAL', value: 45000, reqSkill: 'Farming', reqLevel: 99 },
  
  // Consumables & Raw Seafood Catches (Fishing Skill Tier Progression)
  'small_fishing_net': { id: 'small_fishing_net', name: 'Small Hand Fishing Net', description: 'Woven mesh net used to scoop freshwater shrimp and minnows.', type: 'MATERIAL', value: 20, reqSkill: 'Fishing', reqLevel: 1 },
  'raw_shrimp': { id: 'raw_shrimp', name: 'Raw Coastal Shrimp', description: 'Freshly netted shrimp ready for cooking.', type: 'FOOD', value: 4, reqSkill: 'Fishing', reqLevel: 1 },
  'raw_fish': { id: 'raw_fish', name: 'Raw Fish', description: 'Needs to be cooked.', type: 'FOOD', value: 3, reqSkill: 'Fishing', reqLevel: 1 },
  'raw_trout': { id: 'raw_trout', name: 'Raw Rainbow Trout', description: 'Firm freshwater trout caught from rushing rivers.', type: 'FOOD', value: 25, reqSkill: 'Fishing', reqLevel: 20 },
  'raw_salmon': { id: 'raw_salmon', name: 'Raw Crimson Salmon', description: 'Strong upstream salmon brimming with nutritious oil.', type: 'FOOD', value: 65, reqSkill: 'Fishing', reqLevel: 30 },
  'lobster_cage': { id: 'lobster_cage', name: 'Wicker Lobster Pot', description: 'Submerged wicker cage trapping heavy saltwater lobsters.', type: 'MATERIAL', value: 250, reqSkill: 'Fishing', reqLevel: 40 },
  'raw_lobster': { id: 'raw_lobster', name: 'Raw Ocean Lobster', description: 'Armored sea crustacean prized by gourmet chefs.', type: 'FOOD', value: 150, reqSkill: 'Fishing', reqLevel: 40 },
  'raw_swordfish': { id: 'raw_swordfish', name: 'Raw Bladed Swordfish', description: 'Deep-water predatory fish offering great cooking XP.', type: 'FOOD', value: 350, reqSkill: 'Fishing', reqLevel: 50 },
  'raw_shark': { id: 'raw_shark', name: 'Raw Great Apex Shark', description: 'Massive apex ocean predator yielding supreme combat rations.', type: 'FOOD', value: 1200, reqSkill: 'Fishing', reqLevel: 76 },
  'raw_manta_ray': { id: 'raw_manta_ray', name: 'Raw Abyssal Manta Ray', description: 'Enormous deep-ocean ray delivering extraordinary culinary sustenance.', type: 'FOOD', value: 3000, reqSkill: 'Fishing', reqLevel: 85 },
  'celestial_leviathan_scale': { id: 'celestial_leviathan_scale', name: 'Celestial Leviathan Scale', description: 'Iridescent glowing scale fished from mythic starlight whirlpools.', type: 'MATERIAL', value: 40000, reqSkill: 'Fishing', reqLevel: 99 },
  'cooked_fish': { id: 'cooked_fish', name: 'Cooked Fish', description: 'Freshly grilled river fish.', type: 'FOOD', value: 10, reqSkill: 'Hitpoints', reqLevel: 1, stats: { hp: 20 } },
  'patch_kit': { id: 'patch_kit', name: 'Field Dressing Kit', description: 'Quick-acting field bandage.', type: 'CONSUMABLE', value: 30, reqSkill: 'Hitpoints', reqLevel: 5, stats: { hp: 40 } },
  'cooked_trout': { id: 'cooked_trout', name: 'Grilled Rainbow Trout', description: 'Crisp trout offering hearty vitality.', type: 'FOOD', value: 45, reqSkill: 'Hitpoints', reqLevel: 10, stats: { hp: 60 } },
  'vitality_draught': { id: 'vitality_draught', name: 'Vitality Draught', description: 'Invigorating herbal tonic that rapidly restores health.', type: 'CONSUMABLE', value: 120, reqSkill: 'Hitpoints', reqLevel: 15, stats: { hp: 90 } },
  'cooked_salmon': { id: 'cooked_salmon', name: 'Poached Crimson Salmon', description: 'Nutrient-rich salmon that strengthens life force.', type: 'FOOD', value: 180, reqSkill: 'Hitpoints', reqLevel: 20, stats: { hp: 130 } },
  'heartstone_talisman': { id: 'heartstone_talisman', name: 'Heartstone Amulet', description: 'Crystalline pendant radiating enduring vigor.', type: 'HEAD', value: 800, reqSkill: 'Hitpoints', reqLevel: 25, stats: { hp: 50, def: 5 } },
  'cooked_lobster': { id: 'cooked_lobster', name: 'Butter-Seared Lobster', description: 'Delicacy providing sustained life regeneration in battle.', type: 'FOOD', value: 450, reqSkill: 'Hitpoints', reqLevel: 30, stats: { hp: 200 } },
  'super_vitality_potion': { id: 'super_vitality_potion', name: 'Elixir of Rapid Mending', description: 'Potent alchemical concoction that restores critical health.', type: 'CONSUMABLE', value: 1100, reqSkill: 'Hitpoints', reqLevel: 35, stats: { hp: 300 } },
  'cooked_shark': { id: 'cooked_shark', name: 'Great Apex Shark Steak', description: 'Apex predator ration delivering massive regenerative energy.', type: 'FOOD', value: 2500, reqSkill: 'Hitpoints', reqLevel: 40, stats: { hp: 420 } },
  'saintly_ambrosia': { id: 'saintly_ambrosia', name: 'Saintly Ambrosia Flask', description: 'Nectar of the saints restoring immense health and max HP pool.', type: 'CONSUMABLE', value: 6500, reqSkill: 'Hitpoints', reqLevel: 45, stats: { hp: 650 } },
  'phoenix_elixir': { id: 'phoenix_elixir', name: 'Phoenix Rebirth Heart Vial', description: 'Legendary life essence granting complete recovery and a temporary life ward.', type: 'CONSUMABLE', value: 20000, reqSkill: 'Hitpoints', reqLevel: 50, stats: { hp: 1000 } },

  'film_standard': { id: 'film_standard', name: 'Standard Film', description: 'Soul-sensitive film for turn-based capture.', type: 'CONSUMABLE', value: 100 },
  'film_fine': { id: 'film_fine', name: 'Fine Grain Film', description: '2× catch rate film stock.', type: 'CONSUMABLE', value: 250 },
  'soul_camera': { id: 'soul_camera', name: 'Soul Camera', description: 'Exposes film to bind a creature soul.', type: 'CONSUMABLE', value: 50 },
  'binding_crystal': { id: 'binding_crystal', name: 'Standard Film (legacy)', description: 'Legacy slug — prefer film_standard.', type: 'CONSUMABLE', value: 100 },
  'capture_script': { id: 'capture_script', name: 'Film (legacy)', description: 'Legacy slug. Prefer film_standard.', type: 'CONSUMABLE', value: 100 },
  'axe_bronze': { id: 'axe_bronze', name: 'Rook Hatchet', description: 'Woodcutting tool (demo starter kit).', type: 'WEAPON', value: 40, reqSkill: 'Attack', reqLevel: 1 },
  'pickaxe_bronze': { id: 'pickaxe_bronze', name: 'Crude Pickaxe', description: 'Mining tool (demo starter kit).', type: 'WEAPON', value: 40, reqSkill: 'Attack', reqLevel: 1 },

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

  // Equipment - Ranged Weapons & Armor (Ranged Skill Tier Progression)
  'wooden_bow': { id: 'wooden_bow', name: 'Starter Wooden Shortbow', description: 'A flexible starter wood bow for target practice.', type: 'WEAPON', value: 100, reqSkill: 'Ranged', reqLevel: 1, stats: { atk: 4 } },
  'leather_chaps': { id: 'leather_chaps', name: 'Tanned Leather Chaps', description: 'Supple leather leggings offering freedom of movement for archers.', type: 'LEGS', value: 80, reqSkill: 'Ranged', reqLevel: 1, stats: { def: 2 } },
  'oak_bow': { id: 'oak_bow', name: 'Oak Recurve Bow', description: 'Stout oak bow delivering heightened arrow velocity.', type: 'WEAPON', value: 350, reqSkill: 'Ranged', reqLevel: 10, stats: { atk: 10 } },
  'studded_leather_tunic': { id: 'studded_leather_tunic', name: 'Studded Leather Tunic', description: 'Reinforced leather vest studded with steel rivets.', type: 'CHEST', value: 450, reqSkill: 'Ranged', reqLevel: 15, stats: { def: 10, atk: 5 } },
  'willow_composite_bow': { id: 'willow_composite_bow', name: 'Willow Composite Bow', description: 'Laminated willow bow granting rapid fire cycles.', type: 'WEAPON', value: 750, reqSkill: 'Ranged', reqLevel: 20, stats: { atk: 18 } },
  'maple_recurve_bow': { id: 'maple_recurve_bow', name: 'Maple War Bow', description: 'Heavy tension maple war bow with superior effective range.', type: 'WEAPON', value: 1300, reqSkill: 'Ranged', reqLevel: 25, stats: { atk: 26 } },
  'ranger_dragonhide_tunic': { id: 'ranger_dragonhide_tunic', name: 'Emerald Wyrmhide Tunic', description: 'Supple wyrmhide providing superb projectile protection and arrow focus.', type: 'CHEST', value: 2400, reqSkill: 'Ranged', reqLevel: 30, stats: { def: 25, atk: 12 } },
  'yew_longbow': { id: 'yew_longbow', name: 'Yew Sniper Longbow', description: 'Masterwork yew longbow dealing devastating single-shot impact.', type: 'WEAPON', value: 3200, reqSkill: 'Ranged', reqLevel: 35, stats: { atk: 38 } },
  'magic_shortbow': { id: 'magic_shortbow', name: 'Enchanted Magic Shortbow', description: 'Glows with arcane runes, allowing rapid double-shot special volleys.', type: 'WEAPON', value: 6500, reqSkill: 'Ranged', reqLevel: 40, stats: { atk: 52 } },
  'darkveil_heavy_crossbow': { id: 'darkveil_heavy_crossbow', name: 'Darkveil Siege Crossbow', description: 'Heavy mechanical ballista firing armor-penetrating titanium bolts.', type: 'WEAPON', value: 16000, reqSkill: 'Ranged', reqLevel: 45, stats: { atk: 70 } },
  'saintly_scout_garb': { id: 'saintly_scout_garb', name: 'Saintly Sunstrider Garb', description: 'Consecrated golden ranger tunic humming with divine accuracy.', type: 'CHEST', value: 28000, reqSkill: 'Ranged', reqLevel: 45, stats: { def: 45, atk: 20 } },
  'celestial_sunstriker_bow': { id: 'celestial_sunstriker_bow', name: 'Celestial Sunstriker Greatbow', description: 'Ultimate cosmic bow firing concentrated stellar plasma arrows across infinite range.', type: 'WEAPON', value: 55000, reqSkill: 'Ranged', reqLevel: 50, stats: { atk: 92 } },
  // Equipment - Agility Footwear & Stamina Gear (Agility Skill Tier Progression)
  'leather_boots': { id: 'leather_boots', name: 'Leather Hiking Boots', description: 'Flexible leather boots providing sure footing on rugged trails.', type: 'LEGS', value: 60, reqSkill: 'Agility', reqLevel: 1, stats: { def: 1 } },
  'stamina_potion': { id: 'stamina_potion', name: 'Stamina Infusion Flask', description: 'Restores 40% maximum run energy instantly.', type: 'CONSUMABLE', value: 80, reqSkill: 'Agility', reqLevel: 5 },
  'nimble_runners': { id: 'nimble_runners', name: 'Nimble Track Runners', description: 'Featherlight sprinting footwear increasing movement speed by 5%.', type: 'LEGS', value: 250, reqSkill: 'Agility', reqLevel: 10, stats: { def: 3 } },
  'graceful_cloak': { id: 'graceful_cloak', name: 'Graceful Wind Cloak', description: 'Weight-reducing mantle that cuts stamina drain during sprints by 15%.', type: 'CHEST', value: 600, reqSkill: 'Agility', reqLevel: 15, stats: { def: 5 } },
  'shadow_shinobi_tabi': { id: 'shadow_shinobi_tabi', name: 'Shadow Shinobi Tabi', description: 'Silent padded tabi boots granting +10% dodge evasion in combat.', type: 'LEGS', value: 1200, reqSkill: 'Agility', reqLevel: 20, stats: { def: 8, atk: 4 } },
  'super_stamina_elixir': { id: 'super_stamina_elixir', name: 'Grand Stamina Elixir', description: 'Completely restores stamina and reduces drain by 70% for 2 minutes.', type: 'CONSUMABLE', value: 850, reqSkill: 'Agility', reqLevel: 25 },
  'zephyr_windwalkers': { id: 'zephyr_windwalkers', name: 'Zephyr Windwalkers', description: 'Enchanted azure boots granting airborne double-jump leaps and extended dodge rolls.', type: 'LEGS', value: 3500, reqSkill: 'Agility', reqLevel: 35, stats: { def: 18, atk: 10 } },
  'cyclone_striders': { id: 'cyclone_striders', name: 'Cyclone Striders', description: 'Harnesses hurricane winds, granting +15% continuous sprint velocity.', type: 'LEGS', value: 7500, reqSkill: 'Agility', reqLevel: 40, stats: { def: 25, atk: 15 } },
  'saintly_winged_sandals': { id: 'saintly_winged_sandals', name: 'Saintly Winged Sandals', description: 'Divine golden talaria sandals completely ignoring terrain slowdown and hazardous puddles.', type: 'LEGS', value: 20000, reqSkill: 'Agility', reqLevel: 45, stats: { def: 40, atk: 22 } },
  // Equipment - Perception Optics & Radar Accessories (Perception Skill Tier Progression)
  'brass_spyglass': { id: 'brass_spyglass', name: 'Polished Brass Spyglass', description: 'Handheld optical spyglass revealing distant creature habitats.', type: 'HEAD', value: 80, reqSkill: 'Perception', reqLevel: 1, stats: { atk: 2 } },
  'tracking_charm': { id: 'tracking_charm', name: 'Hunter Tracking Charm', description: 'Enchanted pendant that highlights elusive creature footprints.', type: 'CONSUMABLE', value: 100, reqSkill: 'Perception', reqLevel: 5 },
  'scout_monocle': { id: 'scout_monocle', name: 'Scout Brass Monocle', description: 'Precision glass monocle magnifying monster weak points (+4% critical chance).', type: 'HEAD', value: 300, reqSkill: 'Perception', reqLevel: 10, stats: { atk: 5, def: 2 } },
  'true_sight_potion': { id: 'true_sight_potion', name: 'True-Sight Clarifying Elixir', description: 'Alchemical draught revealing camouflaged creatures and hidden floor traps.', type: 'CONSUMABLE', value: 650, reqSkill: 'Perception', reqLevel: 15 },
  'hawkeye_goggles': { id: 'hawkeye_goggles', name: 'Hawkeye Sniper Goggles', description: 'Reinforced leather goggles with multi-zoom lenses (+7% critical chance).', type: 'HEAD', value: 1400, reqSkill: 'Perception', reqLevel: 20, stats: { atk: 10, def: 5 } },
  'crystalline_prism_lens': { id: 'crystalline_prism_lens', name: 'Crystalline Prism Lens', description: 'Prismatic gemstone eyepiece exposing concealed illusions and secret map passages.', type: 'HEAD', value: 2800, reqSkill: 'Perception', reqLevel: 25, stats: { atk: 16, def: 8 } },
  'shadow_seer_visor': { id: 'shadow_seer_visor', name: 'Shadow-Seer Night Visor', description: 'Thermal infrared tactical visor allowing flawless targeting in pitch darkness.', type: 'HEAD', value: 5500, reqSkill: 'Perception', reqLevel: 35, stats: { atk: 24, def: 14 } },
  'all_seeing_oracle_eye': { id: 'all_seeing_oracle_eye', name: 'Oracle All-Seeing Oculus', description: 'Ancient mystic ocular relic granting 360-degree radar vision on the MiniMap.', type: 'HEAD', value: 12000, reqSkill: 'Perception', reqLevel: 40, stats: { atk: 35, def: 20 } },
  'saintly_divination_circlet': { id: 'saintly_divination_circlet', name: 'Saintly Divination Circlet', description: 'Golden crown humming with divine premonition (+25% critical strike chance).', type: 'HEAD', value: 26000, reqSkill: 'Perception', reqLevel: 45, stats: { atk: 50, def: 30 } },
  // Equipment - Wisdom Spiritual Gear & Mana Elixirs (Wisdom Skill Tier Progression)
  'apprentice_talisman': { id: 'apprentice_talisman', name: 'Apprentice Spirit Talisman', description: 'Carved wooden talisman expanding spiritual mana capacity.', type: 'HEAD', value: 80, reqSkill: 'Wisdom', reqLevel: 1, stats: { hp: 10, def: 2 } },
  'mana_draught': { id: 'mana_draught', name: 'Distilled Mana Draught', description: 'Restores 50 Mana Points (MP) instantly.', type: 'CONSUMABLE', value: 100, reqSkill: 'Wisdom', reqLevel: 5 },
  'willow_focus_tome': { id: 'willow_focus_tome', name: 'Willow Prayer Scripture', description: 'Bound parchment scripture boosting restorative spell potency by 10%.', type: 'HEAD', value: 350, reqSkill: 'Wisdom', reqLevel: 10, stats: { hp: 20, def: 4 } },
  'sacred_cleansing_incense': { id: 'sacred_cleansing_incense', name: 'Sacred Cleansing Incense', description: 'Aromatic resin that dispels elemental status debuffs and curses.', type: 'CONSUMABLE', value: 500, reqSkill: 'Wisdom', reqLevel: 15 },
  'spirit_ward_buckler': { id: 'spirit_ward_buckler', name: 'Spirit Ward Buckler', description: 'Lightweight warding shield deflecting incoming hostile elemental spells.', type: 'LEGS', value: 1200, reqSkill: 'Wisdom', reqLevel: 20, stats: { def: 14, hp: 30 } },
  'super_mana_potion': { id: 'super_mana_potion', name: 'Grand Mana Elixir', description: 'Potent distillation restoring 150 Mana Points (MP).', type: 'CONSUMABLE', value: 900, reqSkill: 'Wisdom', reqLevel: 25 },
  'archon_aegis_relic': { id: 'archon_aegis_relic', name: 'Archon Spirit Aegis', description: 'Luminescent barrier relic projecting a protective energy dome over nearby allies.', type: 'LEGS', value: 4500, reqSkill: 'Wisdom', reqLevel: 35, stats: { def: 28, hp: 60 } },
  'sanctified_priest_robes': { id: 'sanctified_priest_robes', name: 'Sanctified Hierophant Robes', description: 'Blessed silk vestments granting +35% healing output and elemental warding.', type: 'CHEST', value: 9500, reqSkill: 'Wisdom', reqLevel: 40, stats: { def: 38, hp: 80 } },
  'saintly_seraph_vestments': { id: 'saintly_seraph_vestments', name: 'Saintly Seraph Vestments', description: 'Consecrated gold-trimmed robes radiating divine light and passive mana restoration.', type: 'CHEST', value: 25000, reqSkill: 'Wisdom', reqLevel: 45, stats: { def: 55, hp: 120 } },
  // Equipment - Intelligence Spellcasting Wands & Arcane Staves (Intelligence Skill Tier Progression)
  'ash_wand': { id: 'ash_wand', name: 'Apprentice Ash Wand', description: 'Basic carved ash wand focusing fundamental magical bolts.', type: 'WEAPON', value: 90, reqSkill: 'Intelligence', reqLevel: 1, stats: { atk: 4 } },
  'quartz_spark_wand': { id: 'quartz_spark_wand', name: 'Sparking Quartz Wand', description: 'Wand capped with charged quartz crystal emitting lightning jolts.', type: 'WEAPON', value: 380, reqSkill: 'Intelligence', reqLevel: 10, stats: { atk: 12 } },
  'pyromancer_staff': { id: 'pyromancer_staff', name: 'Pyromancer Ash Staff', description: 'Flame-scorched quarterstaff channeling combustible fireballs.', type: 'WEAPON', value: 1100, reqSkill: 'Intelligence', reqLevel: 20, stats: { atk: 22 } },
  'glacial_frost_orb': { id: 'glacial_frost_orb', name: 'Glacial Cryo Orb', description: 'Frozen elemental catalyst slowing targets and chilling enemy cast times.', type: 'WEAPON', value: 2400, reqSkill: 'Intelligence', reqLevel: 25, stats: { atk: 30 } },
  'lightning_surge_grimoire': { id: 'lightning_surge_grimoire', name: 'Thunderstrike Grimoire', description: 'Arcane tome crackling with high-voltage electricity (+15% spell haste).', type: 'WEAPON', value: 5200, reqSkill: 'Intelligence', reqLevel: 35, stats: { atk: 45 } },
  'voidwalker_arch_staff': { id: 'voidwalker_arch_staff', name: 'Voidwalker Arch-Staff', description: 'Heavy cosmic staff tearing localized rifts of nether energy.', type: 'WEAPON', value: 14000, reqSkill: 'Intelligence', reqLevel: 40, stats: { atk: 62 } },
  'saintly_sunfire_scepter': { id: 'saintly_sunfire_scepter', name: 'Saintly Sunfire Scepter', description: 'Golden solar scepter incinerating targets with blinding celestial flares.', type: 'WEAPON', value: 32000, reqSkill: 'Intelligence', reqLevel: 45, stats: { atk: 80 } },
  'celestial_singularity_wand': { id: 'celestial_singularity_wand', name: 'Celestial Singularity Baton', description: 'Ultimate cosmic wand collapsing spacetime into a devastating localized black hole.', type: 'WEAPON', value: 85000, reqSkill: 'Intelligence', reqLevel: 50, stats: { atk: 110 } },

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
