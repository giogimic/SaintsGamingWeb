import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default Roles and Tiers...');

  // Default Roles
  const roles = [
    { name: 'Admin', level: 100, color: 'text-red-500' },
    { name: 'Moderator', level: 50, color: 'text-purple-500' },
    { name: 'VIP', level: 30, color: 'text-amber-500' },
    { name: 'User', level: 20, color: 'text-zinc-400' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('Roles seeded.');

  // Default LevelTiers
  const tiers = [
    { level: 1, name: 'Newbie', xpRequired: 0, icon: '🌟' },
    { level: 5, name: 'Regular', xpRequired: 500, icon: '⭐' },
    { level: 10, name: 'Veteran', xpRequired: 2000, icon: '🏆' },
    { level: 25, name: 'Saint', xpRequired: 10000, icon: '👑' },
  ];

  for (const tier of tiers) {
    await prisma.levelTier.upsert({
      where: { level: tier.level },
      update: {},
      create: tier,
    });
  }
  console.log('Tiers seeded.');

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
