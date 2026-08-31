/**
 * Fire-and-forget helpers for publishing through RealtimeService from
 * API routes and server actions. Never call socket.io directly.
 *
 * getRealtimeService() is null when Next.js runs without server.ts
 * (e.g. `next start` without the custom server) — that is non-fatal.
 *
 * Server-only: do not import from Client Components (pulls custom server / redis).
 */



type NotificationRow = {
  id: string;
  userId: string;
  type: string;
  message: string;
  link: string | null;
};

async function getRealtime() {
  // Root custom server singleton (same pattern as app/api/internal/events)
  const { getRealtimeService } = await import("../../../server");
  return getRealtimeService();
}

export async function emitNotificationCreated(notification: NotificationRow): Promise<void> {
  try {
    const realtime = await getRealtime();
    if (!realtime) return;
    await realtime.emitToUser(notification.userId, "notification.created", {
      notificationId: notification.id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      link: notification.link,
    });
  } catch {
    // Non-fatal: row is persisted; client sees it on next load / sync
  }
}

export async function emitChatMessageCreated(payload: {
  messageId: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  content: string;
}): Promise<void> {
  try {
    const realtime = await getRealtime();
    if (!realtime) return;
    if (payload.toUserId) {
      await realtime.emitToUser(payload.toUserId, "chat.message.created", payload);
    } else if (payload.groupId) {
      await realtime.emitToRoom(`group:${payload.groupId}`, "chat.message.created", payload);
    }
  } catch {
    // Non-fatal
  }
}

export async function emitForumReplyCreated(payload: {
  replyId: string;
  threadId: string;
  authorId: string;
  authorName: string;
  excerpt: string;
}): Promise<void> {
  try {
    const realtime = await getRealtime();
    if (!realtime) return;
    await realtime.emitToRoom(`thread:${payload.threadId}`, "forum.reply.created", {
      ...payload,
      excerpt: payload.excerpt.slice(0, 200),
    });
  } catch {
    // Non-fatal
  }
}

/** Fan presence to the user and accepted friends (same pattern as SocketHandler). */
export async function emitPresenceUpdated(
  userId: string,
  status: "online" | "offline" | "away" | "playing",
  options: { source?: "web" | "mmo" | "discord" | "fivem" | "system" } = {}
): Promise<void> {
  try {
    const realtime = await getRealtime();
    if (!realtime) return;

    const { prisma } = await import("@/web/lib/prisma");
    const payload = {
      userId,
      status,
      lastSeen: Date.now(),
    };

    await realtime.publishEvent("presence.updated", payload, {
      userId,
      source: options.source ?? "web",
    });

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ userId }, { friendId: userId }],
      },
      select: { userId: true, friendId: true },
    });

    const friendIds = new Set<string>();
    for (const f of friendships) {
      friendIds.add(f.userId === userId ? f.friendId : f.userId);
    }

    await Promise.all(
      Array.from(friendIds).map((friendId) =>
        realtime.publishEvent("presence.updated", payload, {
          userId: friendId,
          source: options.source ?? "web",
        })
      )
    );
  } catch {
    // Non-fatal
  }
}

/** Broadcast social post like/reaction count updates to all connected viewers */
export async function emitSocialPostReacted(postId: string, likesCount: number): Promise<void> {
  try {
    const realtime = await getRealtime();
    if (!realtime) return;
    await realtime.emitGlobal("social.post.reacted", {
      postId,
      likesCount,
      timestamp: Date.now(),
    });
  } catch {
    // Non-fatal
  }
}

/** Broadcast social post reply additions to all connected viewers */
export async function emitSocialReplyCreated(postId: string, reply: any): Promise<void> {
  try {
    const realtime = await getRealtime();
    if (!realtime) return;
    await realtime.emitGlobal("social.reply.created", {
      postId,
      reply,
      timestamp: Date.now(),
    });
  } catch {
    // Non-fatal
  }
}

