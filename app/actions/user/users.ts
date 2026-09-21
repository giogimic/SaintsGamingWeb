"use server";

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import {
  creatureAssetUrl,
} from "@/shared/game/creatureCatalog";

export async function getPublicProfile(username: string) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
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
      profileSettings: true,
      _count: {
        select: {
          threads: true,
          replies: true,
          socialPosts: true
        }
      }
    }
  });

  if (!user) return null;

  let isModerator = false;
  if (currentUserId) {
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { permissionLevel: true }
    });
    isModerator = currentUser ? currentUser.permissionLevel >= 50 : false;
  }

  const isOwner = currentUserId === user.id;

  let friendshipStatus = null;
  let friendshipId = null;
  let amISender = false;

  if (currentUserId && !isOwner) {
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

  let accessLevel: "OWNER_OR_MODERATOR" | "FRIEND" | "PUBLIC" = "PUBLIC";
  if (isOwner || isModerator) {
    accessLevel = "OWNER_OR_MODERATOR";
  } else if (friendshipStatus === "ACCEPTED") {
    accessLevel = "FRIEND";
  }

  const settings = user.profileSettings || {
    userId: user.id,
    accent: "SUNSET_GOLD",
    headerTreatment: "HORIZON",
    activityVisibility: "PUBLIC",
    achievementsVisibility: "PUBLIC",
    mediaVisibility: "HIDDEN",
    gameCharactersVisibility: "HIDDEN",
    sampVisibility: "HIDDEN",
    friendsVisibility: "HIDDEN",
    steamWishlistVisibility: "HIDDEN",
    galleryVisibility: "HIDDEN",
    showMilestones: false,
    updatedAt: new Date()
  };

  const canView = (visibility: string) => {
    if (accessLevel === "OWNER_OR_MODERATOR") return true;
    if (visibility === "PUBLIC") return true;
    if (visibility === "FRIENDS" && accessLevel === "FRIEND") return true;
    return false;
  };

  const [
    achievements,
    gameCharacters,
    steamWishlist,
    profileImages,
    likesReceived,
    sharesRes,
    commentsReceived
  ] = await Promise.all([
    canView(settings.achievementsVisibility) 
      ? prisma.userAchievement.findMany({ where: { userId: user.id }, orderBy: { earnedAt: 'desc' }, select: { id: true, badgeId: true, isPinned: true, earnedAt: true } }) 
      : Promise.resolve([]),
      
    canView(settings.gameCharactersVisibility) 
      ? prisma.gameCharacter.findMany({ 
          where: { userId: user.id },
          select: {
            id: true,
            name: true,
            assetProfileId: true,
            classId: true,
            stateData: true,
          }
        }) 
      : Promise.resolve([]),
      
    canView(settings.steamWishlistVisibility) 
      ? prisma.steamWishlistItem.findMany({ 
          where: { userId: user.id },
          select: { appId: true, name: true, image: true }
        }) 
      : Promise.resolve([]),
      
    canView(settings.galleryVisibility) 
      ? prisma.profileImage.findMany({ 
          where: { userId: user.id },
          select: { id: true, url: true }
        }) 
      : Promise.resolve([]),

    prisma.socialReaction.count({ where: { post: { authorId: user.id } } }),
    prisma.socialPost.aggregate({ _sum: { shareCount: true }, where: { authorId: user.id } }),
    prisma.socialPost.count({ where: { parent: { authorId: user.id }, authorId: { not: user.id } } })
  ]);

  const sharesReceived = sharesRes._sum.shareCount || 0;
  const forumContributions = user._count.threads + user._count.replies;

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
      const name = defRow?.name || pc.nickname || pc.speciesSlug;
      const spriteKey = defRow?.spriteOverworld || defRow?.spriteBattle || `creatures/${pc.speciesSlug}`;
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
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    image: user.image,
    createdAt: user.createdAt,
    isVIP: user.isVIP,
    isFounder: user.isFounder,
    isTrusted: user.isTrusted,
    level: user.level,
    xp: user.xp,
    profileSettings: settings,
    accessLevel,
    youtubeVideoUrl: canView(settings.mediaVisibility) ? user.youtubeVideoUrl : null,
    youtubeMusicUrl: canView(settings.mediaVisibility) ? user.youtubeMusicUrl : null,
    friendship: friendshipStatus && friendshipId ? { status: friendshipStatus, id: friendshipId, amISender } : null,
    stats: {
      posts: user._count.socialPosts,
      forumContributions,
      likesReceived,
      sharesReceived,
      commentsReceived
    },
    achievements,
    gameCharacters,
    steamWishlist,
    profileImages,
    pinnedCreature
  };
}
