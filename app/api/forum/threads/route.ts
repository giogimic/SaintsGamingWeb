import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { z } from "zod";
import { canAccessRestrictedBoard } from "@/web/lib/forum-access";
import { generateSlug } from "@/web/lib/slug";
import { awardXP, XP_VALUES } from "@/web/lib/xp";
import { checkAndAwardAchievements } from "@/web/lib/achievements";

const createThreadSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  body: z.string().min(1, "Body is required"),
  subcategorySlug: z.string(),
  forumPin: z.string().optional(),
});

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
    const data = createThreadSchema.parse(body);



    if (user.forumPin && user.forumPin !== data.forumPin) {
      return NextResponse.json({ message: "Invalid Forum PIN." }, { status: 403 });
    }

    const subcategory = await prisma.subCategory.findUnique({
      where: { slug: data.subcategorySlug }
    });

    if (!subcategory) {
      return NextResponse.json({ message: "Subcategory not found" }, { status: 404 });
    }

    if (subcategory.isLocked) {
      return NextResponse.json({ message: "This board is locked" }, { status: 403 });
    }

    if (!canAccessRestrictedBoard(subcategory, user)) {
      return NextResponse.json({ message: "You do not have permission to post in this board." }, { status: 403 });
    }

    let slug = generateSlug(data.title);
    
    // Check slug collision
    const existing = await prisma.thread.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const thread = await prisma.thread.create({
      data: {
        title: data.title,
        slug,
        body: data.body,
        authorId: session.user.id,
        subcategoryId: subcategory.id,
      }
    });

    // Award XP
    await awardXP(session.user.id, XP_VALUES.THREAD_CREATE);

    // Auto-Award Badges
    await checkAndAwardAchievements(session.user.id);

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Create thread error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
