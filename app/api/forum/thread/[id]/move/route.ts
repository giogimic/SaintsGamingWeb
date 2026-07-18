import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { z } from "zod";

const moveSchema = z.object({
  subcategoryId: z.string(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;
    const body = await req.json();
    const { subcategoryId } = moveSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });

    if (!user || user.permissionLevel < PERMISSION_LEVELS.MODERATOR) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const subcategory = await prisma.subCategory.findUnique({
      where: { id: subcategoryId }
    });

    if (!subcategory) {
      return NextResponse.json({ message: "Invalid subcategory" }, { status: 400 });
    }

    const thread = await prisma.thread.update({
      where: { id: threadId },
      data: { subcategoryId },
    });

    return NextResponse.json(thread);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Move thread error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
