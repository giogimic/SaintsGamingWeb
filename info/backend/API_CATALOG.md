# Backend API & Actions Catalog

Companion to [`OVERVIEW.md`](./OVERVIEW.md). Paths are under `app/api/` unless noted.  
**Back-line** domains (Discord / FiveM / AI / S3) are listed briefly — prefer core routes when extending the live site.

---

## Auth

| Route | Notes |
| :--- | :--- |
| `auth/[...nextauth]` | NextAuth handlers |
| `auth/register` | Account creation |
| `auth/forgot-password` | Reset kickoff |
| `auth/error` | Auth error page API helper |

See [`../auth/OVERVIEW.md`](../auth/OVERVIEW.md).

---

## Forum (core)

| Route | Notes |
| :--- | :--- |
| `forum/threads`, `forum/thread`, `forum/thread/[id]` | List / create / read |
| `forum/thread/[id]/watch`, `…/move`, `…/accept-answer` | Thread ops |
| `forum/reply`, `forum/replies`, `forum/replies/[id]` | Replies |
| `forum/reply/[id]/like` | Reply likes |
| `forum/reactions`, `forum/report`, `forum/report/[id]` | Reactions / reports |
| `forum/poll/[id]/vote` | Polls |

Realtime: `forum.reply.created` — [`../realtime/EVENTS.md`](../realtime/EVENTS.md).  
Forum admin UI: [`../forum/OVERVIEW.md`](../forum/OVERVIEW.md).

---

## Uploads

| Route | Notes |
| :--- | :--- |
| `upload` | Generic (MOD+) |
| `upload/avatar` | Profile avatar |
| `upload/forum` | Forum/news images |
| `upload/social` | Social archives / media |

All go through `src/web/lib/upload.ts` — [`../uploads/STORAGE.md`](../uploads/STORAGE.md).

---

## Maps & world

| Route | Notes |
| :--- | :--- |
| `maps` | WorldMap index (`?gameId=`) |
| `maps/[slug]` | Full map payload; POST upsert (Developer+) |
| `world/logic-tiles` | Logic tile registry |
| `tile-registry` | Tile definitions |

Ops: [`../database/WORLDMAP.md`](../database/WORLDMAP.md).

---

## Realtime & search

| Route | Notes |
| :--- | :--- |
| `realtime/sync` | Missed CRITICAL events after reconnect |
| `internal/events` | Service bus (Bearer `SAINTS_INTERNAL_SECRET`) |
| `notifications` | Notification list/mark helpers |
| `search` | Global site search |

Never `io.emit` from routes — use `RealtimeService` / `realtime-emit`.

---

## Game (MMO helpers)

| Route | Notes |
| :--- | :--- |
| `game/server-status` | Online / player count (also served from `server.ts`) |
| `servers/status` | Public server status cards |
| `creatures`, `creatures/evolve`, `creatures/species/[slug]` | Creature data |
| `encounters/[slug]` | Encounter tables |
| `quests/active` | Active quests |

Lobby architecture: [`../game/OVERVIEW.md`](../game/OVERVIEW.md).

---

## Admin APIs

| Route | Notes |
| :--- | :--- |
| `admin/users` | User admin |
| `admin/forum/categories`, `admin/forum/subcategories` | Board structure |
| `admin/news` | News CRUD |
| `admin/streams` | Stream management |
| `admin/modpacks` | Modpack admin |
| `admin/realtime` | Metrics / circuit breaker / force-disconnect |
| `admin/database` | DB tooling |
| `admin/system/update` | System update hooks |

UI gates: [`../admin/PERMISSIONS.md`](../admin/PERMISSIONS.md).

---

## Cron / misc

| Route | Notes |
| :--- | :--- |
| `cron/check-streams`, `cron/fetch-rss` | Scheduled jobs |
| `stream/profile` | Stream profile helper |
| `ui-presets`, `ui-presets/[id]` | UI preset storage |
| `user/avatar/gravatar` | Gravatar helper |
| `dev/*` | Dev-only seed/metrics/setup (protect in prod) |

---

## Back-line (do not prioritize)

| Route | Notes |
| :--- | :--- |
| `discord/events` | Bot ingestion — [`../discord/BRIDGE.md`](../discord/BRIDGE.md) |
| `fivem/events`, `fivem/characters`, `fivem/status` | RP bridge — [`../fivem/BRIDGE.md`](../fivem/BRIDGE.md) |
| `ai/enhance`, `ai/config`, `ai/local` | Forum text enhance — [`../forum/TEXT_ENHANCE.md`](../forum/TEXT_ENHANCE.md) |

---

## Server actions (`app/actions/`)

| File | Domain |
| :--- | :--- |
| `auth.ts` | Password / account |
| `social.ts` | Feed, reactions, tips, mute, subscribe (**large**) |
| `social-folders.ts` | Bookmark folders |
| `messenger.ts` | Friends, DMs, groups |
| `profile.ts` | Profile updates |
| `users.ts` | User admin helpers |
| `settings.ts` | Site/user settings |
| `achievements.ts` | Achievement admin/award helpers |
| `game.ts` | Lobby client-facing actions |
| `game-admin.ts` | Studio / world admin |
| `game-dev.ts` | Game-dev tooling |
| `starter-heroes.ts` | Starter hero cards |
| `gtc.ts`, `steam.ts` | Integrations |

Colocated: `app/(main)/admin/actions.ts`, `app/(ucp)/ucp/actions.ts`.

---

## Emit checklist (live features)

When a mutation should feel instant:

1. Persist with Prisma  
2. Register event in `src/shared/events/registry.ts` if new  
3. Emit via `realtime-emit` or `getRealtimeService().publishEvent`  
4. Document in [`../realtime/EVENTS.md`](../realtime/EVENTS.md)
