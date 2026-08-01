# Saints Gaming Web — Complete Project Report

**Version**: 2.1.95 | **Audit Date**: 2026-08-01 | **Status**: Active Development

> This document is the authoritative reference for Saints Gaming Web. Any AI assistant, new developer, or collaborator should read this file before making changes. It defines what exists, what works, what is incomplete, and what to do next.

---

## Current Project Overview

Saints Gaming Web is a **full-stack community + game ecosystem** built on Next.js 15 (App Router). It is not a typical website. It is a platform with three distinct but integrated layers:

1. **Community Web App**: Forums, user profiles, social feed, news, support tickets, leaderboards, modpacks, game server status.
2. **Embedded 2.5D MMO Engine**: A full multiplayer game client (`/lobby`) running Babylon.js inside the browser. Server-authoritative game loop via Socket.io with creature encounters, turn-based combat, quests, economy, and crafting.
3. **Realtime Platform** *(Milestone 1 live)*: A unified Socket.io event bus powering instant notifications, with infrastructure in place for presence, messaging, forums, and external service integration.

**Tech Stack:**
- Framework: Next.js 15 + React 19 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4 + Custom CSS Design Tokens
- Database: Prisma ORM → SQLite (dev) / MariaDB (prod)
- Game Engine: Custom Babylon.js 2.5D Wrapper
- Multiplayer: Socket.io v4
- Auth: NextAuth v5 (Auth.js)
- Deployment: Docker + Caddy reverse proxy on VPS

---

## Completed Systems 🟢

### Authentication & Accounts
- **Status**: 🟢 Production-ready
- NextAuth v5 with credentials + OAuth
- Password hashing (bcrypt), reset flow, email verification tokens
- Force password change enforcement
- Session provider with JWT
- Files: `auth.ts`, `auth.config.ts`, `app/(main)/login/`, `app/(main)/register/`, `app/(main)/forgot-password/`

### Forum System
- **Status**: 🟢 Production-ready
- Categories, subcategories, threads, replies, reactions, hashtags, polls
- Thread subscriptions, reply likes, @mention notifications, QA best-answer pinning
- Rich markdown rendering with sanitization
- Files: `app/(main)/forum/`, `app/api/forum/`

### User Profiles & Social
- **Status**: 🟢 Production-ready
- Public profiles with bio, avatar (gravatar fallback), achievements, pinned creature
- Profile image galleries, YouTube video embed, music player embed
- Steam wishlist integration, UI preset display
- Files: `app/(main)/profile/`, `app/(main)/user/`, `app/actions/profile.ts`

### Social Feed (TikTok/YT-style)
- **Status**: 🟢 Production-ready
- Posts with text, images, polls, subscriber-only gating
- Reactions, bookmarks, watch history, muted keywords, tips, subscriptions, reports
- Files: `app/actions/social.ts` (969 lines), `src/web/components/social/`

### E2EE Direct Messenger
- **Status**: 🟢 Production-ready (no realtime push yet — Milestone 2)
- End-to-end encrypted direct messages, group chats
- Friends list with friend request system
- Messenger popup UI docked to main layout
- Files: `src/web/components/messenger/`, `app/actions/messenger.ts`

### News & Content System
- **Status**: 🟢 Production-ready
- Published news articles with markdown body, cover images, promo links, media assets
- Writer role gate, hashtag system
- Files: `app/(main)/news/`, `app/(main)/admin/news/`, `app/api/` (news routes)

### Support Ticket System
- **Status**: 🟢 Production-ready
- Open/In-Progress/Closed tickets with categories (Bug Report, Ban Appeal, General, Store)
- Threaded ticket messages, admin ticket management
- Files: `app/(main)/support/`, `app/(main)/admin/tickets/`

### Admin Control Panel
- **Status**: 🟢 Production-ready (core features)
- User management (ban, role assignment, force password change, dev console toggle)
- Role editor, tier/level editor, forum moderation, news management
- Game server manager, modpack management, RSS feed editor
- Dev tools: database operations, system metrics, dev sandbox, task runner
- Files: `app/(main)/admin/`

