const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const releases = await prisma.worldRelease.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  console.log(`Found ${releases.length} releases.`);
  for (const r of releases) {
    const manifest = JSON.parse(r.manifestData);
    console.log('Release:', r.id, r.version);
    const maps = manifest.maps || [];
    for (const m of maps) {
      const size = Buffer.byteLength(JSON.stringify(m), 'utf8');
      console.log(' - Map:', m.id, 'Type:', m.mapType, 'TotalSize:', size, 'GridDataSize:', m.gridData ? Buffer.byteLength(JSON.stringify(m.gridData), 'utf8') : 0);
    }
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
