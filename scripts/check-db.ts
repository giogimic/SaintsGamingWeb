import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { contains: 'SETUP' } }
  });
  const gameInit = await prisma.siteSetting.findMany({
    where: { key: { contains: 'GAME_INIT' } }
  });
  const mapCount = await prisma.worldMap.count();
  const userCount = await prisma.user.count();
  const gameConfigCount = await prisma.gameConfig.count();
  
  console.log("Settings SETUP:", settings);
  console.log("Settings GAME_INIT:", gameInit);
  console.log("mapCount:", mapCount);
  console.log("userCount:", userCount);
  console.log("gameConfigCount:", gameConfigCount);
}

check().then(() => process.exit(0));
