import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/web/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins from now

    // Delete any existing codes for this user
    await prisma.sampLinkCode.deleteMany({
      where: { userId: session.user.id },
    });

    // Create new code
    const linkCode = await prisma.sampLinkCode.create({
      data: {
        userId: session.user.id,
        code,
        expiresAt,
      },
    });

    return NextResponse.json({ code: linkCode.code, expiresAt: linkCode.expiresAt });
  } catch (error) {
    console.error("[API_SAMP_LINK_GENERATE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
