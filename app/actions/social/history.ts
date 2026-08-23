"use server";

// Social actions — Watch history
// Consumed via barrel: @/app/actions/social

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";

// ─── Feed Upgrade: Watch History ────────────────────────────────────

export async function recordWatchHistory(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  // Track the view count and watch history
  const post = await prisma.socialPost.findUnique({ where: { id: postId }, select: { viewCount: true, authorId: true } });
  
  if (post) {
    const newViewCount = post.viewCount + 1;
    // Award 5 Gold every 100 views
    const shouldAwardGold = newViewCount % 100 === 0;
    const additionalGold = shouldAwardGold ? 5 : 0;
    
    // Total revenue earned for the post is 5 gold per 100 views
    const revenueEarned = Math.floor(newViewCount / 100) * 5;

    await prisma.$transaction(async (tx) => {
      await tx.socialPost.update({
        where: { id: postId },
        data: { 
          viewCount: { increment: 1 },
          revenueEarned: revenueEarned
        }
      });

      if (additionalGold > 0) {
        await tx.user.update({
          where: { id: post.authorId },
          data: { coins: { increment: additionalGold } }
        });
      }
    });
  }

  await prisma.socialWatchHistory.upsert({
    where: {
      userId_postId: { userId: session.user.id, postId }
    },
    update: { viewedAt: new Date() },
    create: {
      userId: session.user.id,
      postId,
    }
  });
}

export async function getWatchHistory(query?: string, page: number = 1) {
  const session = await auth();
  if (!session?.user?.id) return { items: [], total: 0 };

  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const whereClause: any = { userId: session.user.id };
  if (query && query.trim()) {
    whereClause.post = {
      body: { contains: query.trim() }
    };
  }

  const [items, total] = await Promise.all([
    prisma.socialWatchHistory.findMany({
      where: whereClause,
      orderBy: { viewedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        post: {
          include: {
            author: { select: { username: true, image: true } },
            _count: { select: { reactions: true, replies: true } }
          }
        }
      }
    }),
    prisma.socialWatchHistory.count({ where: whereClause })
  ]);

  return { items, total };
}

export async function clearWatchHistory() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.socialWatchHistory.deleteMany({
    where: { userId: session.user.id }
  });
  return true;
}

