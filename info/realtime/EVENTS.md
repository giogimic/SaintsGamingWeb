# Saints Gaming Realtime Platform — Event Catalog

## Current Implementation Status
**Status**: 🟢 Milestones 1–3 live — notifications, presence, chat, forum, admin dashboard, and coarse MMO online/offline bridge.

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
| Producer | Forum API, Social Actions, Support System, Mentions (`emitNotificationCreated`) |
| Consumers | `notifications-menu.tsx` (bell badge + Sonner toast) via `RealtimeProvider` |

**Payload:**
```typescript
{
  notificationId: string;
  userId: string;
  type: string;       // "REPLY" | "MENTION" | "SYSTEM" | "LIKE" | "TIP"
  message: string;
  link: string | null;
}
```

---

### `chat.message.created` 🟢 Live (Milestone 2)

| Field | Value |
| :--- | :--- |
| Priority | `NORMAL` |
| Persisted | No (stored in `DirectMessage` / `GroupMessage` tables) |
| Producer | `app/actions/messenger.ts` (`sendMessage`, `sendGroupMessage`) |
| Consumers | `ChatWindow` (instant refetch via `useRealtimeStore.lastChatMessage`) |

**Payload:**
```typescript
{
  messageId: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  content: string; // E2EE ciphertext for DMs; plaintext for groups
}
```

---

### `presence.updated` 🟢 Live (Milestone 2)

| Field | Value |
| :--- | :--- |
| Priority | `EPHEMERAL` |
| Persisted | No |
| Producer | `SocketHandler` connect/disconnect (friend fan-out) |
| Consumers | `FriendsList` online indicators via `useRealtimeStore.presenceByUserId` |

**Payload:**
```typescript
{
  userId: string;
  status: "online" | "offline" | "away" | "playing";
  lastSeen: number; // Unix ms
}
```

---

### `forum.reply.created` 🟢 Live (Milestone 2)

| Field | Value |
| :--- | :--- |
| Priority | `NORMAL` |
| Persisted | No (stored in `Reply` table) |
| Producer | `app/api/forum/replies/route.ts`, `app/api/forum/reply/route.ts` → room `thread:{id}` |
| Consumers | `LiveThreadReplies` (toast + `router.refresh`) |

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

### `game.player.online` 🟢 Live (Milestone 3)

| Field | Value |
| :--- | :--- |
| Priority | `EPHEMERAL` |
| Persisted | No |
| Producer | `PlayerManager` → `ecosystemBroadcast` → `SocketHandler` → `RealtimeService.emitGlobal` (`source: "mmo"`) |
| Consumers | `ServerStatusCard`, `ServerSelect`, Lobby admin |

> [!IMPORTANT]
> This is a **coarse ecosystem event** only. Player position, combat data, and movement ticks are handled exclusively within the MMO engine network and MUST NOT be published to the website socket channel.

**Payload:**
```typescript
{
  userId: string;
  characterName: string;
  mapId: string;
  playerCount?: number;
}
```

---

### `game.player.offline` 🟢 Live (Milestone 3)

| Field | Value |
| :--- | :--- |
| Priority | `EPHEMERAL` |
| Persisted | No |
| Producer | `PlayerManager` disconnect → same ecosystem bridge |
| Consumers | `ServerStatusCard`, `ServerSelect`, Lobby admin |

**Payload:**
```typescript
{
  userId: string;
  playerCount?: number;
}
```

---

## Adding New Events

1. Add payload interface to `src/shared/events/types.ts`
2. Add Zod schema + `RegistryEntry` to `src/shared/events/registry.ts`
3. Emit via `RealtimeService.publishEvent()` (server) or read from `useRealtimeStore` (client)
4. Prefer `src/web/lib/realtime-emit.ts` from API routes / server actions
5. Add catalog entry to this file