### MMO Game Engine (Server)
- **Status**: 🟢 Core loop production-ready
- `GameEngine.ts` — authoritative tick loop, event bus
- `PlayerManager.ts` — player state, movement validation, entity sync (16545 bytes)
- `WorldManager.ts` — map sharding, zone boundaries, entity cleanup
- `CombatManager.ts` — real-time overworld combat
- `CreatureManager.ts` — wild creature spawning, encounter provider
- `EncounterManager.ts` — turn-based encounter engine
- `CraftingManager.ts` — recipe-based item crafting
- `EconomyManager.ts` — player economy, GTC marketplace
- `QuestManager.ts`, `SkillManager.ts`, `InventoryManager.ts`, `PartyManager.ts`
- Files: `src/server/`

### MMO Game Client (Browser)
- **Status**: 🟢 Core loop production-ready
- Babylon.js 2.5D orthographic renderer (`GameCanvasBabylon.tsx` — 33k lines)
- 4-directional sprite animations, collision detection, camera tracking
- Floating health bars, damage numbers
- Full UI system: Hotbar, Minimap, Chat, Party, RPG Stats, Inventory, Skills, Crafting, Quest Log, Dex, Equipment, GTC
- Battle overlay for turn-based encounters
- Mobile fullscreen launcher with D-Pad + action pad
- Files: `src/web/components/the-lobby/`

### Saints Studio (In-Game Map & Hero Editor)
- **Status**: 🟢 Functional
- Draggable panel system inside the game UI
- World Builder, NPC Editor, Asset Browser, Class Editor, Sprite Browser
- `StarterHeroEditorPanel.tsx` (49k bytes) — full hero archetype management
- Game Config Editor, Server Controls panel
- Files: `src/web/components/the-lobby/editor/`

### Game Asset Pipeline
- **Status**: 🟢 Functional
- `GameAsset` Prisma model with full metadata (type, source, tags, categories, atlas)
- Tuxemon monster/sprite import scripts
- Asset editor admin UI
- Files: `app/(main)/admin/game-dev/assets/`, `scripts/import-tuxemon-assets.ts`

### Realtime Platform — Milestone 1
- **Status**: 🟢 Foundation live
- `RealtimeService.ts` — validated event bus with circuit breaker
- `SocketHandler.ts` — user room join, auth, MMO game events
- `useRealtimeStore` — Zustand client store
- `RealtimeProvider.tsx` — persistent socket, reconnect sync
- `/api/realtime/sync` — catch-up endpoint
- `/api/internal/events` — external producer ingestion (FiveM, Discord)
- Notifications: 30s polling **replaced** by instant push
- Files: `src/server/realtime/`, `src/shared/events/`, `src/web/components/realtime/`, `src/web/hooks/useRealtimeStore.ts`

### FiveM / UCP Integration
- **Status**: 🟢 Production-ready
- Characters, vehicles, properties, inventory, bank transactions, factions, gangs
- UCP pages: dashboard, characters, banking, analytics, garage, social, settings
- FiveM status API and character API
- Files: `app/(ucp)/`, `app/api/fivem/`

### Stream Integration
- **Status**: 🟢 Functional
- Twitch/YouTube/Kick stream profiles per user
- Cron-based live check (`/api/cron/check-streams`)
- Stream gallery on community page
- Files: `app/(main)/streams/`, `app/api/stream/`, `app/api/cron/check-streams/`

---

## Partial Systems 🟡

### Realtime Platform — Milestones 2–5
- **Status**: 🟡 Foundation done; features pending
- Event registry exists; `presence.updated`, `chat.message.created`, `forum.reply.created` schemas registered but not wired to producers
- Direct Messenger has no realtime push yet (still request/response only)
- Forum thread view has no live reply stream yet
- Admin Realtime Dashboard (`/admin/realtime`) — planned but not created
- **Next**: Wire `chat.message.created` into messenger, `presence.updated` on connect/disconnect, `forum.reply.created` in thread view

### Leaderboards
- **Status**: 🟡 Partial
- XP/level leaderboard exists, thread count leaderboard exists
- Missing: per-game leaderboards, GTC trading leaderboards, creature collection leaderboards
- Files: `app/(main)/forum/leaderboard/`, `app/(main)/leaderboards/`

