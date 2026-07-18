import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { z } from "zod";

const updateReplySchema = z.object({
  body: z.string().min(1, "Reply cannot be empty"),
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

    const reply = await prisma.reply.findUnique({
      where: { id }
    });

    if (!reply) {
      return NextResponse.json({ message: "Reply not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });

    if (reply.authorId !== session.user.id && (user?.permissionLevel ?? 0) < PERMISSION_LEVELS.MODERATOR) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.reply.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Reply deleted" });
  } catch (error) {
    console.error("Delete reply error:", error);
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

    const reply = await prisma.reply.findUnique({
      where: { id }
    });

    if (!reply) {
      return NextResponse.json({ message: "Reply not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });

    if (reply.authorId !== session.user.id && (user?.permissionLevel ?? 0) < PERMISSION_LEVELS.MODERATOR) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateReplySchema.parse(body);

    const updated = await prisma.reply.update({
      where: { id },
      data: { body: data.body }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Update reply error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
