"use server";

// Social actions — Creator analytics
// Consumed via barrel: @/app/actions/social

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";

// ─── Feed Upgrade: Post Analytics ───────────────────────────────────

export async function getPostAnalytics(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: {
      reactions: { orderBy: { createdAt: "asc" } },
      _count: { select: { replies: true, bookmarks: true } },
    }
  });

  if (!post || post.authorId !== session.user.id) throw new Error("Not found");

  const engagementRate = post.viewCount > 0
    ? (((post.reactions.length + post._count.replies + post.shareCount) / post.viewCount) * 100)
    : 0;

  return {
    id: post.id,
    body: post.body,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    viewCount: post.viewCount,
    shareCount: post.shareCount,
    likesCount: post.reactions.length,
    repliesCount: post._count.replies,
    bookmarksCount: post._count.bookmarks,
    engagementRate: Math.round(engagementRate * 100) / 100,
  };
}

export async function getCreatorTopPosts() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const posts = await prisma.socialPost.findMany({
    where: { authorId: session.user.id, parentId: null },
    orderBy: { viewCount: "desc" },
    take: 20,
    include: {
      reactions: true,
      _count: { select: { replies: true, bookmarks: true } },
    }
  });

  return posts.map(post => {
    const totalEngagement = post.reactions.length + post._count.replies + post.shareCount;
    const engagementRate = post.viewCount > 0
      ? ((totalEngagement / post.viewCount) * 100)
      : 0;

    return {
      id: post.id,
      body: post.body,
      mediaUrl: post.mediaUrl,
      createdAt: post.createdAt,
      viewCount: post.viewCount,
      shareCount: post.shareCount,
      likesCount: post.reactions.length,
      repliesCount: post._count.replies,
      bookmarksCount: post._count.bookmarks,
      engagementRate: Math.round(engagementRate * 100) / 100,
    };
  });
}

