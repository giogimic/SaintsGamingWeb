import { PrismaClient } from '@prisma/client';
import { getSystemSetupStatus } from './src/shared/game/setup/setupDetection.ts';

const prisma = new PrismaClient();

async function main() {
  const status = await getSystemSetupStatus(prisma);
  console.log('Status:', status);
  process.exit(0);
}
main();
