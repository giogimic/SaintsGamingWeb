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
    producer: ["web", "mmo"],
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
    consumers: ["ServerStatusCard", "Website presence badge"],
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
