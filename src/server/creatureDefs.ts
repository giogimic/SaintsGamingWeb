import { PrismaClient } from "@prisma/client";
import {
  CreatureDefData,
  FALLBACK_CREATURE_DEFS,
  getFallbackCreature,
  listFallbackStarters,
  toPlayerCreatureStats,
} from "@/shared/game/creatureCatalog";
import { creatureRowToData } from "@/shared/game/creatureDefMap";

const prisma = new PrismaClient();

export async function loadCreatureDef(slug: string): Promise<CreatureDefData | null> {
  try {
    const row = await prisma.creatureDef.findUnique({ where: { slug } });
    if (row?.isActive) return creatureRowToData(row);
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
    if (rows.length > 0) return rows.map(creatureRowToData);
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
    if (rows.length > 0) return rows.map(creatureRowToData);
  } catch {
    /* fallback */
  }
  return FALLBACK_CREATURE_DEFS.filter((c) => c.isWildSpawn && c.isActive);
}

export { toPlayerCreatureStats };
