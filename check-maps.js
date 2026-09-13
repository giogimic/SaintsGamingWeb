const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const s = await prisma.serverSettings.findUnique({where: {key: 'startingMapId'}});
  console.log('Starting Map:', s?.value);
  
  const mapId = s?.value || 'STARTING_MEADOW';
  const m = await prisma.worldMap.findFirst({where: {id: mapId}});
  console.log('Map:', m?.id, 'Published:', m?.publishedVersion);
  
  const v = await prisma.worldMapVersion.findFirst({where: {mapId: m?.id}});
  console.log('Version:', v?.version);
  
  // Also check all maps
  const allMaps = await prisma.worldMap.findMany();
  console.log('All maps:', allMaps.map(x => `${x.id} (pub: ${x.publishedVersion})`));
}

main().finally(() => prisma.$disconnect());
