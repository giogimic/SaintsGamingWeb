import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PERMISSION_LEVELS } from "@/lib/permissions";


const createThreadSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  body: z.string().min(1, "Body is required"),
  subcategorySlug: z.string(),
  forumPin: z.string().optional(),
});

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

import { awardXP, XP_VALUES } from "@/lib/xp";
import { checkAndAwardAchievements } from "@/lib/achievements";

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

    const isRestricted = subcategory.reqWriter || subcategory.reqVIP || subcategory.reqFounder || subcategory.reqTrusted;
    let hasAccess = !isRestricted;
    
    if (isRestricted) {
      if (user.permissionLevel >= PERMISSION_LEVELS.HEAD_MODERATOR) hasAccess = true;
      else if (subcategory.reqWriter && user.isWriter) hasAccess = true;
      else if (subcategory.reqVIP && user.isVIP) hasAccess = true;
      else if (subcategory.reqFounder && user.isFounder) hasAccess = true;
      else if (subcategory.reqTrusted && user.isTrusted) hasAccess = true;
    }

    if (!hasAccess) {
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
