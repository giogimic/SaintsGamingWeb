import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { z } from "zod";

const updateThreadSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").optional(),
  body: z.string().min(1, "Body cannot be empty").optional()
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id }
    });

    if (!thread) {
      return NextResponse.json({ message: "Thread not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });

    if (thread.authorId !== session.user.id && (user?.permissionLevel ?? 0) < PERMISSION_LEVELS.MODERATOR) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.thread.delete({
      where: { id }
    });

    // Mirror to SocialPost
    await prisma.socialPost.deleteMany({
      where: { threadId: id }
    });

    return NextResponse.json({ message: "Thread deleted" });
  } catch (error) {
    console.error("Delete thread error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id }
    });

    if (!thread) {
      return NextResponse.json({ message: "Thread not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });

    if (thread.authorId !== session.user.id && (user?.permissionLevel ?? 0) < PERMISSION_LEVELS.MODERATOR) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateThreadSchema.parse(body);

    const updated = await prisma.thread.update({
      where: { id },
      data: { 
        ...(data.title ? { title: data.title } : {}),
        ...(data.body ? { body: data.body } : {})
      }
    });

    // Mirror to SocialPost
    if (data.title || data.body) {
      const updatedBody = data.body || updated.body;
      const updatedTitle = data.title || updated.title;
      await prisma.socialPost.updateMany({
        where: { threadId: id },
        data: {
          body: `**${updatedTitle}**\n\n${updatedBody.substring(0, 150)}${updatedBody.length > 150 ? '...' : ''}`
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Update thread error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
