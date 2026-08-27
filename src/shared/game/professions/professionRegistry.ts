/**
 * Saints Gaming — Canonical Profession Definition Engine (Bible 25 §3.6)
 * Maps all 27 player Combat and Life skills into formal professions with station tags, descriptions, and category helpers.
 */

export type RecipeKind = 'craft' | 'refine' | 'cook' | 'smith' | 'alchemy' | 'gather' | 'spell' | 'rite' | 'tame' | 'combat';

export type ProfessionCategory = 'COMBAT' | 'LIFE';
export type ProfessionSubCategory = 'Combat' | 'Gathering' | 'Artisan' | 'Support';

export interface ProfessionDef {
  id: string;
  name: string;
  category: ProfessionCategory;
  subCategory: ProfessionSubCategory;
  primarySkillId: string;
  stationTags: string[];
  relatedRecipeKinds: RecipeKind[];
  description: string;
  tagline?: string;
  iconName: string;
  themeColor: string;
  maxLevel: number;
}

export const CANONICAL_PROFESSIONS: Record<string, ProfessionDef> = {
  // ─── COMBAT PROFESSIONS (9) ──────────────────────────────────────────────
  attack: {
    id: 'attack',
    name: 'Blade & Weapon Mastery',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'attack',
    stationTags: ['training_dummy', 'combat_arena'],
    relatedRecipeKinds: ['combat'],
    description: 'Governs melee accuracy, blade techniques, and the ability to wield advanced martial weaponry.',
    tagline: 'Master precision strikes and cleave through enemy defenses.',
    iconName: 'Sword',
    themeColor: '#ef4444',
    maxLevel: 50,
  },
  strength: {
    id: 'strength',
    name: 'Martial Power & Athletics',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'strength',
    stationTags: ['weight_rack', 'combat_arena', 'boulder_gym'],
    relatedRecipeKinds: ['combat'],
    description: 'Increases raw physical strike damage, knockback impact, and heavy equipment handling.',
    tagline: 'Shatter stone and armor with raw physical brute force.',
    iconName: 'Dumbbell',
    themeColor: '#f97316',
    maxLevel: 50,
  },
  defence: {
    id: 'defence',
    name: 'Shield Mastery & Bulwark',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'defence',
    stationTags: ['sparring_ring', 'barracks'],
    relatedRecipeKinds: ['combat'],
    description: 'Enhances physical deflection, parry timing, shield block efficiency, and heavy armor fortification.',
    tagline: 'Stand as an unbreakable fortress against deadly beast attacks.',
    iconName: 'Shield',
    themeColor: '#3b82f6',
    maxLevel: 50,
  },
  hitpoints: {
    id: 'hitpoints',
    name: 'Vitality & Constitution',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'hitpoints',
    stationTags: ['sanctuary_bed', 'spa_spring'],
    relatedRecipeKinds: ['combat'],
    description: 'Increases maximum life essence and natural health regeneration during and outside of combat.',
    tagline: 'Endure mortal wounds and sustain prolonged battlefield engagements.',
    iconName: 'Heart',
    themeColor: '#10b981',
    maxLevel: 50,
  },
  ranged: {
    id: 'ranged',
    name: 'Archery & Marksmanship',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'ranged',
    stationTags: ['archery_range', 'hunting_blind'],
    relatedRecipeKinds: ['combat'],
    description: 'Enables precise long-range bow, crossbow, and throwing projectile attacks with critical hit multipliers.',
    tagline: 'Eliminate threats from afar with deadly pinpoint accuracy.',
    iconName: 'Crosshair',
    themeColor: '#84cc16',
    maxLevel: 50,
  },
  agility: {
    id: 'agility',
    name: 'Acrobatics & Evasion',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'agility',
    stationTags: ['obstacle_course', 'rooftop_parkour'],
    relatedRecipeKinds: ['combat'],
    description: 'Enhances dodge chance, stamina recovery rate, movement speed bursts, and obstacle navigation.',
    tagline: 'Dance across hazardous battlefields and evade lethal blow strikes.',
    iconName: 'Wind',
    themeColor: '#06b6d4',
    maxLevel: 50,
  },
  perception: {
    id: 'perception',
    name: 'Scouting & Keen Senses',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'perception',
    stationTags: ['watchtower', 'scout_camp'],
    relatedRecipeKinds: ['combat'],
    description: 'Reveals hidden traps, stealthy enemies, critical weak points, and distant overworld points of interest.',
    tagline: 'See what remains unseen and exploit enemy vulnerabilities.',
    iconName: 'Eye',
    themeColor: '#eab308',
    maxLevel: 50,
  },
  wisdom: {
    id: 'wisdom',
    name: 'Willpower & Spiritual Lore',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'wisdom',
    stationTags: ['meditation_circle', 'shrine'],
    relatedRecipeKinds: ['combat', 'rite'],
    description: 'Strengthens mental fortitude against crowd control, status curses, and enhances support spell potency.',
    tagline: 'Harness inner harmony and transcend physical limitations.',
    iconName: 'BookOpen',
    themeColor: '#8b5cf6',
    maxLevel: 50,
  },
  intelligence: {
    id: 'intelligence',
    name: 'Tactics & Arcane Engineering',
    category: 'COMBAT',
    subCategory: 'Combat',
    primarySkillId: 'intelligence',
    stationTags: ['study_desk', 'arcane_library'],
    relatedRecipeKinds: ['combat', 'spell'],
    description: 'Expands spell mana reserves, magical attack power, and cooldown reduction rates.',
    tagline: 'Weave complex magical formulas and command the raw elements.',
    iconName: 'Cpu',
    themeColor: '#6366f1',
    maxLevel: 50,
  },

  // ─── LIFE PROFESSIONS: GATHERING (5) ─────────────────────────────────────
  mining: {
    id: 'mining',
    name: 'Geology & Mining',
    category: 'LIFE',
    subCategory: 'Gathering',
    primarySkillId: 'mining',
    stationTags: ['rock_node', 'gem_vein', 'quarry'],
    relatedRecipeKinds: ['gather'],
    description: 'Extract raw ore veins, coal deposits, and rare gemstone geodes from mountain quarries and deep caves.',
    tagline: 'Excavate precious metals and rare gemstones from the realm bedrock.',
    iconName: 'Pickaxe',
    themeColor: '#64748b',
    maxLevel: 99,
  },
  woodcutting: {
    id: 'woodcutting',
    name: 'Lumber Harvesting',
    category: 'LIFE',
    subCategory: 'Gathering',
    primarySkillId: 'woodcutting',
    stationTags: ['tree_node', 'ancient_grove'],
    relatedRecipeKinds: ['gather'],
    description: 'Fell overworld trees for normal, oak, willow, yew, and celestial magic timber.',
    tagline: 'Harvest exotic lumber, ancient bark, and magical sap.',
    iconName: 'Axe',
    themeColor: '#854d0e',
    maxLevel: 99,
  },
  fishing: {
    id: 'fishing',
    name: 'Angling & Harpooning',
    category: 'LIFE',
    subCategory: 'Gathering',
    primarySkillId: 'fishing',
    stationTags: ['fishing_spot', 'deep_sea_dock'],
    relatedRecipeKinds: ['gather'],
    description: 'Angle freshwater and saltwater sea fish, crustaceans, and rare aquatic reagents.',
    tagline: 'Catch bountiful catches across tranquil streams and raging seas.',
    iconName: 'Fish',
    themeColor: '#0ea5e9',
    maxLevel: 99,
  },
  farming: {
    id: 'farming',
    name: 'Agronomy & Cultivation',
    category: 'LIFE',
    subCategory: 'Gathering',
    primarySkillId: 'farming',
    stationTags: ['farm_patch', 'herb_patch', 'compost_bin'],
    relatedRecipeKinds: ['gather'],
    description: 'Plant seeds, cultivate crops, potion herbs, and harvest fruit orchards.',
    tagline: 'Nurture fertile soil and cultivate rare alchemical flora.',
    iconName: 'Sprout',
    themeColor: '#22c55e',
    maxLevel: 99,
  },
  hunter: {
    id: 'hunter',
    name: 'Beast Tracking & Trapping',
    category: 'LIFE',
    subCategory: 'Gathering',
    primarySkillId: 'hunter',
    stationTags: ['trap_location', 'hunting_blind'],
    relatedRecipeKinds: ['gather', 'tame'],
    description: 'Set box traps, snare birds, track elusive woodland beasts, and collect rare pelts.',
    tagline: 'Track wild creatures through wilderness tracks and woodland snares.',
    iconName: 'Target',
    themeColor: '#d97706',
    maxLevel: 99,
  },

  // ─── LIFE PROFESSIONS: ARTISAN (8) ───────────────────────────────────────
  smithing: {
    id: 'smithing',
    name: 'Blacksmithing',
    category: 'LIFE',
    subCategory: 'Artisan',
    primarySkillId: 'smithing',
    stationTags: ['anvil', 'furnace', 'forge'],
    relatedRecipeKinds: ['smith', 'refine'],
    description: 'Smelt raw ores into metal ingots and forge heavy plate armor, shields, and weapons.',
    tagline: 'Forge blazing steel into masterwork arms and legendary armor.',
    iconName: 'Anvil',
    themeColor: '#475569',
    maxLevel: 99,
  },
  cooking: {
    id: 'cooking',
    name: 'Culinary Arts & Brewing',
    category: 'LIFE',
    subCategory: 'Artisan',
    primarySkillId: 'cooking',
    stationTags: ['range', 'stove', 'campfire', 'brewery_keg'],
    relatedRecipeKinds: ['cook'],
    description: 'Prepare delicious rations, hearty stews, and grand feast buffs for party adventures.',
    tagline: 'Cook exquisite dishes that heal wounds and bolster team combat prowess.',
    iconName: 'UtensilsCrossed',
    themeColor: '#ea580c',
    maxLevel: 99,
  },
  crafting: {
    id: 'crafting',
    name: 'Artisan Crafting & Jewelry',
    category: 'LIFE',
    subCategory: 'Artisan',
    primarySkillId: 'crafting',
    stationTags: ['workbench', 'spinning_wheel', 'tannery', 'gem_bench'],
    relatedRecipeKinds: ['craft'],
    description: 'Tether leather gear, cut precious gemstones into amulets, and weave enchanted rings.',
    tagline: 'Craft fine leatherwork, cut flawless jewels, and bind magical trinkets.',
    iconName: 'Hammer',
    themeColor: '#ca8a04',
    maxLevel: 99,
  },
  herblore: {
    id: 'herblore',
    name: 'Apothecary & Alchemy',
    category: 'LIFE',
    subCategory: 'Artisan',
    primarySkillId: 'herblore',
    stationTags: ['alchemy_table', 'brewing_stand', 'mortar_pestle'],
    relatedRecipeKinds: ['alchemy'],
    description: 'Clean grimy herbs, distill extracts, and brew combat elixir flasks and healing potions.',
    tagline: 'Distill ancient herbs and monster extracts into powerful battle potions.',
    iconName: 'FlaskConical',
    themeColor: '#16a34a',
    maxLevel: 99,
  },
  fletching: {
    id: 'fletching',
    name: 'Fletching & Bowcraft',
    category: 'LIFE',
    subCategory: 'Artisan',
    primarySkillId: 'fletching',
    stationTags: ['workbench', 'fletching_table'],
    relatedRecipeKinds: ['craft'],
    description: 'Carve wooden logs into shortbows, longbows, crossbow stocks, and attach arrow feather fletchings.',
    tagline: 'Fashion supple bows and razor-sharp arrows for marksmen.',
    iconName: 'Feather',
    themeColor: '#15803d',
    maxLevel: 99,
  },
  firemaking: {
    id: 'firemaking',
    name: 'Pyromancy & Campcraft',
    category: 'LIFE',
    subCategory: 'Artisan',
    primarySkillId: 'firemaking',
    stationTags: ['campfire', 'brazier', 'beacon'],
    relatedRecipeKinds: ['refine'],
    description: 'Ignite logs into warming bonfires, signal beacons, and ash fertilizers.',
    tagline: 'Kindle roaring bonfires that provide zone-wide warmth and regeneration buffs.',
    iconName: 'Flame',
    themeColor: '#dc2626',
    maxLevel: 99,
  },
  runecrafting: {
    id: 'runecrafting',
    name: 'Runecrafting & Enchanting',
    category: 'LIFE',
    subCategory: 'Artisan',
    primarySkillId: 'runecrafting',
    stationTags: ['runic_altar', 'enchanting_table'],
    relatedRecipeKinds: ['craft', 'refine'],
    description: 'Imbue pure rune essence with elemental stones at ancient altars across the realm.',
    tagline: 'Infuse raw essence with celestial magic into spellcasting runes.',
    iconName: 'Sparkle',
    themeColor: '#9333ea',
    maxLevel: 99,
  },
  construction: {
    id: 'construction',
    name: 'Architecture & Carpentry',
    category: 'LIFE',
    subCategory: 'Artisan',
    primarySkillId: 'construction',
    stationTags: ['sawmill', 'carpenter_bench', 'estate_plot'],
    relatedRecipeKinds: ['craft'],
    description: 'Build furniture, dungeon defense traps, sanctuary home expansions, and guild citadel wings.',
    tagline: 'Construct grand estates, comfortable furniture, and guild fortresses.',
    iconName: 'Home',
    themeColor: '#78350f',
    maxLevel: 99,
  },

  // ─── LIFE PROFESSIONS: SUPPORT / SPIRITUAL (5) ───────────────────────────
  thieving: {
    id: 'thieving',
    name: 'Rogue Arts & Infiltration',
    category: 'LIFE',
    subCategory: 'Support',
    primarySkillId: 'thieving',
    stationTags: ['lockpick_dummy', 'shadow_alley'],
    relatedRecipeKinds: ['gather'],
    description: 'Pickpocket wealthy city merchants, disarm dungeon lockboxes, and bypass secured vault gates.',
    tagline: 'Lurk in shadows and liberate coin and treasures from locked chests.',
    iconName: 'Key',
    themeColor: '#4b5563',
    maxLevel: 99,
  },
  magic: {
    id: 'magic',
    name: 'Arcane Sorcery & Evocation',
    category: 'LIFE',
    subCategory: 'Support',
    primarySkillId: 'magic',
    stationTags: ['arcane_circle', 'wizard_tower'],
    relatedRecipeKinds: ['spell'],
    description: 'Cast teleportation spells, elemental blast invocations, and utility transmutation enchantments.',
    tagline: 'Harness the cosmic ley lines to warp reality and blast foes with elemental fury.',
    iconName: 'Wand2',
    themeColor: '#2563eb',
    maxLevel: 99,
  },
  prayer: {
    id: 'prayer',
    name: 'Divine Holy Rites',
    category: 'LIFE',
    subCategory: 'Support',
    primarySkillId: 'prayer',
    stationTags: ['holy_altar', 'divine_chapel'],
    relatedRecipeKinds: ['rite'],
    description: 'Bury ancient monster bones and offer prayers to invoke protective combat auras and smites.',
    tagline: 'Call upon benevolent deities for divine protection and blessing auras.',
    iconName: 'Sun',
    themeColor: '#eab308',
    maxLevel: 99,
  },
  summoning: {
    id: 'summoning',
    name: 'Buddy Binding & Conjuration',
    category: 'LIFE',
    subCategory: 'Support',
    primarySkillId: 'summoning',
    stationTags: ['summoning_obelisk', 'spirit_shrine'],
    relatedRecipeKinds: ['craft', 'tame'],
    description: 'Infuse spirit pouches with charms to summon loyal combat familiars and beasts of burden.',
    tagline: 'Channel spirit charms into pouches to summon faithful battle companions.',
    iconName: 'Sparkles',
    themeColor: '#059669',
    maxLevel: 99,
  },
  necromancy: {
    id: 'necromancy',
    name: 'Shadow Arts & Soul Harvesting',
    category: 'LIFE',
    subCategory: 'Support',
    primarySkillId: 'necromancy',
    stationTags: ['dark_altar', 'soul_well'],
    relatedRecipeKinds: ['rite', 'spell'],
    description: 'Harvest restless ectoplasm and command spectral undead minions to aid in dangerous crypt delves.',
    tagline: 'Commune with the departed spirits and channel ethereal death energy.',
    iconName: 'Skull',
    themeColor: '#7c3aed',
    maxLevel: 99,
  },
};

export function getProfessionDef(id: string): ProfessionDef | undefined {
  return CANONICAL_PROFESSIONS[id.toLowerCase()];
}

export function getAllProfessionDefs(): ProfessionDef[] {
  return Object.values(CANONICAL_PROFESSIONS);
}

export function getAllCombatProfessions(): ProfessionDef[] {
  return Object.values(CANONICAL_PROFESSIONS).filter((p) => p.category === 'COMBAT');
}

export function getAllLifeProfessions(): ProfessionDef[] {
  return Object.values(CANONICAL_PROFESSIONS).filter((p) => p.category === 'LIFE');
}

export function getProfessionsBySubCategory(subCategory: ProfessionSubCategory): ProfessionDef[] {
  return Object.values(CANONICAL_PROFESSIONS).filter((p) => p.subCategory === subCategory);
}

export function getProfessionsByStationTag(tag: string): ProfessionDef[] {
  const lower = tag.toLowerCase();
  return Object.values(CANONICAL_PROFESSIONS).filter((p) =>
    p.stationTags.some((t) => t.toLowerCase() === lower)
  );
}
