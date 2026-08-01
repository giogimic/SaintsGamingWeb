# Backend Overview

**Process model:** Custom Node server (`server.ts`) hosts Next.js + Socket.io + MMO GameEngine.

---

## Process entry

| File | Role |
| :--- | :--- |
| `server.ts` | Boots Next, Socket.io, GameEngine managers, RealtimeService |
| `getRealtimeService()` | Exported from `server.ts` for API/action emits |

Dev: `npx tsx server.ts` (or project `npm run dev` if wired to the same entry).  
Prod: typically Docker / PM2 — see deploy scripts under `scripts/`.

---

## API routes

All App Router handlers: `app/api/**/route.ts`.

Common domains:

| Prefix | Purpose |
| :--- | :--- |
| `/api/auth/*` | NextAuth + register / password reset |
| `/api/forum/*` | Threads, replies, likes |
| `/api/upload/*` | Avatar, forum, social, generic |
| `/api/maps/*` | WorldMap index + payload |
| `/api/realtime/*` | Missed-event sync |
| `/api/admin/*` | Staff-only admin APIs |
| `/api/game/*` | Game status / helpers |
| `/api/internal/events` | Service-to-service realtime envelopes |
| `/api/discord/*`, `/api/fivem/*` | Ecosystem bridges (**back-line**) |
| `/api/ai/*` | Forum text enhance (**back-line**) |

Pattern: validate auth/permissions → Prisma → optional `RealtimeService.publishEvent` / `realtime-emit` helpers. Never `io.emit` from routes.

---

## Server actions

Primary folder: `app/actions/`

| File | Domain |
| :--- | :--- |
| `auth.ts` | Password / account helpers |
| `social.ts` | Feed, reactions, tips, mute, subscribe |
| `messenger.ts` | Friends + DMs + groups |
| `game.ts` / `game-admin.ts` / `game-dev.ts` | Lobby / studio |
| `settings.ts`, `users.ts`, … | Site/user ops |

Colocated: `app/(main)/admin/actions.ts`, `app/(ucp)/ucp/actions.ts`.

---

## Data & shared libs

- Schema: `prisma/schema.prisma`
- Client: `src/web/lib/prisma.ts`
- Permissions: `src/web/lib/permissions.ts`
- XP: `src/web/lib/xp.ts`
- Uploads: `src/web/lib/upload.ts` → [`../uploads/STORAGE.md`](../uploads/STORAGE.md)
- Realtime helpers: `src/web/lib/realtime-emit.ts`
- Event registry: `src/shared/events/registry.ts` (must register before emit)

---

## Detailed catalog

Full route + actions inventory: [`API_CATALOG.md`](./API_CATALOG.md).

## Cross-links

- Realtime bus: [`../realtime/ARCHITECTURE.md`](../realtime/ARCHITECTURE.md)
- Maps DB: [`../database/WORLDMAP.md`](../database/WORLDMAP.md)
- Admin gates: [`../admin/PERMISSIONS.md`](../admin/PERMISSIONS.md)
- Discord / FiveM / AI bridges: **back-line** — see those folders only when needed
