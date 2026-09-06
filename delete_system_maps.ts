import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteSystemMaps() {
  const mapIds = ['DEMO_SANDBOX', 'STARTING_MAP'];
  for (const id of mapIds) {
    try {
      await prisma.worldMap.deleteMany({ where: { id } });
      await prisma.gameMap.deleteMany({ where: { id } });
      console.log(`Deleted ${id} successfully.`);
    } catch (e) {
      console.error(`Failed to delete ${id}:`, e);
    }
  }
}

deleteSystemMaps().finally(() => prisma.$disconnect());
