import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const characters = await prisma.gameCharacter.findMany({
    take: 5
  });

  for (const c of characters) {
    console.log(`Character ${c.name}: visualData = ${c.visualData}, assetProfileId = ${c.assetProfileId}`);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
