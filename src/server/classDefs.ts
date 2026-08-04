/**
 * Runtime loader for playable CharacterClass rows (DB → fallback catalog).
 */

import { prisma } from "@/web/lib/prisma";
import {
  ClassDefData,
  DEFAULT_GAME_CONFIG_SLUG,
  DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT,
  getFallbackClass,
  listPlayableFallbackClasses,
  resolveClassStats,
} from "@/shared/game/classCatalog";
import { classRowToData } from "@/shared/game/classDefMap";

export async function ensureDefaultGameConfig(): Promise<{
  id: string;
  globalShinyChancePercent: number;
}> {
  let config = await prisma.gameConfig.findUnique({ where: { slug: DEFAULT_GAME_CONFIG_SLUG } });
  if (!config) {
    config = await prisma.gameConfig.create({
      data: {
        slug: DEFAULT_GAME_CONFIG_SLUG,
        name: "Saints Gaming",
        description: "Default Saints MMO config",
        isActive: true,
        globalShinyChancePercent: DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT,
        baseStats: JSON.stringify({ hp: 100, atk: 50, def: 45, spd: 50, ratk: 45, rdef: 45 }),
      },
    });
  }
  return {
    id: config.id,
    globalShinyChancePercent: config.globalShinyChancePercent ?? DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT,
  };
}

export async function loadGlobalShinyChancePercent(): Promise<number> {
  try {
    const config = await prisma.gameConfig.findUnique({
      where: { slug: DEFAULT_GAME_CONFIG_SLUG },
      select: { globalShinyChancePercent: true },
    });
    if (config) return config.globalShinyChancePercent ?? DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT;
  } catch {
    /* missing column / table */
  }
  return DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT;
}

/** Shared + matching world-profile rows (null/empty profileId = shared). */
function classProfileScope(profileId?: string | null) {
  if (!profileId) return {};
  return {
    OR: [{ profileId: null }, { profileId: "" }, { profileId }],
  };
}

export async function loadClassDef(
  classIdOrSlug: string,
  profileId?: string | null
): Promise<ClassDefData | null> {
  try {
    const { id: gameId } = await ensureDefaultGameConfig();
    const key = classIdOrSlug.toUpperCase();
    const scope = classProfileScope(profileId);
    const row =
      (await prisma.characterClass.findFirst({
        where: { gameId, classId: key, isPlayable: true, ...scope },
      })) ||
      (await prisma.characterClass.findFirst({
        where: { gameId, slug: classIdOrSlug.toLowerCase(), isPlayable: true, ...scope },
      }));
    if (row) return classRowToData(row);
  } catch {
    /* fallback */
  }
  const fb = getFallbackClass(classIdOrSlug);
  return fb && fb.isPlayable ? fb : null;
}

export async function loadPlayableClasses(profileId?: string | null): Promise<ClassDefData[]> {
  try {
    const { id: gameId } = await ensureDefaultGameConfig();
    const rows = await prisma.characterClass.findMany({
      where: { gameId, isPlayable: true, ...classProfileScope(profileId) },
      orderBy: { sortOrder: "asc" },
    });
    if (rows.length > 0) return rows.map(classRowToData);
  } catch {
    /* fallback */
  }
  return listPlayableFallbackClasses();
}

export { resolveClassStats, classRowToData };
