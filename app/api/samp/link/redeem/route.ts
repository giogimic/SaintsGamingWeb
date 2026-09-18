import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { requireServerApiKey } from "@/web/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireServerApiKey(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { code, playerName } = body;

    if (!code || !playerName) {
      return NextResponse.json({ error: "code and playerName are required" }, { status: 400 });
    }

    // Find the link code
    const linkCode = await prisma.sampLinkCode.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!linkCode) {
      return NextResponse.json({ error: "Invalid code" }, { status: 404 });
    }

    if (linkCode.expiresAt < new Date()) {
      await prisma.sampLinkCode.delete({ where: { id: linkCode.id } });
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    // Link the player session if it exists
    await prisma.sampPlayerSession.updateMany({
      where: { playerName },
      data: { userId: linkCode.userId },
    });

    // Also, we might want to store a permanent link somewhere (e.g. gameCharacters).
    // For now, let's create a GameCharacter record if one doesn't exist.
    const existingChar = await prisma.gameCharacter.findFirst({
      where: { name: playerName },
    });

    if (!existingChar) {
      await prisma.gameCharacter.create({
        data: {
          userId: linkCode.userId,
          name: playerName,
          classId: "samp-player", // A dummy class for SAMP
          stateData: "{}",
        },
      });
    } else if (existingChar.userId !== linkCode.userId) {
      await prisma.gameCharacter.update({
        where: { id: existingChar.id },
        data: { userId: linkCode.userId },
      });
    }

    // Delete the code so it can't be used again
    await prisma.sampLinkCode.delete({ where: { id: linkCode.id } });

    return NextResponse.json({
      success: true,
      message: "Account linked successfully",
      username: linkCode.user.username,
    });
  } catch (error) {
    console.error("[API_SAMP_LINK_REDEEM]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
