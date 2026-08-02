"use server";

// Social actions — Feed queries, trending, preferences, search
// Consumed via barrel: @/app/actions/social

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";

export async function getTheFeed(hashtagFilter?: string, broadenFeed?: boolean, cursor?: string) {
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

  const queryArgs: any = {
    where: whereClause,
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
      bookmarks: currentUserId ? { where: { userId: currentUserId } } : false,
      hashtags: { include: { hashtag: true } },
      polls: {
        include: {
          options: {
            include: {
              _count: { select: { votes: true } },
              votes: currentUserId ? { where: { userId: currentUserId } } : false
            }
          }
        }
      },
      _count: {
        select: { replies: true }
      }
    },
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "desc" }
    ],
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  };

  const posts = await prisma.socialPost.findMany(queryArgs);

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
    filteredPosts = filteredPosts.filter(p => !p.isSubscriberOnly || p.authorId === currentUserId || subIds.includes(p.authorId));
  } else {
    filteredPosts = filteredPosts.filter(p => !p.isSubscriberOnly);
  }

  return filteredPosts.map((post: any) => {
    if (post.isForumThread) return post; // already mapped

    return {
      id: post.id,
      body: post.body,
      mediaUrl: post.mediaUrl,
      createdAt: post.createdAt,
      viewCount: post.viewCount,
      shareCount: post.shareCount,
      author: post.author,
      likesCount: post.reactions.length,
      repliesCount: post._count.replies,
      hasLiked: currentUserId ? post.reactions.some((r: any) => r.userId === currentUserId) : false,
      hasBookmarked: post.bookmarks ? post.bookmarks.length > 0 : false,
      hashtags: post.hashtags?.map((h: any) => h.hashtag.name) || [],
      isSubscriberOnly: post.isSubscriberOnly,
      voiceoverUrl: post.voiceoverUrl,
      backgroundTrackUrl: post.backgroundTrackUrl,
      voiceoverVolume: post.voiceoverVolume,
      backgroundTrackVolume: post.backgroundTrackVolume,
      copyrightStrike: post.copyrightStrike,
      chapters: post.chapters ? JSON.parse(post.chapters) : null,
      captionsText: post.captionsText,
      isForumThread: false,
      threadUrl: null,
      isAuthor: currentUserId ? post.author.id === currentUserId : false
    };
  });
}

export async function getTrendingTags() {
  return await prisma.socialHashtag.findMany({
    orderBy: { usageCount: "desc" },
    take: 10,
    select: { name: true, usageCount: true }
  });
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

