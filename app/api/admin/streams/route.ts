import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { z } from "zod";
import cache from "@/lib/cache";

const adminStreamSchema = z.object({
  id: z.string(),
  isApproved: z.boolean(),
  priority: z.number().int().min(0).max(100),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userPermissionLevel = (session?.user?.permissionLevel as number) || 0;
    
    if (userPermissionLevel < PERMISSION_LEVELS.ADMIN) {
      return NextResponse.json({ message: "Unauthorized. Admin required." }, { status: 401 });
    }

    const body = await req.json();
    const data = adminStreamSchema.parse(body);

    const profile = await prisma.streamProfile.update({
      where: { id: data.id },
      data: {
        isApproved: data.isApproved,
        priority: data.priority,
      }
    });

    // Invalidate streams cache
    cache.invalidatePrefix("streams");

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Admin stream error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
