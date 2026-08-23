import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { z } from "zod";

const reorderSchema = z.object({
  type: z.enum(["category", "subcategory"]),
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number().int(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const permissionLevel = (session?.user?.permissionLevel as number) || 0;

    if (permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = reorderSchema.parse(body);

    if (data.type === "category") {
      await prisma.$transaction(
        data.items.map((item) =>
          prisma.forumCategory.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );
    } else {
      await prisma.$transaction(
        data.items.map((item) =>
          prisma.subCategory.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );
    }

    return NextResponse.json({ success: true, count: data.items.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input", errors: error.issues },
        { status: 400 }
      );
    }
    console.error("Reorder failed:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
