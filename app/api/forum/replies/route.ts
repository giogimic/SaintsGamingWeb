import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PERMISSION_LEVELS } from "@/lib/permissions";


const createReplySchema = z.object({
  body: z.string().min(1, "Reply cannot be empty"),
  threadId: z.string(),
  forumPin: z.string().optional(),
});

import { awardXP, XP_VALUES } from "@/lib/xp";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        canPostToForum: true, 
        forumPin: true,
        permissionLevel: true,
        isWriter: true,
        isVIP: true,
        isFounder: true,
        isTrusted: true
      }
    });

    if (!user || !user.canPostToForum) {
      return NextResponse.json({ message: "Your posting privileges have been revoked." }, { status: 403 });
    }

    const body = await req.json();
    const data = createReplySchema.parse(body);



    if (user.forumPin && user.forumPin !== data.forumPin) {
      return NextResponse.json({ message: "Invalid Forum PIN." }, { status: 403 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: data.threadId },
      include: { subcategory: { include: { category: true } } }
    });

    if (!thread) {
      return NextResponse.json({ message: "Thread not found" }, { status: 404 });
    }

    if (thread.isLocked || thread.subcategory.isLocked) {
      return NextResponse.json({ message: "This thread or its parent board is locked" }, { status: 403 });
    }

    const sub = thread.subcategory;
    const isRestricted = sub.reqWriter || sub.reqVIP || sub.reqFounder || sub.reqTrusted;
    let hasAccess = !isRestricted;
    
    if (isRestricted) {
      if (user.permissionLevel >= PERMISSION_LEVELS.HEAD_MODERATOR) hasAccess = true;
      else if (sub.reqWriter && user.isWriter) hasAccess = true;
      else if (sub.reqVIP && user.isVIP) hasAccess = true;
      else if (sub.reqFounder && user.isFounder) hasAccess = true;
      else if (sub.reqTrusted && user.isTrusted) hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ message: "You do not have permission to reply in this board." }, { status: 403 });
    }

    const reply = await prisma.reply.create({
      data: {
        body: data.body,
        authorId: session.user.id,
        threadId: thread.id,
      }
    });
    
    // Update the thread's updatedAt so it bubbles to the top of the forum
    await prisma.thread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() }
    });

    // Award XP
    await awardXP(session.user.id, XP_VALUES.REPLY_CREATE);

    // Trigger Notification for the thread author
    if (thread.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: thread.authorId,
          type: "REPLY",
          message: `${session.user.name || "Someone"} replied to your thread "${thread.title}".`,
          link: `/forum/${thread.subcategory.category.slug}/${thread.slug}`,
        }
      });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Create reply error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
