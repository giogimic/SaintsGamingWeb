/**
 * Chat Handlers — player_chat, global_chat_msg, chat_message, show_toast.
 *
 * Writes directly to useChatStore (replacing the old CustomEvent bridge)
 * and useToastStore for server toasts.
 */
import type {
  PlayerChatPayload,
  GlobalChatMsgPayload,
  ChatMessagePayload,
  ShowToastPayload,
} from '../protocol.d';
import { useChatStore, type ChatChannel } from '../../state/useChatStore';
import { useMultiplayerStore } from '../../state/useMultiplayerStore';
import { useToastStore } from '../../state/useToastStore';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Local/party chat from another player.
 */
export function onPlayerChat(data: PlayerChatPayload): void {
  if (!data.message) return;

  const channel = (data.channel?.toUpperCase() || 'LOCAL') as ChatChannel;

  useChatStore.getState().addMessage({
    id: generateId(),
    sender: data.sender || 'Unknown',
    text: data.message,
    channel,
    timestamp: Date.now(),
    accountId: data.accountId,
    socketId: data.socketId,
  });

  // Show chat bubble above the player's head
  if (data.socketId) {
    useMultiplayerStore.getState().updateOtherPlayer(data.socketId, {
      chatMessage: data.message,
    });
  }
}

/**
 * Global chat message.
 */
export function onGlobalChatMsg(data: GlobalChatMsgPayload): void {
  if (!data.message) return;

  useChatStore.getState().addMessage({
    id: generateId(),
    sender: data.sender || data.name || 'Unknown',
    text: data.message,
    channel: 'GLOBAL',
    timestamp: data.timestamp || Date.now(),
    accountId: data.accountId,
    socketId: data.socketId,
  });
}

/**
 * Generic chat_message (system messages, whispers, etc.).
 */
export function onChatMessage(data: ChatMessagePayload): void {
  if (!data.message) return;

  const channel = (data.channel?.toUpperCase() || 'SYSTEM') as ChatChannel;

  useChatStore.getState().addMessage({
    id: generateId(),
    sender: data.senderName || data.sender || 'System',
    text: data.message,
    channel,
    timestamp: data.timestamp || Date.now(),
    accountId: data.accountId,
    socketId: data.socketId,
  });
}

/**
 * Server-sent toast notification.
 */
export function onShowToast(data: ShowToastPayload): void {
  if (data.message) {
    useToastStore.getState().showToast(data.message);
  }
}
