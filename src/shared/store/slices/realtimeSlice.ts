import { StateCreator } from "zustand";
import { AppState } from "../useAppStore";
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

export interface RealtimeSlice {
  notifications: ClientNotification[];
  unreadCount: number;
  addNotification: (n: ClientNotification) => void;
  setNotifications: (notifications: ClientNotification[]) => void;
  setUnreadCount: (count: number) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  presenceByUserId: Record<string, PresenceEntry>;
  setPresence: (userId: string, status: PresenceStatus, lastSeen: number) => void;

  lastChatMessage: ChatMessageSignal | null;
  setLastChatMessage: (msg: ChatMessageSignal) => void;

  watchedThreadId: string | null;
  setWatchedThreadId: (threadId: string | null) => void;
  lastForumReply: ForumReplySignal | null;
  setLastForumReply: (reply: ForumReplySignal | null) => void;

  mmoPlayerCount: number;
  mmoOnlineByUserId: Record<string, { characterName: string; mapId: string }>;
  setMmoPlayerOnline: (userId: string, characterName: string, mapId: string, playerCount?: number) => void;
  setMmoPlayerOffline: (userId: string, playerCount?: number) => void;

  lastFivemCharacterUpdate: { characterId: string; userId: string; receivedAt: number } | null;
  lastFivemBankUpdate: { characterId: string; userId: string; bank: number; receivedAt: number } | null;
  setLastFivemCharacterUpdate: (signal: { characterId: string; userId: string; receivedAt: number } | null) => void;
  setLastFivemBankUpdate: (signal: { characterId: string; userId: string; bank: number; receivedAt: number } | null) => void;

  lastSocialReaction: { postId: string; likesCount: number; timestamp: number } | null;
  setLastSocialReaction: (signal: { postId: string; likesCount: number; timestamp: number } | null) => void;
  lastSocialReply: { postId: string; reply: any; timestamp: number } | null;
  setLastSocialReply: (signal: { postId: string; reply: any; timestamp: number } | null) => void;

  processedEventIds: Set<string>;
  addProcessedEventId: (id: string) => void;
}

export const createRealtimeSlice: StateCreator<AppState, [], [], RealtimeSlice> = (set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    const { notifications } = get();
    if (notifications.some((existing) => existing.id === n.id)) return;

    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));

    toast(n.message, {
      action: n.link
        ? { label: "View", onClick: () => { window.location.href = n.link!; } }
        : undefined,
    });
  },

  setNotifications: (notifications) => {
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  },

  setUnreadCount: (count) => set({ unreadCount: count }),

  markNotificationRead: (id) => {
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

  presenceByUserId: {},

  setPresence: (userId, status, lastSeen) => {
    set((state) => ({
      presenceByUserId: {
        ...state.presenceByUserId,
        [userId]: { status, lastSeen },
      },
    }));
  },

  lastChatMessage: null,
  setLastChatMessage: (msg) => set({ lastChatMessage: msg }),

  watchedThreadId: null,
  setWatchedThreadId: (threadId) => set({ watchedThreadId: threadId }),
  lastForumReply: null,
  setLastForumReply: (reply) => set({ lastForumReply: reply }),

  mmoPlayerCount: 0,
  mmoOnlineByUserId: {},

  setMmoPlayerOnline: (userId, characterName, mapId, playerCount) => {
    set((state) => {
      const serapht = {
        ...state.mmoOnlineByUserId,
        [userId]: { characterName, mapId },
      };
      return {
        mmoOnlineByUserId: serapht,
        mmoPlayerCount: typeof playerCount === "number" ? playerCount : Object.keys(serapht).length,
      };
    });
  },

  setMmoPlayerOffline: (userId, playerCount) => {
    set((state) => {
      const serapht = { ...state.mmoOnlineByUserId };
      delete serapht[userId];
      return {
        mmoOnlineByUserId: serapht,
        mmoPlayerCount: typeof playerCount === "number" ? playerCount : Object.keys(serapht).length,
      };
    });
  },

  lastFivemCharacterUpdate: null,
  lastFivemBankUpdate: null,
  setLastFivemCharacterUpdate: (signal) => set({ lastFivemCharacterUpdate: signal }),
  setLastFivemBankUpdate: (signal) => set({ lastFivemBankUpdate: signal }),

  lastSocialReaction: null,
  setLastSocialReaction: (signal) => set({ lastSocialReaction: signal }),
  lastSocialReply: null,
  setLastSocialReply: (signal) => set({ lastSocialReply: signal }),

  processedEventIds: new Set(),

  addProcessedEventId: (id) => {
    set((state) => {
      const serapht = new Set(state.processedEventIds);
      serapht.add(id);
      if (serapht.size > 500) {
        const [oldest] = serapht;
        serapht.delete(oldest);
      }
      return { processedEventIds: serapht };
    });
  },
});
