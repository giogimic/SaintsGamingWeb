import { prisma } from '../lib/prisma';

const PERMISSION_LEVELS = {
  GUEST: 0,
  USER: 100,
  WRITER: 150,
  MOD: 200,
  SENIOR_MOD: 400,
  ADMIN: 500,
  SENIOR_ADMIN: 900,
  HEAD_ADMIN: 950,
  COMMUNITY_MANAGER: 1000,
  DEVELOPER: 1100,
};

const ROLES_TO_SEED = [
  { name: "User", level: PERMISSION_LEVELS.USER, color: "text-zinc-300" },
  { name: "Writer", level: PERMISSION_LEVELS.WRITER, color: "text-emerald-400" },
  { name: "Mod", level: PERMISSION_LEVELS.MOD, color: "text-green-400" },
  { name: "Senior Mod", level: PERMISSION_LEVELS.SENIOR_MOD, color: "text-cyan-400" },
  { name: "Admin", level: PERMISSION_LEVELS.ADMIN, color: "text-blue-400" },
  { name: "Senior Admin", level: PERMISSION_LEVELS.SENIOR_ADMIN, color: "text-orange-400" },
  { name: "Head Admin", level: PERMISSION_LEVELS.HEAD_ADMIN, color: "text-amber-400" },
  { name: "Community Manager", level: PERMISSION_LEVELS.COMMUNITY_MANAGER, color: "text-purple-400" },
  { name: "Developer", level: PERMISSION_LEVELS.DEVELOPER, color: "text-red-400" },
];

async function main() {
  console.log('Seeding roles...');
  for (const role of ROLES_TO_SEED) {
    await prisma.role.upsert({
      where: { level: role.level },
      update: { name: role.name, color: role.color },
      create: role,
    });
  }
  console.log('Roles seeded.');

  // Find all users and assign them a role based on permissionLevel
  const users = await prisma.user.findMany();
  for (const user of users) {
    let levelToMatch = user.permissionLevel || 100;
    
    // Give the first user Developer privileges if they don't have it
    if (user.id === users[0].id) {
       levelToMatch = PERMISSION_LEVELS.DEVELOPER;
    }

    // Fallback to User if level doesn't exactly match a role
    let role = await prisma.role.findUnique({ where: { level: levelToMatch } });
    if (!role) {
      role = await prisma.role.findUnique({ where: { level: 100 } });
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        roleId: role!.id,
        permissionLevel: levelToMatch 
      }
    });
    console.log(`Updated user ${user.username} with role ${role!.name}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
