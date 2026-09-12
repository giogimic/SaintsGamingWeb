const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const v = await prisma.worldMapVersion.findUnique({ where: { mapId_version: { mapId: 'STARTING_MEADOW', version: 1 } } });
  if (v) {
    const regions = await prisma.worldMapVersionRegion.findMany({ where: { versionId: v.id }, select: { regionX: true, regionZ: true } });
    console.log(JSON.stringify(regions, null, 2));
  } else {
    console.log("No version found");
  }
  prisma.$disconnect();
}
run();
