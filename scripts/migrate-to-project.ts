import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.worldProject.upsert({
    where: { slug: 'saints' },
    create: {
      slug: 'saints',
      name: 'Saints World',
      description: 'The canonical Saints MMO world project.',
    },
    update: {},
  });
  console.log('Project created/found:', project);

  const maps = await prisma.worldMap.updateMany({
    where: { OR: [{ gameId: null }, { gameId: 'saints' }] },
    data: { gameId: 'saints' },
  });
  console.log('Migrated maps:', maps.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
