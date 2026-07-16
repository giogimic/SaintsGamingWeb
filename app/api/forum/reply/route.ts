import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";


const replySchema = z.object({
  body: z.string().min(1).max(5000),
  threadId: z.string(),
  quotedId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = replySchema.parse(body);

    const thread = await prisma.thread.findUnique({ where: { id: data.threadId } });
    if (!thread) {
      return NextResponse.json({ message: "Thread not found" }, { status: 404 });
    }
    if (thread.isLocked) {
      return NextResponse.json({ message: "Thread is locked" }, { status: 403 });
    }



    const reply = await prisma.reply.create({
      data: {
        body: data.body,
        authorId: session.user.id,
        threadId: data.threadId,
        quotedId: data.quotedId,
      }
    });

    // Update the parent thread's updatedAt to bump it in the listing
    await prisma.thread.update({
      where: { id: data.threadId },
      data: { updatedAt: new Date() }
    });

    // Notification Logic
    if (thread.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: thread.authorId,
          type: "REPLY",
           
          message: `${(session.user as any).username || session.user.name || "Someone"} replied to your thread: "${thread.title}"`,
          link: `/forum/thread/${thread.slug}#reply-${reply.id}`,
        }
      });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Reply creation error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
