"use server";

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import {
  creatureAssetUrl,
  getFallbackCreature,
} from "@/shared/game/creatureCatalog";

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
      pinnedBeastId: true,
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
          stateData: true,
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

  // ALIGNMENT E.1 — resolve pinned PlayerCreature + pixel sprite for profile
  let pinnedCreature: {
    id: string;
    speciesSlug: string;
    nickname: string | null;
    level: number;
    name: string;
    spriteUrl: string;
  } | null = null;

  if (user.pinnedBeastId) {
    const pc = await prisma.playerCreature.findFirst({
      where: { id: user.pinnedBeastId, userId: user.id },
    });
    if (pc) {
      const defRow = await prisma.creatureDef.findUnique({
        where: { slug: pc.speciesSlug },
        select: { name: true, spriteOverworld: true, spriteBattle: true },
      });
      const fallback = getFallbackCreature(pc.speciesSlug);
      const name = defRow?.name || fallback?.name || pc.nickname || pc.speciesSlug;
      const spriteKey =
        defRow?.spriteOverworld ||
        fallback?.spriteOverworld ||
        defRow?.spriteBattle ||
        fallback?.spriteBattle ||
        `creatures/${pc.speciesSlug}`;
      pinnedCreature = {
        id: pc.id,
        speciesSlug: pc.speciesSlug,
        nickname: pc.nickname,
        level: pc.level,
        name,
        spriteUrl: creatureAssetUrl(spriteKey),
      };
    }
  }

  return {
    ...user,
    pinnedCreature,
    friendship: friendshipStatus && friendshipId ? { status: friendshipStatus, id: friendshipId, amISender } : null
  };
}
