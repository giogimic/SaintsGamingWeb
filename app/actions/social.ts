"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function createSocialPost(body: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!body.trim() || body.length > 280) throw new Error("Invalid post length");

  // Extract hashtags (e.g. #gaming, #saints)
  const hashTags = body.match(/#[a-zA-Z0-9_]+/g) || [];
  const uniqueTags = Array.from(new Set(hashTags.map(t => t.toLowerCase().replace("#", ""))));

  const post = await prisma.socialPost.create({
    data: {
      authorId: session.user.id,
      body: body.trim(),
    }
  });

  // Process hashtags
  for (const tag of uniqueTags) {
    let hashtagRec = await prisma.socialHashtag.findUnique({ where: { name: tag } });
    if (!hashtagRec) {
      hashtagRec = await prisma.socialHashtag.create({ data: { name: tag, usageCount: 1 } });
    } else {
      hashtagRec = await prisma.socialHashtag.update({ 
        where: { name: tag }, 
        data: { usageCount: { increment: 1 } } 
      });
    }

    await prisma.socialPostHashtag.create({
      data: {
        postId: post.id,
        hashtagId: hashtagRec.id
      }
    });
  }

  return post;
}

export async function getFYPFeed(hashtagFilter?: string) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const whereClause = hashtagFilter 
    ? { hashtags: { some: { hashtag: { name: hashtagFilter.toLowerCase() } } } }
    : {};

  const posts = await prisma.socialPost.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: {
        select: { id: true, username: true, image: true, permissionLevel: true }
      },
      reactions: true,
    }
  });

  return posts.map(post => ({
    id: post.id,
    body: post.body,
    createdAt: post.createdAt,
    author: post.author,
    likesCount: post.reactions.length,
    hasLiked: currentUserId ? post.reactions.some(r => r.userId === currentUserId) : false,
  }));
}

export async function getTrendingTags() {
  return await prisma.socialHashtag.findMany({
    orderBy: { usageCount: "desc" },
    take: 10,
    select: { name: true, usageCount: true }
  });
}

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
    return true; // liked
  }
}
