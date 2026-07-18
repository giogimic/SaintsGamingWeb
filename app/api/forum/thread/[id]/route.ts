import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";

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

    return NextResponse.json({ message: "Thread deleted" });
  } catch (error) {
    console.error("Delete thread error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
