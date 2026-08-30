"use server";

// Social actions — Post CRUD, polls, pins, replies
// Consumed via barrel: @/app/actions/social

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { processMentions } from "@/web/lib/mentions";
import { emitNotificationCreated } from "@/web/lib/realtime-emit";
import { checkAndAwardAchievements } from "@/web/lib/achievements";

export async function createSocialPost(
  body: string, 
  mediaUrl?: string,
  options?: {
    thumbnailUrl?: string;
    isSubscriberOnly?: boolean;
    voiceoverUrl?: string;
    backgroundTrackUrl?: string;
    voiceoverVolume?: number;
    backgroundTrackVolume?: number;
    chapters?: string;
    captionsText?: string;
    poll?: {
      question: string;
      options: string[];
    };
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if ((!body.trim() && !mediaUrl) || body.length > 1000) throw new Error("Invalid post length (max 1000 characters)");

  // Extract hashtags (e.g. #gaming, #saints)
  const hashTags = body.match(/#[a-zA-Z0-9_]+/g) || [];
  const uniqueTags = Array.from(new Set(hashTags.map(t => t.toLowerCase().replace("#", ""))));

  const post = await prisma.socialPost.create({
    data: {
      authorId: session.user.id,
      body: body.trim(),
      mediaUrl: mediaUrl || null,
      thumbnailUrl: options?.thumbnailUrl || null,
      isSubscriberOnly: options?.isSubscriberOnly || false,
      voiceoverUrl: options?.voiceoverUrl || null,
      backgroundTrackUrl: options?.backgroundTrackUrl || null,
      voiceoverVolume: options?.voiceoverVolume ?? 1.0,
      backgroundTrackVolume: options?.backgroundTrackVolume ?? 1.0,
      chapters: options?.chapters || null,
      captionsText: options?.captionsText || null,
    }
  });

  if (options?.poll && options.poll.question && options.poll.options.length > 0) {
    await prisma.poll.create({
      data: {
        postId: post.id,
        question: options.poll.question,
        options: {
          create: options.poll.options.map(text => ({ text }))
        }
      }
    });
  }

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

  // Parse mentions
  await processMentions(body, session.user.id, `/profile/inbox?post=${post.id}`);

  // Auto-award social_starter / related badges
  void checkAndAwardAchievements(session.user.id);

  return post;
}

export async function deleteSocialPost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { authorId: true }
  });

  if (!post) throw new Error("Post not found");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (post.authorId !== session.user.id && (user?.permissionLevel ?? 0) < 300) {
    throw new Error("Forbidden");
  }

  await prisma.socialPost.delete({ where: { id: postId } });
  return true;
}

export async function updateSocialPost(postId: string, newBody: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { authorId: true }
  });

  if (!post) throw new Error("Post not found");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (post.authorId !== session.user.id && (user?.permissionLevel ?? 0) < 300) {
    throw new Error("Forbidden");
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: { body: newBody }
  });
  return true;
}

export async function votePoll(pollId: string, optionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Check if already voted on this poll
  const existingVote = await prisma.pollVote.findFirst({
    where: {
      userId: session.user.id,
      option: { pollId }
    }
  });

  if (existingVote) {
    if (existingVote.optionId === optionId) return true; // Already voted for this
    
    // Change vote
    await prisma.pollVote.delete({ where: { id: existingVote.id } });
  }

  await prisma.pollVote.create({
    data: {
      userId: session.user.id,
      optionId
    }
  });

  return true;
}

export async function pinSocialPost(postId: string, isPinned: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if ((user?.permissionLevel ?? 0) < 300) {
    throw new Error("Forbidden");
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: { isPinned }
  });

  return true;
}

export async function replyToSocialPost(parentId: string, body: string, mediaUrl?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!body.trim() && !mediaUrl) throw new Error("Post cannot be empty");

  const reply = await prisma.socialPost.create({
    data: {
      authorId: session.user.id,
      parentId,
      body: body.trim(),
      mediaUrl: mediaUrl || null,
    }
  });

  // Notify parent author
  const parent = await prisma.socialPost.findUnique({ where: { id: parentId }, select: { authorId: true } });
  if (parent && parent.authorId !== session.user.id) {
    const notification = await prisma.notification.create({
      data: {
        userId: parent.authorId,
        type: "REPLY",
        message: "Someone replied to your post.",
        link: `/profile/inbox?post=${reply.id}`
      }
    });
    await emitNotificationCreated(notification);
  }

  // Parse mentions in reply
  await processMentions(body, session.user.id, `/profile/inbox?post=${reply.id}`);

  return reply;
}

export async function getPostReplies(postId: string) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const replies = await prisma.socialPost.findMany({
    where: { parentId: postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { 
        select: { 
          id: true, 
          username: true, 
          image: true, 
          permissionLevel: true,
          isVIP: true,
          isFounder: true,
          isTrusted: true,
          achievements: { where: { isPinned: true }, select: { badgeId: true } }
        } 
      },
      reactions: true,
    }
  });

  return replies.map(reply => ({
    id: reply.id,
    body: reply.body,
    mediaUrl: reply.mediaUrl,
    createdAt: reply.createdAt,
    author: reply.author,
    likesCount: reply.reactions.length,
    hasLiked: currentUserId ? reply.reactions.some(r => r.userId === currentUserId) : false,
  }));
}

