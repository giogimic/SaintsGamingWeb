# Saints Gaming Realtime Platform — Event Catalog

## Current Implementation Status
**Status**: 🟡 Milestone 1 In Progress — Notifications live, others planned.

---

## Event Envelope Format

Every event follows this standard envelope:

```typescript
{
  id: string;         // UUID — used for client-side deduplication
  type: string;       // Namespaced event name (see catalog below)
  version: string;    // "1.0"
  timestamp: number;  // Unix milliseconds
  source: "web" | "mmo" | "discord" | "fivem" | "system";
  priority: "CRITICAL" | "NORMAL" | "EPHEMERAL";
  payload: { ... };   // Event-specific, validated by Zod registry
}
```

---

## Event Catalog

### `notification.created` 🟢 Live

| Field | Value |
| :--- | :--- |
| Priority | `CRITICAL` |
| Persisted | Yes (`RealtimeEvent` table) |
| Producer | Forum API, Social Actions, Support System |
| Consumers | `notifications-menu.tsx` (bell badge + Sonner toast) |

**Payload:**
```typescript
{
  notificationId: string;
  userId: string;
  type: string;       // "REPLY" | "MENTION" | "SYSTEM"
  message: string;
  link: string | null;
}
```

---

### `chat.message.created` 🔴 Planned (Milestone 2)

| Field | Value |
| :--- | :--- |
| Priority | `NORMAL` |
| Persisted | No (stored in `DirectMessage` table) |
| Producer | Messenger API (`social.ts`) |
| Consumers | `MessengerPopup`, `ChatWindow` |

**Payload:**
```typescript
{
  messageId: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  content: string;
}
```

---

### `presence.updated` 🔴 Planned (Milestone 2)

| Field | Value |
| :--- | :--- |
| Priority | `EPHEMERAL` |
| Persisted | No |
| Producer | `SocketHandler` (connect/disconnect), MMO GameEngine |
| Consumers | `UserAvatarBadge`, Friend List |

**Payload:**
```typescript
{
  userId: string;
  status: "online" | "offline" | "away" | "playing";
  lastSeen: number; // Unix ms
}
```

---

### `forum.reply.created` 🔴 Planned (Milestone 2)

| Field | Value |
| :--- | :--- |
| Priority | `NORMAL` |
| Persisted | No (stored in `Reply` table) |
| Producer | Forum replies API |
| Consumers | `ThreadView` (live reply stream for active viewers) |

**Payload:**
```typescript
{
  replyId: string;
  threadId: string;
  authorId: string;
  authorName: string;
  excerpt: string; // First 120 chars
}
```

---

### `game.player.online` 🔴 Planned (Milestone 3)

| Field | Value |
| :--- | :--- |
| Priority | `EPHEMERAL` |
| Persisted | No |
| Producer | MMO GameEngine (via RealtimeService bridge) |
| Consumers | `ServerStatusCard`, website presence indicators |

> [!IMPORTANT]
> This is a **coarse ecosystem event** only. Player position, combat data, and movement ticks are handled exclusively within the MMO engine network and MUST NOT be published to the website socket channel.

**Payload:**
```typescript
{
  userId: string;
  characterName: string;
  mapId: string;
}
```

---

## Adding New Events

1. Add payload interface to `src/shared/events/types.ts`
2. Add Zod schema + `RegistryEntry` to `src/shared/events/registry.ts`
3. Emit via `RealtimeService.publishEvent()` (server) or read from `useRealtimeStore` (client)
4. Add catalog entry to this file
