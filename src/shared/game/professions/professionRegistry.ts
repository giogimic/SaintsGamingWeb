/**
 * Saints Gaming — Canonical Profession Definition Engine (Bible 25 §3.6)
 * Maps player crafting and gathering professions to primary skills, stations, and recipe domains.
 */

export type RecipeKind = 'craft' | 'refine' | 'cook' | 'smith' | 'alchemy' | 'gather';

export interface ProfessionDef {
  id: string;
  name: string;
  primarySkillId: string;
  stationTags: string[];
  relatedRecipeKinds: RecipeKind[];
  description: string;
  iconName: string;
  themeColor: string;
}

export const CANONICAL_PROFESSIONS: Record<string, ProfessionDef> = {
  smithing: {
    id: 'smithing',
    name: 'Blacksmithing',
    primarySkillId: 'smithing',
    stationTags: ['anvil', 'furnace'],
    relatedRecipeKinds: ['smith', 'refine'],
    description: 'Smelt raw ores into ingots and forge heavy weapons and armor plates.',
    iconName: 'Anvil',
    themeColor: '#475569',
  },
  cooking: {
    id: 'cooking',
    name: 'Culinary Arts',
    primarySkillId: 'cooking',
    stationTags: ['range', 'stove', 'campfire'],
    relatedRecipeKinds: ['cook'],
    description: 'Prepare rations, health restores, and grand feast buffs.',
    iconName: 'UtensilsCrossed',
    themeColor: '#ea580c',
  },
  crafting: {
    id: 'crafting',
    name: 'Artisan Crafting',
    primarySkillId: 'crafting',
    stationTags: ['workbench', 'spinning_wheel', 'tannery'],
    relatedRecipeKinds: ['craft'],
    description: 'Tailor leather gear, cut gems into amulets, and assemble soul crystals.',
    iconName: 'Hammer',
    themeColor: '#ca8a04',
  },
  herblore: {
    id: 'herblore',
    name: 'Apothecary & Alchemy',
    primarySkillId: 'herblore',
    stationTags: ['alchemy_table', 'brewing_stand'],
    relatedRecipeKinds: ['alchemy'],
    description: 'Distill herbs and monster essences into battle combat potions.',
    iconName: 'FlaskConical',
    themeColor: '#16a34a',
  },
  woodcutting: {
    id: 'woodcutting',
    name: 'Lumber Harvesting',
    primarySkillId: 'woodcutting',
    stationTags: ['tree_node', 'ancient_grove'],
    relatedRecipeKinds: ['gather'],
    description: 'Fell overworld trees for lumber, bark, and ancient tree sap.',
    iconName: 'Axe',
    themeColor: '#854d0e',
  },
  mining: {
    id: 'mining',
    name: 'Geology & Mining',
    primarySkillId: 'mining',
    stationTags: ['rock_node', 'gem_vein', 'quarry'],
    relatedRecipeKinds: ['gather'],
    description: 'Extract raw ore veins, coal, and rare gemstone geodes.',
    iconName: 'Pickaxe',
    themeColor: '#64748b',
  },
  fishing: {
    id: 'fishing',
    name: 'Angling & Harpooning',
    primarySkillId: 'fishing',
    stationTags: ['fishing_spot', 'deep_sea_dock'],
    relatedRecipeKinds: ['gather'],
    description: 'Angle freshwater and saltwater fish from overworld water nodes.',
    iconName: 'Fish',
    themeColor: '#0ea5e9',
  },
  farming: {
    id: 'farming',
    name: 'Agronomy & Cultivation',
    primarySkillId: 'farming',
    stationTags: ['farm_patch', 'herb_patch', 'compost_bin'],
    relatedRecipeKinds: ['gather'],
    description: 'Plant seeds and cultivate crops and potion herbs.',
    iconName: 'Sprout',
    themeColor: '#22c55e',
  },
};

export function getProfessionDef(id: string): ProfessionDef | undefined {
  return CANONICAL_PROFESSIONS[id.toLowerCase()];
}

export function getAllProfessionDefs(): ProfessionDef[] {
  return Object.values(CANONICAL_PROFESSIONS);
}

export function getProfessionsByStationTag(tag: string): ProfessionDef[] {
  const lower = tag.toLowerCase();
  return Object.values(CANONICAL_PROFESSIONS).filter((p) =>
    p.stationTags.some((t) => t.toLowerCase() === lower)
  );
}
