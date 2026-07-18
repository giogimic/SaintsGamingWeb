"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getPublicProfile(username: string) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      image: true,
      createdAt: true,
      youtubeVideoUrl: true,
      youtubeMusicUrl: true,
      isVIP: true,
      isFounder: true,
      isTrusted: true,
      level: true,
      xp: true,
      coins: true,
      _count: {
        select: {
          threads: true,
          replies: true,
          socialPosts: true
        }
      },
      profileImages: {
        select: {
          id: true,
          url: true
        }
      },
      achievements: {
        select: {
          id: true,
          badgeId: true,
          isPinned: true,
          earnedAt: true
        },
        orderBy: {
          earnedAt: 'desc'
        }
      },
      steamWishlist: {
        select: {
          appId: true,
          name: true,
          image: true
        }
      },
      gameCharacters: {
        select: {
          id: true,
          name: true,
          spriteId: true,
          classId: true,
        }
      }
    }
  });

  if (!user) return null;

  // Find friendship status if logged in
  let friendshipStatus = null;
  let friendshipId = null;
  let amISender = false;

  if (currentUserId && currentUserId !== user.id) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: user.id },
          { userId: user.id, friendId: currentUserId }
        ]
      }
    });

    if (friendship) {
      friendshipStatus = friendship.status;
      friendshipId = friendship.id;
      amISender = friendship.userId === currentUserId;
    }
  }

  return {
    ...user,
    friendship: friendshipStatus && friendshipId ? { status: friendshipStatus, id: friendshipId, amISender } : null
  };
}
