import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;
    const userId = session.user.id;

    const existing = await prisma.threadSubscription.findUnique({
      where: {
        userId_threadId: {
          userId,
          threadId
        }
      }
    });

    if (existing) {
      await prisma.threadSubscription.delete({
        where: { id: existing.id }
      });
      return NextResponse.json({ isSubscribed: false });
    } else {
      await prisma.threadSubscription.create({
        data: {
          userId,
          threadId
        }
      });
      return NextResponse.json({ isSubscribed: true });
    }
  } catch (error) {
    console.error("Watch thread error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
