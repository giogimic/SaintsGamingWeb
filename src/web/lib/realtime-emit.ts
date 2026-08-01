/**
 * Fire-and-forget helpers for publishing through RealtimeService from
 * API routes and server actions. Never call socket.io directly.
 *
 * getRealtimeService() is null when Next.js runs without server.ts
 * (e.g. `next start` without the custom server) — that is non-fatal.
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
