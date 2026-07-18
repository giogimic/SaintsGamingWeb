import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardXP, XP_VALUES } from "@/lib/xp";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: replyId } = await params;
    const userId = session.user.id;

    const reply = await prisma.reply.findUnique({
      where: { id: replyId }
    });

    if (!reply) {
      return NextResponse.json({ message: "Reply not found" }, { status: 404 });
    }

    const existingLike = await prisma.replyLike.findUnique({
      where: {
        userId_replyId: {
          userId,
          replyId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.replyLike.delete({
        where: { id: existingLike.id }
      });

      // Optionally deduct XP (not implemented in lib/xp directly, but we can do a negative award)
      if (reply.authorId !== userId) {
        await awardXP(reply.authorId, -XP_VALUES.REPLY_CREATE); // Or create a specific XP_VALUES.REPLY_LIKE
      }

      return NextResponse.json({ liked: false });
    } else {
      // Like
      await prisma.replyLike.create({
        data: {
          userId,
          replyId
        }
      });

      if (reply.authorId !== userId) {
        // Award XP
        await awardXP(reply.authorId, 5); // 5 XP for a like
        
        // Notify author
        await prisma.notification.create({
          data: {
            userId: reply.authorId,
            type: "SYSTEM",
            message: `${session.user.name || "Someone"} liked your reply.`,
            link: `/forum/t/${reply.threadId}#reply-${reply.id}`,
          }
        });
      }

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Reply like error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