### Achievements System
- **Status**: 🟡 Partial
- `UserAchievement` model exists, profile display works
- Achievement definitions are hardcoded constants, not DB-driven
- No automated unlock triggers wired to game actions
- Files: `app/(main)/admin/achievements/`, `app/actions/achievements.ts`

### Game Server Status Dashboard
- **Status**: 🟡 Partial
- FiveM server status works via GameDig
- MMO server status works via live `PlayerManager` count
- No live admin metrics dashboard yet
- Files: `app/(main)/status/`, `app/api/servers/`

### RSS Gaming News Feed
- **Status**: 🟡 Partial
- RSS fetch cron exists, feed management admin exists
- UI rendering works
- Missing: proper error handling on failed RSS fetches, no dedup
- Files: `app/(main)/gaming-news/`, `app/api/cron/fetch-rss/`

### Discord Integration
- **Status**: 🟡 Stub only
- `/api/discord/` directory exists but is empty
- No webhook, bot integration, or role sync implemented
- The internal events API (`/api/internal/events`) is ready to receive Discord bot events
- **Next**: Discord bot publishes events via `/api/internal/events`

### AI Feature Routes
- **Status**: 🟡 Placeholder
- `/api/ai/` exists
- Google Gemini SDK (`@google/genai`) installed
- No working AI features wired into the public UI yet
- Files: `app/api/ai/`

---

## Broken Connections 🔴

### Social Actions → Realtime Push (Missing)
- `app/actions/social.ts` creates `Notification` records for follows, tips, mentions (lines 393, 497, 748) but **does not call `RealtimeService`**
- Notifications created by social actions won't appear instantly; user must reload
- **Fix**: Import `getRealtimeService()` and call `realtime.emitToUser()` after each `prisma.notification.create()`

### Forum Replies Route → Realtime Push (Missing)
- `app/api/forum/replies/route.ts` creates notifications for subscribers (lines 96–125) but has **no realtime push**
- Note: `app/api/forum/reply/route.ts` (singular) **is** wired — the plural `/replies/` route is not
- **Fix**: Add `getRealtimeService()` call in `/api/forum/replies/route.ts`

### Support Actions → Realtime Push (Missing)
- `app/(main)/support/actions.ts` creates a notification on line 96 but has **no realtime push**
- **Fix**: Same pattern as forum reply — import and call `getRealtimeService()`

### Messenger → Realtime Push (Not connected)
- Messenger uses request/response only. `chat.message.created` event is registered in the registry but never emitted
- Users must refresh to see new messages
- **Fix**: Milestone 2 work — emit `chat.message.created` in `app/actions/messenger.ts`

### MMO → Website Presence (No bridge)
- When a player connects/disconnects from the MMO (`SocketHandler.ts`), `presence.updated` is never emitted to the website realtime bus
- Website has no idea who is online in-game
- **Fix**: Add `realtime.emitToUser(accountId, "presence.updated", {...})` in `SocketHandler` connection/disconnect handlers

### `info/` Directory (Sparse)
- Only `info/realtime/` exists (2 docs)
- No documentation exists yet for: frontend, backend, database, auth, forum, social, game, admin, or UCP systems
- **Fix**: Milestone 3 — write `info/` docs for each major system

---

## Technical Debt

| Item | Severity | Notes |
| :--- | :--- | :--- |
| `app/api/discord/` is empty | Medium | Discord integration is a public promise; empty stub misleads developers |
| `docs/TODO.md` is stale (v2.1.62) | Low | Not updated since v2.1.62 — replace with `/info/` going forward |
| `README.md` version badge shows v2.1.94 | Low | Update to v2.1.95 |
| `legacy/` directory | Low | Unknown contents; should be audited and either documented or deleted |
| `scratch/` directory | Low | Should not be in production repo |
| Achievement unlocks not automated | Medium | Achievements exist but are never awarded by game events |
| No event sourcing for Social notifications | Medium | `social.ts`, `support/actions.ts`, `/api/forum/replies/route.ts` don't push realtime |
| `GameCanvasBabylon.tsx` is 33k bytes | Medium | Should be split into sub-modules; high cognitive load for AI sessions |
| `social.ts` is 969 lines / 28k bytes | Medium | Should be broken into domain-specific action files |
| No test coverage on game engine | High | `combat.test.ts` and `store.test.ts` exist but coverage is minimal |
| `character-creator.tsx` is 38k bytes | Low | Works but huge; good candidate for future modular split |
| MMO spatial partitioning not implemented | High (Game) | Server broadcasts all players to all clients; does not scale past ~30 simultaneous |
| No binary packing (JSON over WS) | Medium (Game) | `docs/TODO.md` notes Protocol Buffers/ArrayBuffer as planned — not done |
| Redis adapter not installed | Low (Infra) | Single-instance only; needed before multi-PM2 scaling |

