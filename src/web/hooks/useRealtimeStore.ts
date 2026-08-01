"use client";

/**
 * Saints Gaming Realtime Platform — Client Zustand Store
 *
 * The single source of realtime state on the client.
 * Components subscribe to slices of this store — they do NOT manage
 * socket connections or call socket.on() themselves.
 *
 * ⛔ Do NOT add socket.io imports here. This store is driven by RealtimeProvider.
 */

import { create } from "zustand";
import { toast } from "sonner";

export interface ClientNotification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export type PresenceStatus = "online" | "offline" | "away" | "playing";

export interface PresenceEntry {
  status: PresenceStatus;
  lastSeen: number;
}

export interface ChatMessageSignal {
  messageId: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  content: string;
  receivedAt: number;
}

export interface ForumReplySignal {
  replyId: string;
  threadId: string;
  authorId: string;
  authorName: string;
  excerpt: string;
  receivedAt: number;
}

interface RealtimeState {
  // ─── Notifications ──────────────────────────────────────────────
  notifications: ClientNotification[];
  unreadCount: number;
  addNotification: (n: ClientNotification) => void;
  setNotifications: (notifications: ClientNotification[]) => void;
  setUnreadCount: (count: number) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  // ─── Presence ───────────────────────────────────────────────────
  presenceByUserId: Record<string, PresenceEntry>;
  setPresence: (userId: string, status: PresenceStatus, lastSeen: number) => void;

  // ─── Chat delivery signals ──────────────────────────────────────
  lastChatMessage: ChatMessageSignal | null;
  setLastChatMessage: (msg: ChatMessageSignal) => void;

  // ─── Forum live thread ──────────────────────────────────────────
  watchedThreadId: string | null;
  setWatchedThreadId: (threadId: string | null) => void;
  lastForumReply: ForumReplySignal | null;
  setLastForumReply: (reply: ForumReplySignal | null) => void;

  // ─── Event Deduplication ────────────────────────────────────────
  processedEventIds: Set<string>;
  addProcessedEventId: (id: string) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  // ─── Notifications ────────────────────────────────────────────────
  notifications: [],
  unreadCount: 0,

  addNotification: (n: ClientNotification) => {
    const { notifications } = get();

    // Skip if already in store (double safety besides provider dedup)
    if (notifications.some((existing) => existing.id === n.id)) return;

    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 50), // Keep latest 50
      unreadCount: state.unreadCount + 1,
    }));

    // Show an instant toast notification
    toast(n.message, {
      action: n.link
        ? { label: "View", onClick: () => { window.location.href = n.link!; } }
        : undefined,
    });
  },

  setNotifications: (notifications: ClientNotification[]) => {
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  },

  setUnreadCount: (count: number) => set({ unreadCount: count }),

  markNotificationRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  // ─── Presence ─────────────────────────────────────────────────────
  presenceByUserId: {},

  setPresence: (userId, status, lastSeen) => {
    set((state) => ({
      presenceByUserId: {
        ...state.presenceByUserId,
        [userId]: { status, lastSeen },
      },
    }));
  },

  // ─── Chat delivery signals ────────────────────────────────────────
  lastChatMessage: null,

  setLastChatMessage: (msg) => set({ lastChatMessage: msg }),

  // ─── Forum live thread ────────────────────────────────────────────
  watchedThreadId: null,
  setWatchedThreadId: (threadId) => set({ watchedThreadId: threadId }),
  lastForumReply: null,
  setLastForumReply: (reply) => set({ lastForumReply: reply }),

  // ─── Event Deduplication ──────────────────────────────────────────
  processedEventIds: new Set<string>(),

  addProcessedEventId: (id: string) => {
    set((state) => {
      const next = new Set(state.processedEventIds);
      next.add(id);
      // Keep the cache bounded to avoid unbounded memory growth
      if (next.size > 500) {
        const [oldest] = next;
        next.delete(oldest);
      }
      return { processedEventIds: next };
    });
  },
}));
