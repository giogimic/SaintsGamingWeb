import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const s = await prisma.siteSetting?.findUnique({where: {key: 'startingMapId'}}).catch(() => null);
  console.log('Starting Map from SiteSetting:', s?.value);
  
  const allMaps = await prisma.worldMap.findMany({
    select: { id: true, name: true, publishedVersion: true, mapType: true }
  });
  console.table(allMaps);
  
  const allVersions = await prisma.worldMapVersion.findMany({
    select: { id: true, mapId: true, version: true }
  });
  console.table(allVersions);
}

main().finally(() => prisma.$disconnect());
