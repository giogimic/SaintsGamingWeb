"use server";

// Social actions — Muted keywords + report/appeal
// Consumed via barrel: @/app/actions/social

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// ─── Feed Upgrade: Muted Keywords ───────────────────────────────────

export async function getMutedKeywords() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await prisma.socialMutedKeyword.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  });
}

export async function addMutedKeyword(keyword: string, type: "KEYWORD" | "HASHTAG" = "KEYWORD") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const cleaned = keyword.trim().toLowerCase().replace(/^#/, "");
  if (!cleaned || cleaned.length > 100) throw new Error("Invalid keyword");

  // Max 50 muted keywords per user
  const count = await prisma.socialMutedKeyword.count({ where: { userId: session.user.id } });
  if (count >= 50) throw new Error("Maximum of 50 muted keywords allowed");

  return await prisma.socialMutedKeyword.upsert({
    where: {
      userId_type_keyword: { userId: session.user.id, type, keyword: cleaned }
    },
    update: {},
    create: {
      userId: session.user.id,
      keyword: cleaned,
      type,
    }
  });
}

export async function removeMutedKeyword(keywordId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return await prisma.socialMutedKeyword.delete({
    where: { id: keywordId }
  });
}

// ─── Phase 2: Originality & Accountability ───────────────────────────

export async function reportSocialPost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  // Decrement originality score
  const newScore = Math.max(0, post.originalityScore - 25);
  let throttleStatus = post.throttleStatus;
  let flagReason = post.flagReason;

  if (newScore < 50) {
    throttleStatus = "Throttled: Low Originality Score";
    flagReason = "Community flagged as low-effort/AI Sludge";
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      originalityScore: newScore,
      throttleStatus,
      flagReason
    }
  });
}

export async function appealSocialPost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");
  if (post.authorId !== session.user.id) throw new Error("Forbidden");

  // In a real app, this would queue for human review. For now, we restore it.
  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      originalityScore: 100,
      throttleStatus: null,
      flagReason: null
    }
  });

  revalidatePath("/profile/analytics");
}

