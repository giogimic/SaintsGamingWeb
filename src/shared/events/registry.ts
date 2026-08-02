/**
 * Saints Gaming Realtime Platform — Event Registry (Zod Schemas)
 *
 * Every event emitted through RealtimeService must be registered here.
 * DO NOT add socket.io imports. This file is shared client/server.
 *
 * ⛔ Before adding a new event:
 *    1. Read /info/realtime/EVENTS.md
 *    2. Check this registry for existing events
 *    3. Define schema, priority, persistence, and producers/consumers
 */

import { z } from "zod";
import type { EventPriority, EventSource } from "./types";

// ─── Base Envelope Schema ─────────────────────────────────────────────────────
export const EventEnvelopeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  version: z.string().default("1.0"),
  timestamp: z.number().int().positive(),
  source: z.enum(["web", "mmo", "discord", "fivem", "system"] as const),
  priority: z.enum(["CRITICAL", "NORMAL", "EPHEMERAL"] as const),
  payload: z.record(z.unknown()),
});

// ─── Event-Specific Payload Schemas ──────────────────────────────────────────
export const NotificationCreatedSchema = z.object({
  notificationId: z.string(),
  userId: z.string(),
  type: z.string(),
  message: z.string(),
  link: z.string().nullable(),
});

export const ChatMessageCreatedSchema = z.object({
  messageId: z.string(),
  fromUserId: z.string(),
  toUserId: z.string().optional(),
  groupId: z.string().optional(),
  content: z.string().max(4000),
});

export const PresenceUpdatedSchema = z.object({
  userId: z.string(),
  status: z.enum(["online", "offline", "away", "playing"]),
  lastSeen: z.number().int().positive(),
});

export const ForumReplyCreatedSchema = z.object({
  replyId: z.string(),
  threadId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  excerpt: z.string().max(200),
});

export const GamePlayerOnlineSchema = z.object({
  userId: z.string(),
  characterName: z.string(),
  mapId: z.string(),
  playerCount: z.number().int().nonnegative().optional(),
});

export const GamePlayerOfflineSchema = z.object({
  userId: z.string(),
  playerCount: z.number().int().nonnegative().optional(),
});

export const DiscordMemberLinkedSchema = z.object({
  userId: z.string(),
  discordUserId: z.string(),
  username: z.string(),
});

export const DiscordRoleSyncedSchema = z.object({
  userId: z.string(),
  discordUserId: z.string(),
  permissionLevel: z.number().int(),
  sourceRoleIds: z.array(z.string()),
});

export const DiscordCommunityAnnounceSchema = z.object({
  message: z.string().max(500),
  link: z.string().nullable(),
});

export const FivemPlayerOnlineSchema = z.object({
  userId: z.string(),
  fivemLicense: z.string(),
  characterId: z.string().optional(),
  characterName: z.string().optional(),
  playerCount: z.number().int().nonnegative().optional(),
});

export const FivemPlayerOfflineSchema = z.object({
  userId: z.string(),
  fivemLicense: z.string(),
  playerCount: z.number().int().nonnegative().optional(),
});

export const FivemCharacterUpdatedSchema = z.object({
  userId: z.string(),
  characterId: z.string(),
  characterName: z.string(),
  cash: z.number().int(),
  bank: z.number().int(),
  health: z.number().int(),
  armor: z.number().int(),
  isDead: z.boolean(),
});

export const FivemBankUpdatedSchema = z.object({
  userId: z.string(),
  characterId: z.string(),
  characterName: z.string(),
  transactionType: z.string(),
  amount: z.number().int(),
  cash: z.number().int(),
  bank: z.number().int(),
});

// ─── Registry Entry ───────────────────────────────────────────────────────────
export interface RegistryEntry {
  schema: z.ZodSchema;
  priority: EventPriority;
  persistent: boolean; // Whether CRITICAL events are written to RealtimeEvent table
  producer: EventSource[];
  consumers: string[]; // Human-readable consumer descriptions
}

