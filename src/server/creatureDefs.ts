import { PrismaClient } from "@prisma/client";
import {
  CreatureDefData,
  CreaturePassive,
  CreatureAbilitySlot,
  FALLBACK_CREATURE_DEFS,
  getFallbackCreature,
  listFallbackStarters,
  toPlayerCreatureStats,
} from "@/shared/game/creatureCatalog";

const prisma = new PrismaClient();

function rowToData(row: {
  slug: string;
  name: string;
  dexNumber: number;
  typePrimary: string;
  typeSecondary: string;
  spriteOverworld: string;
  spriteBattle: string | null;
  spriteBack: string | null;
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
}): CreatureDefData {
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
  return {
    slug: row.slug,
    name: row.name,
    dexNumber: row.dexNumber,
    typePrimary: row.typePrimary,
    typeSecondary: row.typeSecondary,
    spriteOverworld: row.spriteOverworld,
    spriteBattle: row.spriteBattle,
    spriteBack: row.spriteBack,
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
  };
}

export async function loadCreatureDef(slug: string): Promise<CreatureDefData | null> {
  try {
    const row = await prisma.creatureDef.findUnique({ where: { slug } });
    if (row?.isActive) return rowToData(row);
  } catch {
    /* CreatureDef table may not be migrated yet */
  }
  const fb = getFallbackCreature(slug);
  return fb && fb.isActive ? fb : null;
}

export async function loadStarterCreatureDefs(): Promise<CreatureDefData[]> {
  try {
    const rows = await prisma.creatureDef.findMany({
      where: { isActive: true, isStarter: true },
      orderBy: { sortOrder: "asc" },
    });
    if (rows.length > 0) return rows.map(rowToData);
  } catch {
    /* fallback */
  }
  return listFallbackStarters();
}

export async function loadWildSpawnDefs(): Promise<CreatureDefData[]> {
  try {
    const rows = await prisma.creatureDef.findMany({
      where: { isActive: true, isWildSpawn: true },
      orderBy: { sortOrder: "asc" },
    });
    if (rows.length > 0) return rows.map(rowToData);
  } catch {
    /* fallback */
  }
  return FALLBACK_CREATURE_DEFS.filter((c) => c.isWildSpawn && c.isActive);
}

export { toPlayerCreatureStats };
