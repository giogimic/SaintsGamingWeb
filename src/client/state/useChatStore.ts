/**
 * Chat Store — Message log with channel support and deduplication.
 *
 * Replaces the old `window.dispatchEvent(new CustomEvent('game_chat_msg', ...))`
 * bridge. Socket handlers write directly here; UI components subscribe.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type ChatChannel = 'LOCAL' | 'GLOBAL' | 'PARTY' | 'WHISPER' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  channel: ChatChannel;
  timestamp: number;
  recipient?: string;
  accountId?: string;
  socketId?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  activeChannel: ChatChannel;

  addMessage: (msg: ChatMessage) => void;
  setActiveChannel: (channel: ChatChannel) => void;
  clearMessages: () => void;
}

const MAX_MESSAGES = 200;

/**
 * Deduplicate by content+sender+channel within a 6-second window.
 * This replaces the old `recentChatEventKeysRef` Map in index.tsx.
 */
const recentKeys = new Map<string, number>();

function isDuplicate(msg: ChatMessage): boolean {
  const bucketTs = Math.floor(msg.timestamp / 1000);
  const key = `${msg.channel}|${msg.sender}|${msg.text}|${msg.accountId || ''}|${msg.socketId || ''}|${bucketTs}`;
  const now = Date.now();
  const seenAt = recentKeys.get(key);
  if (seenAt && now - seenAt < 6000) return true;
  recentKeys.set(key, now);

  // Prune stale entries to prevent memory growth
  if (recentKeys.size > 300) {
    for (const [k, t] of recentKeys) {
      if (now - t > 60000) recentKeys.delete(k);
    }
  }

  return false;
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector(
    immer((set) => ({
      messages: [],
      activeChannel: 'GLOBAL' as ChatChannel,

      addMessage: (msg) => {
        if (!msg.text?.trim()) return;
        if (isDuplicate(msg)) return;

        set((s) => {
          s.messages = [...s.messages, msg].slice(-MAX_MESSAGES);
        });
      },

      setActiveChannel: (channel) => set((s) => { s.activeChannel = channel; }),

      clearMessages: () => set((s) => { s.messages = []; }),
    }))
  )
);
