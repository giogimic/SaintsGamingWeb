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

    return NextResponse.json({ message: "Admin created successfully", user: { id: user.id, username: user.username } });
  } catch (error: unknown) {
    console.error("Failed to setup admin:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
