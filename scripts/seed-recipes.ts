import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding item templates & recipes...");
  
  // Seed ItemTemplates for ingredients and outputs
  await prisma.itemTemplate.upsert({
    where: { slug: 'iron_ore' },
    update: {},
    create: { slug: 'iron_ore', name: 'Iron Ore', category: 'RESOURCE' }
  });
  
  await prisma.itemTemplate.upsert({
    where: { slug: 'iron_sword' },
    update: {},
    create: { slug: 'iron_sword', name: 'Iron Sword', category: 'WEAPON', subCategory: 'SWORD', baseDurability: 100, stackable: false }
  });
  
  await prisma.itemTemplate.upsert({
    where: { slug: 'logs' },
    update: {},
    create: { slug: 'logs', name: 'Logs', category: 'RESOURCE' }
  });
  
  await prisma.itemTemplate.upsert({
    where: { slug: 'wood_bow' },
    update: {},
    create: { slug: 'wood_bow', name: 'Wood Bow', category: 'WEAPON', subCategory: 'BOW', baseDurability: 50, stackable: false }
  });
  
  // Seed Recipes
  await prisma.craftingRecipe.upsert({
    where: { slug: 'craft_iron_sword' },
    update: {},
    create: {
      slug: 'craft_iron_sword',
      outputItemSlug: 'iron_sword',
      outputQuantity: 1,
      skillSlug: 'smithing',
      levelReq: 1,
      xpReward: 15,
      ingredients: JSON.stringify([{ itemSlug: 'iron_ore', qty: 2 }]),
      timeMs: 2000
    }
  });

  await prisma.craftingRecipe.upsert({
    where: { slug: 'craft_wood_bow' },
    update: {},
    create: {
      slug: 'craft_wood_bow',
      outputItemSlug: 'wood_bow',
      outputQuantity: 1,
      skillSlug: 'fletching',
      levelReq: 1,
      xpReward: 10,
      ingredients: JSON.stringify([{ itemSlug: 'logs', qty: 3 }]),
      timeMs: 1500
    }
  });

  console.log("Done seeding items & recipes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
