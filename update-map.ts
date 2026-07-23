import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateMap() {
  const dbMap = await prisma.worldMap.findUnique({ where: { id: 'SAINTS_VILLAGE' } });
  if (dbMap) {
    const grid = JSON.parse(dbMap.gridData);
    if (grid[12] && grid[12][14] !== undefined) {
      grid[12][14] = 9; // Add anvil
      await prisma.worldMap.update({
        where: { id: 'SAINTS_VILLAGE' },
        data: { gridData: JSON.stringify(grid) }
      });
      console.log('Updated SAINTS_VILLAGE map with Anvil at (14, 12)');
    }
  } else {
    console.log('No SAINTS_VILLAGE found in DB. Good to go (it will fallback to local GAME_MAPS).');
  }
}

updateMap().finally(() => prisma.$disconnect());
