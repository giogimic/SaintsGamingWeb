import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const map = await prisma.worldMap.findUnique({ where: { id: 'STARTING_MEADOW' } });
  const mapVersion = await prisma.worldMapVersion.findUnique({ where: { mapId_version: { mapId: 'STARTING_MEADOW', version: 1 } } });
  const settings = await prisma.siteSetting.findMany({ where: { key: { in: ['DEFAULT_MAP_ID', 'SPAWN_MAP_ID'] } } });
  
  console.log("WorldMap:", map ? { id: map.id, publishedVersion: map.publishedVersion } : null);
  console.log("WorldMapVersion:", mapVersion ? { mapId: mapVersion.mapId, version: mapVersion.version } : null);
  console.log("Settings:", settings);
}

test().catch(console.error).finally(() => prisma.$disconnect());
