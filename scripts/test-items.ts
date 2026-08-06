import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Testing ItemTemplate CRUD...');
  
  // 1. Create
  console.log('Creating iron_sword...');
  const item = await prisma.itemTemplate.upsert({
    where: { slug: 'iron_sword' },
    update: {
      name: 'Iron Sword',
      description: 'A basic iron sword.',
      category: 'WEAPON',
      subCategory: 'SWORD',
      tier: 1,
      stackable: false,
      baseStats: JSON.stringify({ attackPower: 10 }),
    },
    create: {
      slug: 'iron_sword',
      name: 'Iron Sword',
      description: 'A basic iron sword.',
      category: 'WEAPON',
      subCategory: 'SWORD',
      tier: 1,
      stackable: false,
      baseStats: JSON.stringify({ attackPower: 10 }),
    },
  });
  console.log('Created:', item);

  // 2. Read
  console.log('\nFetching iron_sword...');
  const fetched = await prisma.itemTemplate.findUnique({ where: { slug: 'iron_sword' } });
  console.log('Fetched:', fetched);

  // 3. List
  console.log('\nListing item templates...');
  const list = await prisma.itemTemplate.findMany();
  console.log(`Found ${list.length} item(s)`);

  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
