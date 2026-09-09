import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.siteSetting.findMany();
  console.log('Site Settings:', settings);
}
main().catch(console.error).finally(() => prisma.$disconnect());
