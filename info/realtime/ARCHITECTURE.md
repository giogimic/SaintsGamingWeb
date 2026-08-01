# Saints Gaming Realtime Platform — Architecture Reference

## Current Implementation Status

**Status**: 🟡 Milestone 1 In Progress

| Component | Status | Notes |
| :--- | :--- | :--- |
| `RealtimeService` server bus | 🟢 Done | `src/server/realtime/RealtimeService.ts` |
| `SocketHandler` integration | 🟢 Done | Users join `user:{id}` room on connect |
| `server.ts` singleton | 🟢 Done | `getRealtimeService()` exported for API routes |
| Shared event types | 🟢 Done | `src/shared/events/types.ts` |
| Zod event registry | 🟢 Done | `src/shared/events/registry.ts` |
| `RealtimeEvent` Prisma model | 🟢 Done | Pushed to DB via `prisma db push` |
| `/api/realtime/sync` | 🟢 Done | Client reconnection catch-up |
| `/api/internal/events` | 🟢 Done | External producer ingestion |
| `RealtimeProvider` (client) | 🟢 Done | `src/web/components/realtime/RealtimeProvider.tsx` |
| `useRealtimeStore` (Zustand) | 🟢 Done | `src/web/hooks/useRealtimeStore.ts` |
| Notifications migration | 🟢 Done | 30s polling removed; realtime store used |
| MMO notification push | 🔴 Planned | Milestone 2 |
| Presence system | 🔴 Planned | Milestone 2 |
| Admin realtime dashboard | 🔴 Planned | Milestone 2 |

---

## System Topology

```
┌───────────────────────────────────────────────────────┐
│                  Saints Gaming Platform                │
│                                                       │
│  ┌──────────────┐    ┌──────────────┐  ┌──────────┐  │
│  │  Next.js Web │    │  FiveM / Bot │  │ Launcher │  │
│  └──────┬───────┘    └──────┬───────┘  └────┬─────┘  │
│         │ socket.io         │ POST           │        │
│         │ (persistent)      │ /api/internal  │        │
│         ▼                   ▼                         │
│  ┌──────────────────────────────────────────────┐     │
│  │            server.ts (Node + Socket.io)      │     │
│  │                                              │     │
│  │   ┌──────────────────────────────────────┐  │     │
│  │   │         RealtimeService              │  │     │
│  │   │  publishEvent() → Zod validate       │  │     │
│  │   │  persist CRITICAL → RealtimeEvent    │  │     │
│  │   │  emit to user:{id} | room | global   │  │     │
│  │   └──────────────────────────────────────┘  │     │
│  │                                              │     │
│  │   ┌──────────────┐  ┌───────────────────┐   │     │
│  │   │ SocketHandler│  │   MMO GameEngine   │   │     │
│  │   │ (web events) │  │ (isolated loop)    │   │     │
│  │   └──────────────┘  └───────────────────┘   │     │
│  └──────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────┘
```

---

## Core Principles

### 1. Strict MMO Boundary
The **Website Realtime Bus** and the **MMO Game Loop** are strictly separated.

**Website Bus emits**: `notification.created`, `presence.updated`, `chat.message.created`, `forum.reply.created`, `game.player.online` (coarse ecosystem events)

**MMO Engine handles internally**: Player position (60Hz), combat ticks, spatial collision — these NEVER enter the website socket namespace.

### 2. Priority Tiers

| Priority | Persistence | Reconnect Replay |
| :--- | :--- | :--- |
| `CRITICAL` | `RealtimeEvent` table | Yes — via `/api/realtime/sync` |
| `NORMAL` | Domain tables (Chat, Forum) | On-demand channel fetch |
| `EPHEMERAL` | None | Never |

### 3. Single Entry Point
**Server**: All broadcasts go through `RealtimeService.publishEvent()`. Never call `io.emit()` directly.
**Client**: All realtime state lives in `useRealtimeStore`. Components do not call `socket.on()` directly.

### 4. Authentication
Socket connections validate session token via `next-auth/jwt` in `SocketHandler.initialize()`.
External producers use `Authorization: Bearer <SAINTS_INTERNAL_SECRET>` via `/api/internal/events`.

---

## Scaling Notes
Current setup runs on a single Node.js process. When multi-instance PM2 deployment is needed, add `@socket.io/redis-adapter` to the `io` server in `server.ts`. No other code changes are required.

---

## Adding a New Realtime Feature (Checklist)

> [!IMPORTANT]
> Before writing any realtime code:
> 1. Check `/info/realtime/EVENTS.md` for existing events
> 2. Add event definition to `src/shared/events/registry.ts`
> 3. Emit via `RealtimeService` (server) or read from `useRealtimeStore` (client)
> 4. NEVER call `socket.emit()` directly from API routes or components
> 5. Update `/info/realtime/EVENTS.md` after adding new events
