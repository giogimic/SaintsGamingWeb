import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardXP, XP_VALUES } from "@/lib/xp";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { targetType, targetId, emoji = "👍" } = await req.json();

    if (!targetType || !targetId) {
      return NextResponse.json({ message: "Missing target" }, { status: 400 });
    }

    // Check if it already exists
    const existing = await prisma.reaction.findFirst({
      where: {
        userId: session.user.id,
        emoji,
        ...(targetType === "thread" ? { threadId: targetId } : { replyId: targetId }),
      }
    });

    if (existing) {
      // Toggle off
      await prisma.reaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, action: "removed" });
    } else {
      // Toggle on
      await prisma.reaction.create({
        data: {
          userId: session.user.id,
          emoji,
          ...(targetType === "thread" ? { threadId: targetId } : { replyId: targetId }),
        }
      });

      // Award XP
      await awardXP(session.user.id, XP_VALUES.REACTION);

      return NextResponse.json({ success: true, action: "added" });
    }
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
