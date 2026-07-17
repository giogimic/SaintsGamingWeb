import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized: Missing token" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // Validate against the AUTH_SECRET in the environment
    const envSecret = process.env.AUTH_SECRET?.replace(/^"|"$/g, '');
    const cleanToken = token.replace(/^"|"$/g, '');
    if (cleanToken !== envSecret) {
      return NextResponse.json({ message: "Unauthorized: Invalid token" }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, email: rawEmail } = body;

    if (!username || !password || !rawEmail) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase();

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash,
        email,
        permissionLevel: 1100, // Owner level
      },
      create: {
        username,
        email,
        passwordHash,
        permissionLevel: 1100,
      }
    });

    console.log(`[✓] Successfully created/updated Admin user: ${user.username}`);

    // Seed default Roles
    const roles = [
      { name: 'Admin', level: 100, color: 'text-red-500' },
      { name: 'Moderator', level: 50, color: 'text-purple-500' },
      { name: 'VIP', level: 30, color: 'text-amber-500' },
      { name: 'User', level: 20, color: 'text-zinc-400' },
    ];
    for (const role of roles) {
      await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role });
    }
    console.log(`[✓] Seeded default Roles`);

    // Seed default LevelTiers
    const tiers = [
      { level: 1, name: 'Newbie', xpRequired: 0, icon: '🌟' },
      { level: 5, name: 'Regular', xpRequired: 500, icon: '⭐' },
      { level: 10, name: 'Veteran', xpRequired: 2000, icon: '🏆' },
      { level: 25, name: 'Saint', xpRequired: 10000, icon: '👑' },
    ];
    for (const tier of tiers) {
      await prisma.levelTier.upsert({ where: { level: tier.level }, update: {}, create: tier });
    }
    console.log(`[✓] Seeded default Level Tiers`);

    return NextResponse.json({ message: "Admin created successfully", user: { id: user.id, username: user.username } });
  } catch (error: unknown) {
    console.error("Failed to setup admin:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
