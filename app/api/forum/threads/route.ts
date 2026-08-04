import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { canAccessRestrictedBoard } from "@/web/lib/forum-access";
import { generateSlug } from "@/web/lib/slug";
import { awardXP, XP_VALUES } from "@/web/lib/xp";
import { checkAndAwardAchievements } from "@/web/lib/achievements";

const createThreadSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  body: z.string().min(1, "Body is required"),
  subcategorySlug: z.string().optional(),
  subcategoryId: z.string().optional(),
  forumPin: z.string().optional(),
  tags: z.string().optional(),
  pollQuestion: z.string().optional(),
  pollOptions: z.array(z.string()).optional(),
}).refine((d) => !!(d.subcategorySlug || d.subcategoryId), {
  message: "subcategorySlug or subcategoryId is required",
});

/** Canonical create-thread path (access checks + PIN + XP). Replaces /api/forum/thread. */
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
        isTrusted: true,
      },
    });

    if (!user || !user.canPostToForum) {
      return NextResponse.json(
        { message: "Your posting privileges have been revoked." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = createThreadSchema.parse(body);

    if (user.forumPin && user.forumPin !== data.forumPin) {
      return NextResponse.json({ message: "Invalid Forum PIN." }, { status: 403 });
    }

    const subcategory = data.subcategorySlug
      ? await prisma.subCategory.findUnique({ where: { slug: data.subcategorySlug } })
      : await prisma.subCategory.findUnique({ where: { id: data.subcategoryId! } });

    if (!subcategory) {
      return NextResponse.json({ message: "Subcategory not found" }, { status: 404 });
    }

    if (subcategory.isLocked) {
      return NextResponse.json({ message: "This board is locked" }, { status: 403 });
    }

    if (!canAccessRestrictedBoard(subcategory, user)) {
      return NextResponse.json(
        { message: "You do not have permission to post in this board." },
        { status: 403 }
      );
    }

    const sanitizedBody = sanitizeHtml(data.body);
    let slug = generateSlug(data.title);
    const existing = await prisma.thread.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const tagNames = data.tags
      ? data.tags
          .split(",")
          .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
          .filter((t) => t.length > 0)
      : [];

    const thread = await prisma.$transaction(async (tx) => {
      const newThread = await tx.thread.create({
        data: {
          title: data.title,
          body: sanitizedBody,
          slug,
          authorId: session.user.id,
          subcategoryId: subcategory.id,
        },
      });

      const newSocialPost = await tx.socialPost.create({
        data: {
          authorId: session.user.id,
          body: `**${data.title}**\n\n${sanitizedBody.substring(0, 150)}${sanitizedBody.length > 150 ? "..." : ""}`,
          isForumThread: true,
          threadUrl: `/forum/t/${slug}`,
          threadId: newThread.id,
        },
      });

      if (tagNames.length > 0) {
        for (const tagName of tagNames) {
          const hashtag = await tx.hashtag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });
          await tx.threadHashtag.create({
            data: { threadId: newThread.id, hashtagId: hashtag.id },
          });
          const socialHashtag = await tx.socialHashtag.upsert({
            where: { name: tagName },
            update: { usageCount: { increment: 1 } },
            create: { name: tagName, usageCount: 1 },
          });
          await tx.socialPostHashtag.create({
            data: { postId: newSocialPost.id, hashtagId: socialHashtag.id },
          });
        }
      }

      if (data.pollQuestion && data.pollOptions && data.pollOptions.length >= 2) {
        await tx.poll.create({
          data: {
            question: data.pollQuestion,
            threadId: newThread.id,
            postId: newSocialPost.id,
            options: {
              create: data.pollOptions.map((opt) => ({ text: opt })),
            },
          },
        });
      }

      return newThread;
    });

    await awardXP(session.user.id, XP_VALUES.THREAD_CREATE);
    void checkAndAwardAchievements(session.user.id);

    try {
      const webhookSetting = await prisma.siteSetting.findUnique({
        where: { key: "DISCORD_WEBHOOK_URL" },
      });
      if (webhookSetting?.value) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(webhookSetting.value, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `New Thread in Forums: **${thread.title}** by ${session.user.name || "A member"}\n${appUrl}/forum/t/${thread.slug}`,
          }),
        }).catch(console.error);
      }
    } catch (err) {
      console.error("Discord webhook error:", err);
    }

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input", errors: error.issues },
        { status: 400 }
      );
    }
    console.error("Create thread error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
