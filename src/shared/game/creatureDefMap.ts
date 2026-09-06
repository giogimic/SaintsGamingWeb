/**
 * Map Prisma CreatureDef rows ↔ CreatureDefData (shared by server actions + engine).
 */

import type {
  CreatureDefData,
  CreaturePassive,
  CreatureAbilitySlot,
} from "./creatureCatalog";

export type CreatureDefRowLike = {
  slug: string;
  gameId?: string | null;
  name: string;
  dexNumber: number;
  mythos: string;
  typePrimary: string;
  typeSecondary: string;
  spriteOverworld: string;
  spriteBattle: string | null;
  spriteBack: string | null;
  shinyEnabled?: boolean;
  shinyUseGlobalChance?: boolean;
  shinyChancePercent?: number;
  shinySpriteOverworld?: string | null;
  shinySpriteBattle?: string | null;
  shinySpriteBack?: string | null;
  baseHp: number;
  physicalPower: number;
  physicalDefense: number;
  abilityPower: number;
  abilityDefense: number;
  combatTempo: number;
  catchRate: number;
  starterLevel: number;
  passivesJson: string;
  worldSkillName: string;
  worldSkillDescription: string;
  abilitiesJson: string;
  flavor: string;
  tag: string;
  tagColor: string;
  stage: string;
  isStarter: boolean;
  isWildSpawn: boolean;
  isActive: boolean;
  sortOrder: number;
  evolutionsJson?: string;
};

export function creatureRowToData(row: CreatureDefRowLike): CreatureDefData {
  let passives: CreaturePassive[] = [];
  let abilities: CreatureAbilitySlot[] = [];
  try {
    passives = JSON.parse(row.passivesJson || "[]");
  } catch {
    passives = [];
  }
  try {
    abilities = JSON.parse(row.abilitiesJson || "[]");
  } catch {
    abilities = [];
  }
  let evolutions: any[] = [];
  try {
    if (row.evolutionsJson) evolutions = JSON.parse(row.evolutionsJson);
  } catch {
    evolutions = [];
  }
  return {
    slug: row.slug,
    gameId: row.gameId ?? null,
    name: row.name,
    dexNumber: row.dexNumber,
    mythos: row.mythos || 'Beastial',
    typePrimary: row.typePrimary,
    typeSecondary: row.typeSecondary,
    spriteOverworld: row.spriteOverworld,
    spriteBattle: row.spriteBattle,
    spriteBack: row.spriteBack,
    shinyEnabled: row.shinyEnabled !== false,
    shinyUseGlobalChance: row.shinyUseGlobalChance !== false,
    shinyChancePercent: row.shinyChancePercent ?? 0.5,
    shinySpriteOverworld: row.shinySpriteOverworld ?? null,
    shinySpriteBattle: row.shinySpriteBattle ?? null,
    shinySpriteBack: row.shinySpriteBack ?? null,
    baseHp: row.baseHp,
    physicalPower: row.physicalPower,
    physicalDefense: row.physicalDefense,
    abilityPower: row.abilityPower,
    abilityDefense: row.abilityDefense,
    combatTempo: row.combatTempo,
    catchRate: row.catchRate,
    starterLevel: row.starterLevel,
    passives,
    worldSkillName: row.worldSkillName,
    worldSkillDescription: row.worldSkillDescription,
    abilities,
    flavor: row.flavor,
    tag: row.tag,
    tagColor: row.tagColor,
    stage: row.stage,
    isStarter: row.isStarter,
    isWildSpawn: row.isWildSpawn,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    evolutions,
  };
}

export function creatureDataToDb(data: CreatureDefData) {
  return {
    slug: data.slug,
    gameId: data.gameId || null,
    name: data.name,
    dexNumber: data.dexNumber || 0,
    mythos: data.mythos || 'Beastial',
    typePrimary: data.typePrimary || "Normal",
    typeSecondary: data.typeSecondary || "None",
    spriteOverworld: data.spriteOverworld,
    spriteBattle: data.spriteBattle || null,
    spriteBack: data.spriteBack || null,
    shinyEnabled: data.shinyEnabled !== false,
    shinyUseGlobalChance: data.shinyUseGlobalChance !== false,
    shinyChancePercent: data.shinyChancePercent ?? 0.5,
    shinySpriteOverworld: data.shinySpriteOverworld || null,
    shinySpriteBattle: data.shinySpriteBattle || null,
    shinySpriteBack: data.shinySpriteBack || null,
    baseHp: data.baseHp,
    physicalPower: data.physicalPower,
    physicalDefense: data.physicalDefense,
    abilityPower: data.abilityPower,
    abilityDefense: data.abilityDefense,
    combatTempo: data.combatTempo,
    catchRate: data.catchRate,
    starterLevel: data.starterLevel,
    passivesJson: JSON.stringify(data.passives || []),
    worldSkillName: data.worldSkillName || "",
    worldSkillDescription: data.worldSkillDescription || "",
    abilitiesJson: JSON.stringify(data.abilities || []),
    flavor: data.flavor || "",
    tag: data.tag || "Standard",
    tagColor: data.tagColor || "#34d399",
    stage: data.stage || "basic",
    isStarter: !!data.isStarter,
    isWildSpawn: !!data.isWildSpawn,
    isActive: data.isActive !== false,
    sortOrder: data.sortOrder || 0,
    evolutionsJson: JSON.stringify(data.evolutions || []),
  };
}