---

## Recommended Development Order

### Immediate (Milestone 2 — Realtime Wiring)
1. **Wire missing notification emits** in `social.ts`, `/api/forum/replies/route.ts`, `support/actions.ts`
2. **Wire presence.updated** in `SocketHandler.ts` on connect/disconnect
3. **Wire chat.message.created** in `messenger.ts` for instant DM delivery
4. **Build Admin Realtime Dashboard** at `app/(main)/admin/realtime/page.tsx`

### Near-Term (Milestone 3 — /info Documentation)
5. Write `info/` documentation for all major systems (frontend, backend, database, game, social, admin)
6. Create `info/AI_RULES.md` cross-reference index

### Medium-Term (Milestone 4 — Scaling & Performance)
7. MMO spatial partitioning — only broadcast players in the same zone
8. Binary message packing (ArrayBuffer/Protocol Buffers) for movement events
9. Add Redis adapter for multi-instance PM2

### Long-Term (Milestones 5–6 — Ecosystem)
10. Discord bot → `/api/internal/events` bridge
11. Achievement unlock automation from game/social events
12. FiveM → `/api/internal/events` bridge for character events
13. AI features connected to public UI

---

## Cursor / AI Migration Notes

### Where Development Should Resume
Start with **Milestone 2 — Realtime Wiring**. All infrastructure exists. The only work is adding `getRealtimeService()` calls in 3 existing files and building the admin dashboard.

### Files That Matter Most

| File | Why It Matters |
| :--- | :--- |
| `server.ts` | Entire server entry point — game engine + realtime init |
| `src/server/realtime/RealtimeService.ts` | All socket broadcasts |
| `src/shared/events/registry.ts` | Event schema registry — check before adding events |
| `src/server/SocketHandler.ts` | MMO socket lifecycle |
| `src/web/components/the-lobby/index.tsx` | MMO client root (28k bytes) |
| `src/web/components/the-lobby/store.ts` | Client game Zustand store (29k bytes) |
| `app/actions/social.ts` | All social platform actions (969 lines) |
| `app/(main)/layout.tsx` | Main layout — wraps all pages |
| `prisma/schema.prisma` | Database schema |

### Systems That Must Not Be Touched Without Full Context

> [!CAUTION]
> These systems are complex and battle-tested. Do not refactor or rewrite without reading their `/info/` docs and the `AGENTS.md` rules.

- **`GameCanvasBabylon.tsx`** — Babylon.js renderer. Sprite atlas, texture coordinates, animation states. Fragile. Read before touching.
- **`SocketHandler.ts`** — Game event bus wiring. Changing event names will break the live game client.
- **`auth.ts` / `auth.config.ts`** — NextAuth configuration. Breaking this locks all users out.
- **`prisma/schema.prisma`** — Any field removal will break existing queries. Always migrate safely.
- **`src/web/components/the-lobby/store.ts`** — Zustand game state. High coupling with game loop.

### What Context an AI Needs First

Before starting any session, an AI assistant should read:
1. `info/AI_DEVELOPMENT_RULES.md` — mandatory constraints
2. `info/realtime/ARCHITECTURE.md` — if touching realtime
3. `info/realtime/EVENTS.md` — if adding a new event
4. `README.md` — tech stack overview
5. `CHANGELOG.md` (last 20 entries) — recent changes and patterns

### What NOT to Do
- Do not create new socket connection logic outside `RealtimeProvider.tsx`
- Do not add game engine logic inside Next.js API routes
- Do not create pages at `app/[feature]/page.tsx` — use `app/(main)/[feature]/page.tsx`
- Do not skip `prisma db push` after schema changes
- Do not add high-frequency game data to the website socket channel
