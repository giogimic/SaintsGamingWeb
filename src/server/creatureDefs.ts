import { prisma } from "@/web/lib/prisma";
import {
  CreatureDefData,
  toPlayerCreatureStats,
} from "@/shared/game/creatureCatalog";
import { creatureRowToData } from "@/shared/game/creatureDefMap";

export async function loadCreatureDef(slug: string): Promise<CreatureDefData | null> {
  const row = await prisma.creatureDef.findUnique({ where: { slug } });
  if (row?.isActive) return creatureRowToData(row);
  return null;
}

export async function loadStarterCreatureDefs(): Promise<CreatureDefData[]> {
  const rows = await prisma.creatureDef.findMany({
    where: { isActive: true, isStarter: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(creatureRowToData);
}

export async function loadWildSpawnDefs(): Promise<CreatureDefData[]> {
  const rows = await prisma.creatureDef.findMany({
    where: { isActive: true, isWildSpawn: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(creatureRowToData);
}

export { toPlayerCreatureStats };
