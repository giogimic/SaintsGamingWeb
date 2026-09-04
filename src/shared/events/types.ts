/**
 * Saints Gaming Realtime Platform — Shared Event Types
 *
 * DO NOT import socket.io here. This file is shared between client and server.
 * All realtime code must go through RealtimeService (server) or useAppStore (client).
 */

// ─── Priority Tiers ──────────────────────────────────────────────────────────
// CRITICAL → Persisted to DB (RealtimeEvent table); replayed on reconnect
// NORMAL   → Stored in domain tables (Chat, Forum); fetched on demand
// EPHEMERAL → Fire-and-forget; NEVER stored; never replayed
export type EventPriority = "CRITICAL" | "NORMAL" | "EPHEMERAL";

// ─── Event Sources ────────────────────────────────────────────────────────────
export type EventSource = "web" | "mmo" | "discord" | "fivem" | "system";

// ─── Standardized Envelope ────────────────────────────────────────────────────
// Every event emitted through the platform MUST conform to this shape.
export interface EventEnvelope<T = unknown> {
  id: string;          // cuid() — used for client-side deduplication
  type: string;        // e.g. "notification.created"
  version: string;     // semver string, e.g. "1.0"
  timestamp: number;   // Unix ms
  source: EventSource;
  priority: EventPriority;
  payload: T;
}

// ─── Notification Event ───────────────────────────────────────────────────────
export interface NotificationCreatedPayload {
  notificationId: string;
  userId: string;
  type: string;         // e.g. "REPLY", "MENTION", "SYSTEM"
  message: string;
  link: string | null;
}

// ─── Chat Event ───────────────────────────────────────────────────────────────
export interface ChatMessageCreatedPayload {
  messageId: string;
  fromUserId: string;
  toUserId?: string;       // null = group or channel
  groupId?: string;
  content: string;
}

// ─── Presence Event ───────────────────────────────────────────────────────────
export interface PresenceUpdatedPayload {
  userId: string;
  status: "online" | "offline" | "away" | "playing";
  lastSeen: number; // Unix ms
}

// ─── Forum Events ─────────────────────────────────────────────────────────────
export interface ForumReplyCreatedPayload {
  replyId: string;
  threadId: string;
  authorId: string;
  authorName: string;
  excerpt: string; // First 120 chars of body
}

// ─── Game Events ─────────────────────────────────────────────────────────────
// NOTE: High-frequency MMO ticks (movement, combat) stay inside the game engine.
// Only coarse ecosystem events are published to the web realtime bus.
export interface GamePlayerOnlinePayload {
  userId: string;
  characterName: string;
  mapId: string;
  playerCount?: number;
}

export interface GamePlayerOfflinePayload {
  userId: string;
  playerCount?: number;
}

export interface GameLevelUpPayload {
  userId: string;
  characterName: string;
  newLevel: number;
}

// ─── Discord Bridge Events ────────────────────────────────────────────────────
export interface DiscordMemberLinkedPayload {
  userId: string;
  discordUserId: string;
  username: string;
}

export interface DiscordRoleSyncedPayload {
  userId: string;
  discordUserId: string;
  permissionLevel: number;
  sourceRoleIds: string[];
}

export interface DiscordCommunityAnnouncePayload {
  message: string;
  link: string | null;
}

// ─── FiveM Bridge Events ──────────────────────────────────────────────────────
// Coarse character/stats only — never per-tick coords or inventory spam.
export interface FivemPlayerOnlinePayload {
  userId: string;
  fivemLicense: string;
  characterId?: string;
  characterName?: string;
  playerCount?: number;
}

export interface FivemPlayerOfflinePayload {
  userId: string;
  fivemLicense: string;
  playerCount?: number;
}

export interface FivemCharacterUpdatedPayload {
  userId: string;
  characterId: string;
  characterName: string;
  cash: number;
  bank: number;
  health: number;
  armor: number;
  isDead: boolean;
}

export interface FivemBankUpdatedPayload {
  userId: string;
  characterId: string;
  characterName: string;
  transactionType: string;
  amount: number;
  cash: number;
  bank: number;
}