// ─── Event Registry Map ───────────────────────────────────────────────────────
// KEY: event type string — must be kebab-namespaced (e.g. "notification.created")
export const EVENT_REGISTRY: Record<string, RegistryEntry> = {
  "notification.created": {
    schema: NotificationCreatedSchema,
    priority: "CRITICAL",
    persistent: true,
    producer: ["web", "mmo", "system"],
    consumers: ["notifications-menu.tsx (bell icon)", "Sonner toast"],
  },
  "chat.message.created": {
    schema: ChatMessageCreatedSchema,
    priority: "NORMAL",
    persistent: false, // Stored in DirectMessage table, not RealtimeEvent
    producer: ["web"],
    consumers: ["messenger-popup.tsx", "ChatWindow"],
  },
  "presence.updated": {
    schema: PresenceUpdatedSchema,
    priority: "EPHEMERAL",
    persistent: false,
    producer: ["web", "mmo", "fivem"],
    consumers: ["UserAvatarBadge", "FriendList"],
  },
  "forum.reply.created": {
    schema: ForumReplyCreatedSchema,
    priority: "NORMAL",
    persistent: false,
    producer: ["web"],
    consumers: ["ThreadView (live replies)"],
  },
  "game.player.online": {
    schema: GamePlayerOnlineSchema,
    priority: "EPHEMERAL",
    persistent: false,
    producer: ["mmo"],
    consumers: ["ServerStatusCard", "ServerSelect", "Lobby admin"],
  },
  "game.player.offline": {
    schema: GamePlayerOfflineSchema,
    priority: "EPHEMERAL",
    persistent: false,
    producer: ["mmo"],
    consumers: ["ServerStatusCard", "ServerSelect", "Lobby admin"],
  },
  "discord.member.linked": {
    schema: DiscordMemberLinkedSchema,
    priority: "NORMAL",
    persistent: false,
    producer: ["discord"],
    consumers: ["notifications-menu (via SYSTEM notification)", "Admin audit"],
  },
  "discord.role.synced": {
    schema: DiscordRoleSyncedSchema,
    priority: "NORMAL",
    persistent: false,
    producer: ["discord"],
    consumers: ["notifications-menu (via SYSTEM notification)", "Admin audit"],
  },
  "discord.community.announce": {
    schema: DiscordCommunityAnnounceSchema,
    priority: "EPHEMERAL",
    persistent: false,
    producer: ["discord"],
    consumers: ["RealtimeProvider toast / site banner"],
  },
  "fivem.player.online": {
    schema: FivemPlayerOnlineSchema,
    priority: "EPHEMERAL",
    persistent: false,
    producer: ["fivem"],
    consumers: ["UCP live refresh", "FriendsList presence (playing)", "Admin audit"],
  },
  "fivem.player.offline": {
    schema: FivemPlayerOfflineSchema,
    priority: "EPHEMERAL",
    persistent: false,
    producer: ["fivem"],
    consumers: ["UCP live refresh", "FriendsList presence", "Admin audit"],
  },
  "fivem.character.updated": {
    schema: FivemCharacterUpdatedSchema,
    priority: "NORMAL",
    persistent: false,
    producer: ["fivem", "web"],
    consumers: ["UCP dashboard refresh", "profile/character panels"],
  },
  "fivem.bank.updated": {
    schema: FivemBankUpdatedSchema,
    priority: "NORMAL",
    persistent: false,
    producer: ["fivem"],
    consumers: ["UCP banking refresh", "achievement checks (high_roller)"],
  },
};

/**
 * Validates a raw payload against its registered event schema.
 * Returns parsed data or throws a ZodError.
 */
export function validateEventPayload(type: string, payload: unknown): unknown {
  const entry = EVENT_REGISTRY[type];
  if (!entry) {
    throw new Error(`[Realtime Registry] Unknown event type: "${type}". Register it in src/shared/events/registry.ts`);
  }
  return entry.schema.parse(payload);
}
