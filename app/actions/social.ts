"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createSocialPost(
  body: string, 
  mediaUrl?: string,
  options?: {
    isSubscriberOnly?: boolean;
    voiceoverUrl?: string;
    backgroundTrackUrl?: string;
    voiceoverVolume?: number;
    backgroundTrackVolume?: number;
    chapters?: string;
    captionsText?: string;
  }
) {
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
      mediaUrl: mediaUrl || null,
      isSubscriberOnly: options?.isSubscriberOnly || false,
      voiceoverUrl: options?.voiceoverUrl || null,
      backgroundTrackUrl: options?.backgroundTrackUrl || null,
      voiceoverVolume: options?.voiceoverVolume ?? 1.0,
      backgroundTrackVolume: options?.backgroundTrackVolume ?? 1.0,
      chapters: options?.chapters || null,
      captionsText: options?.captionsText || null,
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

export async function getTheFeed(hashtagFilter?: string, broadenFeed?: boolean) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Fetch muted keywords/hashtags for the current user
  let mutedKeywords: string[] = [];
  let mutedHashtags: string[] = [];
  if (currentUserId) {
    const muted = await prisma.socialMutedKeyword.findMany({
      where: { userId: currentUserId }
    });
    mutedKeywords = muted.filter(m => m.type === "KEYWORD").map(m => m.keyword.toLowerCase());
    mutedHashtags = muted.filter(m => m.type === "HASHTAG").map(m => m.keyword.toLowerCase());
  }

  const whereClause: any = { parentId: null };
  if (broadenFeed) {
    whereClause.originalityScore = { gte: 50 }; // Penalize low-effort content
  }
  if (hashtagFilter) {
    whereClause.hashtags = { some: { hashtag: { name: hashtagFilter.toLowerCase() } } };
  }

  // Exclude posts with muted hashtags
  if (mutedHashtags.length > 0 && !hashtagFilter) {
    whereClause.NOT = {
      hashtags: { some: { hashtag: { name: { in: mutedHashtags } } } }
    };
  }

  let take = 50;
  // If broadenFeed is on, fetch 40 regular + 10 random-ish
  if (broadenFeed) {
    take = 40;
  }

  const posts = await prisma.socialPost.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      author: {
        select: { id: true, username: true, image: true, permissionLevel: true }
      },
      reactions: true,
      bookmarks: currentUserId ? { where: { userId: currentUserId } } : false,
      hashtags: { include: { hashtag: true } },
      _count: {
        select: { replies: true }
      }
    }
  });

  let allPosts = posts;

  // Broaden: inject random older posts the user hasn't interacted with
  if (broadenFeed && currentUserId) {
    const existingIds = posts.map(p => p.id);
    const randomPosts = await prisma.socialPost.findMany({
      where: {
        parentId: null,
        id: { notIn: existingIds },
        ...(mutedHashtags.length > 0 ? {
          NOT: { hashtags: { some: { hashtag: { name: { in: mutedHashtags } } } } }
        } : {}),
      },
      orderBy: { viewCount: "asc" }, // Surface less-seen content
      take: 10,
      include: {
        author: {
          select: { id: true, username: true, image: true, permissionLevel: true }
        },
        reactions: true,
        bookmarks: currentUserId ? { where: { userId: currentUserId } } : false,
        hashtags: { include: { hashtag: true } },
        _count: {
          select: { replies: true }
        }
      }
    });

    // Interleave random posts into the feed
    allPosts = [...posts];
    for (let i = 0; i < randomPosts.length; i++) {
      const insertAt = Math.min(Math.floor(Math.random() * allPosts.length), allPosts.length);
      allPosts.splice(insertAt, 0, randomPosts[i]);
    }
  }

  // Client-side filter for muted keywords (body text matching)
  let filteredPosts = mutedKeywords.length > 0
    ? allPosts.filter(post => !mutedKeywords.some(kw => post.body.toLowerCase().includes(kw)))
    : allPosts;

  // Filter subscriber-only content
  if (currentUserId) {
    const subs = await prisma.socialSubscription.findMany({
      where: { subscriberId: currentUserId, active: true },
      select: { subscribedToId: true }
    });
    const subIds = subs.map(s => s.subscribedToId);
    filteredPosts = filteredPosts.filter(p => !p.isSubscriberOnly || p.author.id === currentUserId || subIds.includes(p.author.id));
  } else {
    filteredPosts = filteredPosts.filter(p => !p.isSubscriberOnly);
  }

  return filteredPosts.map(post => ({
    id: post.id,
    body: post.body,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    viewCount: post.viewCount,
    shareCount: post.shareCount,
    author: post.author,
    likesCount: post.reactions.length,
    repliesCount: post._count.replies,
    hasLiked: currentUserId ? post.reactions.some(r => r.userId === currentUserId) : false,
    hasBookmarked: post.bookmarks ? post.bookmarks.length > 0 : false,
    hashtags: post.hashtags?.map(h => h.hashtag.name) || [],
    isSubscriberOnly: post.isSubscriberOnly,
    voiceoverUrl: post.voiceoverUrl,
    backgroundTrackUrl: post.backgroundTrackUrl,
    voiceoverVolume: post.voiceoverVolume,
    backgroundTrackVolume: post.backgroundTrackVolume,
    copyrightStrike: post.copyrightStrike,
    chapters: post.chapters ? JSON.parse(post.chapters) : null,
    captionsText: post.captionsText,
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

export async function getMiniFeed() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Fetch friendships
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { userId: session.user.id },
        { friendId: session.user.id }
      ]
    }
  });

  const friendIds = friendships.map(f => f.userId === session.user.id ? f.friendId : f.userId);

  // Fetch muted keywords for filtering
  const muted = await prisma.socialMutedKeyword.findMany({
    where: { userId: session.user.id }
  });
  const mutedKeywords = muted.filter(m => m.type === "KEYWORD").map(m => m.keyword.toLowerCase());
  const mutedHashtags = muted.filter(m => m.type === "HASHTAG").map(m => m.keyword.toLowerCase());

  const whereClause: any = {
    parentId: null,
    originalityScore: { gte: 0 }, // Mini feed shows all
    OR: [
      { visibility: "PUBLIC" },
      { visibility: "FRIENDS", authorId: { in: [session.user.id, ...friendIds] } }
    ]
  };

  if (mutedHashtags.length > 0) {
    whereClause.NOT = {
      hashtags: { some: { hashtag: { name: { in: mutedHashtags } } } }
    };
  }

  // Fetch posts
  const posts = await prisma.socialPost.findMany({
    where: whereClause,
    select: {
      id: true,
      body: true,
      mediaUrl: true,
      createdAt: true,
      author: { select: { id: true, username: true, image: true } },
      reactions: true,
      _count: { select: { reactions: true, replies: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 15
  });

  // Filter by muted keywords
  const filtered = mutedKeywords.length > 0
    ? posts.filter(p => !mutedKeywords.some(kw => p.body.toLowerCase().includes(kw)))
    : posts;

  return filtered.map(p => ({
    id: p.id,
    body: p.body,
    mediaUrl: p.mediaUrl,
    createdAt: p.createdAt,
    author: p.author,
    _count: p._count,
    hasLiked: p.reactions.some(r => r.userId === session.user?.id),
    likesCount: p._count.reactions,
    repliesCount: p._count.replies,
  }));
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
  return reply;
}

export async function getPostReplies(postId: string) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const replies = await prisma.socialPost.findMany({
    where: { parentId: postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, image: true, permissionLevel: true } },
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

// ─── Feed Upgrade: Watch History ────────────────────────────────────

export async function recordWatchHistory(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  // Track the view count and watch history
  const post = await prisma.socialPost.findUnique({ where: { id: postId }, select: { viewCount: true } });
  
  if (post) {
    const newViewCount = post.viewCount + 1;
    // Calculate revenue: let's say $0.05 per 100 views (just an example algorithm)
    const revenueEarned = (newViewCount / 100) * 0.05;

    await prisma.socialPost.update({
      where: { id: postId },
      data: { 
        viewCount: { increment: 1 },
        revenueEarned: revenueEarned
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

// ─── Tipping & Subscriptions ──────────────────────────────────────────

export async function tipSocialPost(postId: string, amount: number, message?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { authorId: true }
  });
  if (!post) throw new Error("Post not found");
  if (post.authorId === session.user.id) throw new Error("Cannot tip your own post");
  if (amount <= 0) throw new Error("Invalid amount");

  await prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUnique({ where: { id: session.user.id }, select: { coins: true } });
    if (!sender || sender.coins < amount) {
      throw new Error("Insufficient coins to send this tip.");
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
  });
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

// ─── Feed Upgrade: User Preferences ────────────────────────────────

export async function getUserFeedPreferences() {
  const session = await auth();
  if (!session?.user?.id) return { broadenFeed: false };

  const prefs = await prisma.socialUserPreference.findUnique({
    where: { userId: session.user.id }
  });

  return { broadenFeed: prefs?.broadenFeed ?? false };
}

export async function updateFeedPreferences(broadenFeed: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.socialUserPreference.upsert({
    where: { userId: session.user.id },
    update: { broadenFeed },
    create: { userId: session.user.id, broadenFeed }
  });
  return true;
}

// ─── Feed Upgrade: Search ───────────────────────────────────────────

export async function searchFeed(query: string) {
  if (!query.trim()) return [];

  const session = await auth();
  const currentUserId = session?.user?.id;

  const posts = await prisma.socialPost.findMany({
    where: {
      parentId: null,
      OR: [
        { body: { contains: query.trim() } },
        { captionsText: { contains: query.trim() } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: {
        select: { id: true, username: true, image: true, permissionLevel: true }
      },
      reactions: true,
      bookmarks: currentUserId ? { where: { userId: currentUserId } } : false,
      _count: {
        select: { replies: true }
      }
    }
  });

  return posts.map(post => ({
    id: post.id,
    body: post.body,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    viewCount: post.viewCount,
    shareCount: post.shareCount,
    author: post.author,
    likesCount: post.reactions.length,
    repliesCount: post._count.replies,
    hasLiked: currentUserId ? post.reactions.some(r => r.userId === currentUserId) : false,
    hasBookmarked: post.bookmarks ? post.bookmarks.length > 0 : false,
    hashtags: [],
  }));
}

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
