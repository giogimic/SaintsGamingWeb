import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || process.env.ADMIN_USER;
  const password = process.argv[3] || process.env.ADMIN_PASS;
  const rawEmail = process.argv[4] || process.env.ADMIN_EMAIL || `${username || "admin"}@saintsgaming.net`;

  if (!username || !password) {
    console.error("[!] Usage: npx tsx scripts/create-admin.ts <username> <password> [email]");
    process.exit(1);
  }

  const email = rawEmail.toLowerCase().trim();
  const cleanUsername = username.trim();
  console.log(`[*] Ensuring admin user "${cleanUsername}" (${email}) exists with Owner permissions...`);

  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Ensure default Roles exist
  const roles = [
    { name: 'Admin', level: 100, color: 'text-red-500' },
    { name: 'Moderator', level: 50, color: 'text-purple-500' },
    { name: 'VIP', level: 30, color: 'text-amber-500' },
    { name: 'User', level: 20, color: 'text-zinc-400' },
  ];
  let adminRoleId: string | undefined;
  for (const role of roles) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    if (r.name === 'Admin') adminRoleId = r.id;
  }

  // 2. Check if user already exists by username or email
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: cleanUsername },
        { email: email }
      ]
    }
  });

  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        username: cleanUsername,
        email: email,
        passwordHash,
        permissionLevel: 1100, // Owner level
        isFounder: true,
        roleId: adminRoleId || existing.roleId,
        isBanned: false,
      }
    });
    console.log(`[✓] Updated existing user "${user.username}" (ID: ${user.id}) with Owner permissions.`);
  } else {
    user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: email,
        passwordHash,
        permissionLevel: 1100, // Owner level
        isFounder: true,
        roleId: adminRoleId,
      }
    });
    console.log(`[✓] Created new Owner admin user "${user.username}" (ID: ${user.id}).`);
  }

  // 3. Ensure default LevelTiers exist
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

  console.log(`[✓] Verification successful: User "${user.username}" is ready to log in immediately.`);
  process.exit(0);
}

main()
  .catch((err) => {
    console.error("[!] Failed to create/verify admin user:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
