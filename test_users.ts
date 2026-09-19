import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { username: true, displayName: true, permissionLevel: true, roleId: true } });
  console.log(users);
  process.exit(0);
}
main();
