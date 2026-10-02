import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized: Missing token" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // Validate against the AUTH_SECRET in the environment
    const envSecret = (process.env.AUTH_SECRET || "").replace(/^"|"$/g, '').trim();
    const cleanToken = (token || "").replace(/^"|"$/g, '').trim();
    
    const isLocalhost = req.headers.get("host")?.includes("localhost") || req.headers.get("host")?.includes("127.0.0.1");
    if (cleanToken !== envSecret && !(isLocalhost && !envSecret)) {
      console.warn(`[setup-admin] Token mismatch. Received token length: ${cleanToken.length}, envSecret length: ${envSecret.length}`);
      return NextResponse.json({ message: "Unauthorized: Invalid token" }, { status: 403 });
    }

    const body = await req.json();
    const { username: rawUsername, password, email: rawEmail } = body;

    if (!rawUsername || !password || !rawEmail) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase().trim();
    const username = rawUsername.trim();

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
      const r = await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role });
      if (r.name === 'Admin') adminRoleId = r.id;
    }

    // 2. Check if user exists by username or email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          username,
          email,
          passwordHash,
          permissionLevel: 1100, // Owner level
          isFounder: true,
          roleId: adminRoleId || existing.roleId,
          isBanned: false,
        }
      });
      console.log(`[✓] Updated existing Admin user: ${user.username} (ID: ${user.id}) with Owner permissions`);
    } else {
      user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          permissionLevel: 1100,
          isFounder: true,
          roleId: adminRoleId,
        }
      });
      console.log(`[✓] Successfully created new Admin user: ${user.username} (ID: ${user.id})`);
    }

    // 3. Seed default LevelTiers
    const tiers = [
      { level: 1, name: 'Newbie', xpRequired: 0, icon: '🌟' },
      { level: 5, name: 'Regular', xpRequired: 500, icon: '⭐' },
      { level: 10, name: 'Veteran', xpRequired: 2000, icon: '🏆' },
      { level: 25, name: 'Saint', xpRequired: 10000, icon: '👑' },
    ];
    for (const tier of tiers) {
      await prisma.levelTier.upsert({ where: { level: tier.level }, update: {}, create: tier });
    }

    return NextResponse.json({ message: "Admin created successfully", user: { id: user.id, username: user.username } });
  } catch (error: unknown) {
    console.error("Failed to setup admin:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
