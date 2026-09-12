const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Setting SPAWN_MAP_ID to STARTING_MEADOW...");
  
  // Set SiteSetting SPAWN_MAP_ID
  await prisma.siteSetting.upsert({
    where: { key: 'SPAWN_MAP_ID' },
    update: { value: 'STARTING_MEADOW' },
    create: { key: 'SPAWN_MAP_ID', value: 'STARTING_MEADOW' }
  });

  // Set SiteSetting DEFAULT_MAP_ID
  await prisma.siteSetting.upsert({
    where: { key: 'DEFAULT_MAP_ID' },
    update: { value: 'STARTING_MEADOW' },
    create: { key: 'DEFAULT_MAP_ID', value: 'STARTING_MEADOW' }
  });

  // Fix TEST_MAP ID
  const testMap = await prisma.worldMap.findUnique({ where: { id: 'TEST_MAP' }});
  if (testMap) {
    console.log("Deleting TEST_MAP to prevent auto-fallback to it...");
    await prisma.worldMap.delete({ where: { id: 'TEST_MAP' }});
  }

  // Remove lastMapId from TesterBot
  const testers = await prisma.character.findMany({ where: { name: 'TesterBot' } });
  for (const c of testers) {
    let meta = {};
    if (c.metadata) {
      try { meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata; } catch(e) {}
    }
    meta.lastMapId = 'STARTING_MEADOW';
    await prisma.character.update({
      where: { id: c.id },
      data: { metadata: JSON.stringify(meta) }
    });
    console.log('Updated', c.name);
  }
}
main().finally(() => prisma.$disconnect());
