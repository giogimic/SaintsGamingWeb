"use server";

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { getViewerAccessLevel } from "./users"; // From my earlier refactor

export type ActivityItem = {
  id: string;
  type: "POST" | "THREAD" | "REPLY" | "MILESTONE";
  createdAt: Date;
  content: string;
  url: string;
  metadata?: any;
};

export async function getUserActivityFeed(username: string, limit = 20): Promise<ActivityItem[]> {
  const session = await auth();
  
  const profile = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      createdAt: true,
      profileSettings: true,
      receivedFriendships: { where: { status: "ACCEPTED", senderId: session?.user?.id } },
      sentFriendships: { where: { status: "ACCEPTED", receiverId: session?.user?.id } }
    }
  });

  if (!profile) return [];

  const isSelf = session?.user?.id === profile.id;
  const isMod = session?.user && (session.user as any).permissionLevel >= 50;
  const isFriend = profile.receivedFriendships.length > 0 || profile.sentFriendships.length > 0;

  const accessLevel = isSelf || isMod ? "PRIVATE" : isFriend ? "FRIENDS" : "PUBLIC";
  
  const visibility = profile.profileSettings?.activityVisibility || "PUBLIC";
  
  if (visibility === "HIDDEN" && accessLevel !== "PRIVATE") return [];
  if (visibility === "FRIENDS" && accessLevel === "PUBLIC") return [];

  // Fetch social posts
  const posts = await prisma.socialPost.findMany({
    where: { 
      authorId: profile.id,
      visibility: accessLevel === "PUBLIC" ? "PUBLIC" : undefined
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      body: true,
      createdAt: true,
      mediaUrl: true
    }
  });

  // Fetch threads
  const threads = await prisma.thread.findMany({
    where: { authorId: profile.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      subcategory: { select: { name: true } }
    }
  });

  // Fetch replies
  const replies = await prisma.reply.findMany({
    where: { authorId: profile.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      body: true,
      createdAt: true,
      thread: { select: { title: true, slug: true } }
    }
  });

  const activity: ActivityItem[] = [];

  for (const post of posts) {
    activity.push({
      id: `post-${post.id}`,
      type: "POST",
      createdAt: post.createdAt,
      content: post.body,
      url: `/feed/${post.id}`,
      metadata: { mediaUrl: post.mediaUrl }
    });
  }

  for (const thread of threads) {
    activity.push({
      id: `thread-${thread.id}`,
      type: "THREAD",
      createdAt: thread.createdAt,
      content: `Started a discussion: ${thread.title}`,
      url: `/forum/t/${thread.slug}`,
      metadata: { subcategory: thread.subcategory.name }
    });
  }

  for (const reply of replies) {
    activity.push({
      id: `reply-${reply.id}`,
      type: "REPLY",
      createdAt: reply.createdAt,
      content: `Replied to: ${reply.thread.title}`,
      url: `/forum/t/${reply.thread.slug}#reply-${reply.id}`,
      metadata: { excerpt: reply.body.substring(0, 100) + (reply.body.length > 100 ? "..." : "") }
    });
  }

  if (profile.profileSettings?.showMilestones) {
    activity.push({
      id: `milestone-join`,
      type: "MILESTONE",
      createdAt: profile.createdAt,
      content: `Joined Saints Gaming`,
      url: `/user/${username}`,
    });
  }

  // Sort and limit
  activity.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  return activity.slice(0, limit);
}
