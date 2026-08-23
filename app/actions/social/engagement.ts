"use server";

// Social actions — Reactions, bookmarks, tips, subscriptions
// Consumed via barrel: @/app/actions/social

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { emitNotificationCreated } from "@/web/lib/realtime-emit";
import { checkAndAwardAchievements } from "@/web/lib/achievements";

export async function togglePostReaction(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.socialReaction.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: session.user.id
      }
    }
  });

  if (existing) {
    await prisma.socialReaction.delete({ where: { id: existing.id } });
    return false; // unliked
  } else {
    await prisma.socialReaction.create({
      data: {
        postId,
        userId: session.user.id
      }
    });

    // Notify author if it's not a self-like
    const post = await prisma.socialPost.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post && post.authorId !== session.user.id) {
      const notification = await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "LIKE",
          message: "Someone liked your post.",
          link: `/profile/inbox?post=${postId}`
        }
      });
      await emitNotificationCreated(notification);
    }

    return true; // liked
  }
}

export async function toggleBookmark(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.socialBookmark.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } }
  });

  if (existing) {
    await prisma.socialBookmark.delete({ where: { id: existing.id } });
    return false; // removed
  } else {
    await prisma.socialBookmark.create({
      data: { postId, userId: session.user.id }
    });
    return true; // added
  }
}

export async function incrementShareCount(postId: string) {
  await prisma.socialPost.update({
    where: { id: postId },
    data: { shareCount: { increment: 1 } }
  });
  return true;
}

export async function incrementViewCount(postId: string) {
  await prisma.socialPost.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } }
  });
  return true;
}

// ─── Tipping & Subscriptions ──────────────────────────────────────────

export async function tipSocialPost(postId: string, amount: number, message?: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { authorId: true }
  });
  if (!post) return { success: false, error: "Post not found" };
  if (post.authorId === session.user.id) return { success: false, error: "Cannot tip your own post" };
  if (amount <= 0) return { success: false, error: "Invalid amount" };

  try {
    const tipNotification = await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({ where: { id: session.user.id }, select: { coins: true } });
      if (!sender || sender.coins < amount) {
        throw new Error("Insufficient gold to send this tip.");
      }

      await tx.user.update({
        where: { id: session.user.id },
        data: { coins: { decrement: amount } }
      });

      await tx.user.update({
        where: { id: post.authorId },
        data: { coins: { increment: amount } }
      });

      await tx.socialTip.create({
        data: {
          senderId: session.user.id,
          receiverId: post.authorId,
          postId: postId,
          amount: amount,
          message: message
        }
      });

      return tx.notification.create({
        data: {
          userId: post.authorId,
          type: "TIP",
          message: `Someone sent you a tip of ${amount} Gold!`,
          link: `/profile/inbox?post=${postId}`
        }
      });
    });

    await emitNotificationCreated(tipNotification);
    void checkAndAwardAchievements(session.user.id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to tip post" };
  }
}

export async function subscribeToCreator(creatorId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (creatorId === session.user.id) throw new Error("Cannot subscribe to yourself");

  await prisma.socialSubscription.upsert({
    where: {
      subscriberId_subscribedToId: {
        subscriberId: session.user.id,
        subscribedToId: creatorId
      }
    },
    update: { active: true },
    create: {
      subscriberId: session.user.id,
      subscribedToId: creatorId,
      tier: "STANDARD"
    }
  });
}

