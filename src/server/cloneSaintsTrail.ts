import type { PrismaClient } from '@prisma/client';

export interface CloneSaintsTrailOptions {
  targetSlug: string;
  name?: string;
  force?: boolean;
}

export async function cloneSaintsTrailToProfile(
  db: PrismaClient,
  opts: CloneSaintsTrailOptions
): Promise<{
  targetSlug: string;
  mapId: string;
  quests: number;
  npcs: number;
  dialogues: number;
}> {
  const targetSlug = opts.targetSlug.toLowerCase().trim();
  const mapId = `${targetSlug.toUpperCase()}_START`;

  // Upsert GameConfig for profile
  await db.gameConfig.upsert({
    where: { slug: targetSlug },
    create: {
      slug: targetSlug,
      name: opts.name || targetSlug,
      description: `Cloned adventure profile for ${opts.name || targetSlug}`,
      isActive: false,
    },
    update: {
      name: opts.name || targetSlug,
    },
  });

  const h = 24;
  const w = 24;
  const grid = Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => (r === 0 || r === h - 1 || c === 0 || c === w - 1 ? 1 : 0))
  );

  await db.worldMap.upsert({
    where: { id: mapId },
    create: {
      id: mapId,
      gameId: targetSlug,
      name: `${opts.name || targetSlug} Starting Zone`,
      gridData: JSON.stringify(grid),
      gatesData: JSON.stringify({ spawnPoint: { x: 12, y: 12 }, gates: [] }),
      npcsData: '[]',
      encountersData: '[]',
      tileLayersData: JSON.stringify([{ name: 'Ground', grid }]),
      tilesetsData: JSON.stringify([
        {
          firstgid: 1,
          imageSource: 'Terrain_by_George.png',
          columns: 15,
          tilewidth: 16,
          tileheight: 16,
        },
      ]),
      version: 1,
    },
    update: {
      gameId: targetSlug,
      name: `${opts.name || targetSlug} Starting Zone`,
    },
  });

  return {
    targetSlug,
    mapId,
    quests: 0,
    npcs: 0,
    dialogues: 0,
  };
}
