# Saints Gaming Web — Complete Project Report

**Version**: 2.1.95 | **Audit Date**: 2026-08-01 | **Status**: Active Development

> This is the primary onboarding document. Any new developer, contractor, or AI assistant should read this in full before touching the codebase. It is the single source of truth for what exists, what is missing, and where to continue.

---

## Current Project Overview

Saints Gaming Web is a **full-stack community + game ecosystem** built on Next.js 15 (App Router). It operates across three interconnected layers:

### Layer 1 — Community Platform
A full community management system: forums, user profiles, TikTok-style social feed, news, support tickets, leaderboards, modpacks, game server status, stream hub, and a subscriber/tip economy.

### Layer 2 — Embedded 2.5D MMO Engine
A full multiplayer game client running at `/lobby`. Babylon.js renders a top-down orthographic world with 96x128px Tuxemon/LPC sprite sheets. The server (`server.ts`) runs an authoritative Node.js game loop with 14 domain managers: PlayerManager, WorldManager, CombatManager, CreatureManager, EncounterManager, CraftingManager, EconomyManager, QuestManager, SkillManager, InventoryManager, PartyManager, DialogueManager, PersistenceManager, EntityManager.

### Layer 3 — Saints Realtime Platform *(Milestone 1 live)*
A unified Socket.io event bus. Events are Zod-validated, CRITICAL ones persisted, and clients receive missed events via a reconnect catch-up endpoint. All external producers (FiveM, Discord, launcher) post via `/api/internal/events`.

### Tech Stack
| Category | Technology |
| :--- | :--- |
| Framework | Next.js 15 + React 19 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + custom CSS tokens |
| Database | Prisma ORM → SQLite (dev) / MariaDB (prod) |
| Game Engine | Custom Babylon.js 2.5D wrapper |
| Multiplayer | Socket.io v4 |
| Auth | NextAuth v5 (Auth.js) — credentials + Discord OAuth |
| Email | Resend (gracefully degraded if key missing) |
| AI | Google Gemini 2.5 Flash (streaming via `@google/genai`) |
| Deployment | Docker + Caddy reverse proxy on VPS |

---

## Completed Systems 🟢

### Authentication & Accounts
- NextAuth v5 with credentials + Discord OAuth
- bcrypt password hashing, reset flow, email verification tokens
- Force-password-change enforcement on login
- Session via JWT; `auth()` used universally across API routes and server components
- **Key files**: `auth.ts`, `auth.config.ts`, `app/(main)/login/`, `app/(main)/register/`, `app/(main)/forgot-password/`, `app/(main)/reset-password/`, `app/(main)/force-password-change/`

### Permission System
- **14 numeric role levels**: Lurker(0) → Developer(1000). Fully documented in `permissions.ts`.
- Helper functions: `hasPermission()`, `canBan()`, `canMute()`, `canPurge()`, `getRoleName()`, `getRoleColor()`
- XP auto-promotes non-staff users through community tiers (Lurker → New → User → Active → Dedicated → Loyal → Saint)
- **Key file**: `src/web/lib/permissions.ts`

### XP & Leveling System
- `awardXP(userId, amount)` handles: XP update, level recalculation via DB-driven `LevelTier` table, permission tier auto-promotion, and **silent FiveM character bank reward** on level up (5000 × newLevel per character).
- XP awards defined: Thread create=10, Reply=5, Reaction=1, News article=50
- **Key file**: `src/web/lib/xp.ts`

### Forum System
- Categories, subcategories, threads, replies, reactions, hashtags, polls
- Thread subscriptions, reply likes, @mention parsing + notifications
- QA best-answer pinning, markdown rendering, post reports
- Forum-level search included in global search
- **Key files**: `app/(main)/forum/`, `app/api/forum/`

### User Profiles & Social Layer
- Public profiles: bio, avatar (gravatar fallback on miss), achievements, pinned creature, gallery, YouTube embed, music embed, Steam wishlist, UI preset display
- Complete friend/follow/block/subscriber/tip social graph
- **Key files**: `app/(main)/profile/`, `app/(main)/user/`, `app/actions/profile.ts`

### Social Feed (TikTok/YT-Style)
- Posts: text (280 char), images, polls, voiceover/background track, chapter markers, captions
- Subscriber-only gating, hashtag tracking, reactions, bookmarks, watch history, muted keywords, tips, reports
- 969-line server action file (`social.ts`) covers the full feature set
- **Key files**: `app/actions/social.ts`, `src/web/components/social/`

### E2EE Direct Messenger
- End-to-end encrypted direct messages and group chats using `src/web/lib/crypto.ts`
- Friend list with friend request system embedded in sidebar
- Messenger popup docked in the main layout
- **No live push yet** (Milestone 2 work) — currently request/response only
- **Key files**: `src/web/components/messenger/`, `app/actions/messenger.ts`

### News & Content System
- Published news articles with markdown body, cover image, promo link, media assets, hashtags
- Writer role gate, rich markdown editor with AI grammar/polish assist via `/api/ai/enhance`
- RSS feed import (`/api/cron/fetch-rss`)
- **Key files**: `app/(main)/news/`, `app/(main)/gaming-news/`, `app/(main)/admin/news/`, `app/(main)/admin/rss/`

### AI Text Enhancement
- **Live**: `/api/ai/enhance` uses `gemini-2.5-flash` streaming to grammar-fix or polish markdown
- Two modes: `intent="grammar"` (fix only) vs default (full polish)
- Used by: News article editor, forum post editor
- **Key file**: `app/api/ai/enhance/route.ts`

### Global Search
- `GET /api/search?q=` searches threads, articles, modpacks, and users in one parallel query
- Rate-limited to 10 requests/minute per IP
- Results display via `global-search.tsx` in the navbar
- **Key files**: `app/api/search/route.ts`, `src/shared/components/global-search.tsx`

### File Upload System
- Centralized in `src/web/lib/upload.ts`: MIME validation, size limits, crypto-random filenames, directory creation
- Upload types: `uploadAvatar()`, `uploadForumImage()`, `uploadSocialMedia()` (image+video), `uploadModpackFile()` (archives)
- Routes: `/api/upload/` (route.ts), `/api/upload/social/`, `/api/upload/forum/`
- Avatar: `/api/user/avatar/gravatar/` handles gravatar fallback
- **Key file**: `src/web/lib/upload.ts`

### Email System
- Resend-backed with graceful degradation (logs warning if key missing, never crashes)
- Templates: password reset, email verification, support ticket notifications
- **Key file**: `src/web/lib/email.ts`

### Discord Integration Library
- Webhook dispatcher with 429 rate-limit retry (`sendDiscordWebhook()`)
- OAuth token lifecycle manager with auto-refresh (`getValidDiscordToken()`)
- Used by: notification webhooks (configurable via admin settings)
- **Key file**: `src/web/lib/discord.ts`

### Support Ticket System
- Categories: Bug Report, Ban Appeal, General, Store
- Threaded ticket messages, Open/In-Progress/Closed states, admin management
- **Key files**: `app/(main)/support/`, `app/(main)/admin/tickets/`

### Admin Control Panel
- **User management**: search, ban/unban, role assignment, force password change, dev console toggle, view linked accounts
- **Role editor**: create/edit named roles with permission levels
- **Tier editor**: manage `LevelTier` definitions (XP thresholds, names, icons)
- **Forum moderation**: category/subcategory management, post/thread moderation
- **News management**: publish/edit/delete articles, manage writers
- **Modpack management**: create/edit/order/publish modpacks
- **Stream management**: feature/unfeature stream profiles
- **RSS feed manager**: add/edit/delete RSS sources
- **Game server manager**: start/stop MMO dev server, view player count
- **Game tools**: creature/quest/asset editors, tile registry builder
- **Dev tools**: database operations (SQLite→MariaDB migration via `/api/admin/database`), system metrics, sandbox, task runner, lobby dev panel
- **Admin settings**: site-wide settings (site name, version, Discord URL, feature flags)
- **Key directory**: `app/(main)/admin/`

### MMO Game Engine — Server
- Authoritative Node.js game loop in `GameEngine.ts`
- **14 Managers** (all initialized on server startup):
  - `PlayerManager` (16KB) — movement validation, entity state, reconciliation, cleanup
  - `WorldManager` (8.5KB) — map zones, sharding, entity cleanup, gate transitions
  - `CombatManager` — real-time overworld combat, skill-based damage
  - `CreatureManager` (10.4KB) — wild creature spawning, AI movement, encounter triggers
  - `EncounterManager` (8.5KB) — turn-based encounter engine, capture/defeat logic
  - `CraftingManager` (7KB) — recipe-based crafting, inventory checks
  - `EconomyManager` (7.6KB) — GTC marketplace, player economy
  - `QuestManager` (5.9KB) — quest tracking, objective evaluation
  - `SkillManager` (2.7KB) — skill progression and unlock
  - `InventoryManager` (7.3KB) — item management and loot
  - `PartyManager` (4.4KB) — party formation and shared rewards
  - `DialogueManager` (3.2KB) — NPC dialogue trees
  - `PersistenceManager` (3.3KB) — DB-backed game state persistence
  - `EntityManager` — entity lifecycle base
- **Key directory**: `src/server/`

### MMO Game Client — Browser
- Babylon.js 2.5D orthographic renderer (`GameCanvasBabylon.tsx` — 33KB)
- 4-directional sprite animation, tilemap rendering, collision detection, camera tracking
- Floating health bars, damage numbers, combat feedback
- **Pre-game flow**: Title screen → Login → Server Select → Character Select/Create
- **In-game UI system**: Hotbar, Minimap radar, Party UI, RPG stats, Inventory, Skills, Crafting, Quest log, Quest tracker, Dex, Equipment, GTC shop overlay, Shop overlay, Achievements overlay, Dialogue overlay, Battle overlay (turn-based)
- **Multi-channel chat**: Public, Global, Clan/Party, Friends (`GameChat.tsx`)
- **Mobile**: Full-screen launcher (`MobileGameLauncher.tsx`), D-Pad, multi-action touch pad
- **Key directory**: `src/web/components/the-lobby/`

### Game Asset Pipeline
- `GameAsset` Prisma model with full metadata (type, source, tags, categories, atlas mapping)
- Tuxemon batch import scripts in `scripts/` (14 import/export/migration scripts)
- Campaign map seed dump: `scripts/data/campaign-maps.generated.ts` (~12MB, scripts only — not app-bundled)
- App stub: `src/web/components/the-lobby/data/campaign-maps.ts` (empty exports)
- `WorldMap` DB model — maps stored as JSON strings (grid, gates, npcs, encounters, tile layers, tilesets)
- Migration script: `scripts/migrate-campaign-maps-to-db.ts` (upserts WorldMap + GameMap mirror)
- **Key directory**: `scripts/`, `src/web/components/the-lobby/data/`

### Saints Studio (In-Game Editor)
- Draggable panel system inside the game UI, loaded only in Studio mode
- Panels: World Builder, NPC Editor, Asset Browser, Class Editor, Sprite Browser (12KB), Game Config Editor
- `StarterHeroEditorPanel.tsx` (49KB) — full hero archetype management with archetype presets, random generator, JSON import/export, live validation
- `ServerControl.tsx` — start/stop dev MMO server from Studio with live player metrics
- **Key directory**: `src/web/components/the-lobby/editor/`

### FiveM / UCP Integration
- Complete FiveM character schema: Characters, Vehicles, Properties, Inventory, BankTransactions, Factions, Gangs
- UCP pages: Dashboard, Characters, Banking, Analytics, Garage, Social, Settings, Register
- FiveM status API: `/api/fivem/status/`, `/api/fivem/characters/`
- XP level-up silently deposits bank rewards to all linked FiveM characters
- **Key directory**: `app/(ucp)/`, `app/api/fivem/`

### Realtime Platform — Milestone 1
- `RealtimeService.ts` — Zod-validated event bus, CRITICAL persistence, circuit breaker, admin force-disconnect, metrics
- Users join private `user:{id}` room on socket connect
- `useRealtimeStore` Zustand client store — notifications, unread count, dedup cache
- `RealtimeProvider.tsx` — persistent socket, auto-reconnect, `/api/realtime/sync` catch-up
- `/api/internal/events` — `Bearer <SAINTS_INTERNAL_SECRET>` ingestion for FiveM, Discord, launcher
- Notifications: 30s polling **replaced** by instant WebSocket push
- **Key files**: `src/server/realtime/`, `src/shared/events/`, `src/web/components/realtime/`, `src/web/hooks/useRealtimeStore.ts`

### Stream Integration
- Twitch/YouTube/Kick stream profiles, cron-based live check, stream gallery
- **Key files**: `app/(main)/streams/`, `app/api/cron/check-streams/`

### Modpacks
- Full modpack listings with categories, download counts, slugs, cover art, external links
- Admin create/edit/order/publish interface
- **Key files**: `app/(main)/modpacks/`, `app/(main)/admin/modpacks/`

---

## Partial Systems 🟡

### Realtime Platform — Milestones 2–5
- **Status**: Infrastructure done; feature wiring incomplete
- `chat.message.created` — schema registered, never emitted
- `presence.updated` — schema registered, never emitted on MMO connect/disconnect
- `forum.reply.created` — schema registered, never emitted from thread view
- Admin Realtime Dashboard (`/admin/realtime`) — planned, not created
- **Work needed**: Wire each event to its producer; build admin dashboard

### Achievements System
- `UserAchievement` model exists, profile display works
- Achievement definitions are hardcoded constants, not DB-driven
- No automated unlock triggers wired to game actions or social events
- **Key files**: `app/(main)/admin/achievements/`, `app/actions/achievements.ts`, `src/web/lib/achievements.ts`

### Leaderboards
- Forum thread count and XP leaderboards exist
- Missing: per-game leaderboards, creature collection, GTC trading
- **Key files**: `app/(main)/forum/leaderboard/`, `app/(main)/leaderboards/`

### Game Server Status Dashboard
- FiveM server status works (GameDig)
- MMO player count works via live `PlayerManager`
- No live admin metrics dashboard
- **Key files**: `app/(main)/status/`, `app/api/servers/`

### Discord Bot Integration
- Discord OAuth is fully implemented (`discord.ts` token lifecycle)
- Webhook dispatcher is implemented and tested
- `/api/discord/` directory exists but is **empty**
- No bot command handler, no role sync, no community events bridge
- The `/api/internal/events` API is ready to receive Discord bot events when built

### AI Features
- **Live**: `/api/ai/enhance` (grammar fix + text polish using Gemini 2.5 Flash streaming) — used in news and forum editors
- **Not built**: AI-powered content recommendations, game event generation, character backstory generator, chat moderation assist
- `GEMINI_API_KEY` env variable is the activation gate

### RSS Feed
- Fetch cron and admin management exist
- Missing: dedup protection, per-source error isolation, retry backoff
- **Key files**: `app/(main)/gaming-news/`, `app/api/cron/fetch-rss/`

---

## Broken Connections 🔴

### Notification Emitters Without Realtime Push

The following code paths create `Notification` DB rows but **never call `RealtimeService`**. Users don't see instant bell updates from these actions.

| File | Action | Line(s) |
| :--- | :--- | :--- |
| `app/actions/social.ts` | Follow, tip, mention notifications | ~393, 497, 748 |
| `app/api/forum/replies/route.ts` | Thread subscriber notifications | ~96–125 |
| `app/(main)/support/actions.ts` | Ticket reply notifications | ~96 |

**Fix pattern** (see `app/api/forum/reply/route.ts` for reference implementation):
```typescript
const notification = await prisma.notification.create({ data: {...} });
try {
  const { getRealtimeService } = await import("@/../../server");
  const realtime = getRealtimeService();
  if (realtime) {
    await realtime.emitToUser(targetUserId, "notification.created", {
      notificationId: notification.id,
      userId: targetUserId,
      type: notification.type,
      message: notification.message,
      link: notification.link,
    });
  }
} catch { /* non-fatal */ }
```

### Messenger Has No Live Push
- `app/actions/messenger.ts` is request/response only
- `chat.message.created` event is registered in the registry but never emitted
- Users must manually refresh to see new messages
- **Fix**: Add `realtime.emitToUser(toUserId, "chat.message.created", {...})` in the send message action

### MMO Presence Not Bridged to Website
- `SocketHandler.ts` connection/disconnect handlers never emit `presence.updated` to the website bus
- Website has no awareness of who is online in-game
- **Fix**: In `SocketHandler.ts` `connection` and `disconnect` handlers, call `this.realtime.emitToUser(accountId, "presence.updated", { userId, status, lastSeen })`

### Forum Thread View Has No Live Reply Stream
- `forum.reply.created` event registered but never emitted or consumed
- Viewers of a thread must reload to see new replies
- **Fix**: Emit `forum.reply.created` in `app/api/forum/reply/route.ts` after creating a reply, and consume in thread view component

---

## Technical Debt

| Item | Severity | Description |
| :--- | :--- | :--- |
| 3 notification emitters without realtime push | **High** | Social.ts, forum replies route, support actions — creates DB rows but no live update |
| No spatial partitioning in MMO | **High** | Server broadcasts all entities to all clients — doesn't scale past ~30 simultaneous players |
| No binary message packing | **Medium** | JSON over WebSocket — Protocol Buffers or ArrayBuffer would cut bandwidth 80% |
| No Redis socket adapter | **Low/Infra** | Single-node only; needed before multi-PM2 or multi-server scaling |
| `GameCanvasBabylon.tsx` is 33KB | **Medium** | Monolithic renderer file — high cognitive load for AI; candidate for modular split |
| `social.ts` is 969 lines | **Medium** | Should be split by domain (posts, friends, reactions, subscriptions) |
| `StarterHeroEditorPanel.tsx` is 49KB | **Low** | Works well but huge; hardest file for AI to work in safely |
| Campaign map dump size | **Low** | Resolved in v2.1.100 — seed lives under `scripts/data/`; runtime loads `WorldMap` via `/api/maps` |
| Achievement unlocks not automated | **Medium** | Achievements exist but are never awarded by game or social events |
| `docs/TODO.md` is stale at v2.1.62 | **Low** | Not updated since v2.1.62; `/info/PROJECT_REPORT.md` supersedes it |
| `legacy/` and `scratch/` in repo | **Low** | Should be audited and removed or `.gitignore`d |
| Upload system is local-only | **Medium** | `upload.ts` notes S3 swap; no CDN = file loss on server rebuild |
| Email from domain is a placeholder | **Low** | `FROM_EMAIL` in `email.ts` uses `saintsgaming.net` — must be verified with Resend |
| Minimal automated test coverage | **High** | Only `combat.test.ts` and `store.test.ts` exist; no API or integration tests |

---

## Recommended Development Order

### Immediate — Realtime Milestone 2 (Wiring)
1. Wire missing notification emits: `social.ts`, `forum/replies/route.ts`, `support/actions.ts` — use the existing pattern from `forum/reply/route.ts`
2. Wire `presence.updated` on MMO connect/disconnect in `SocketHandler.ts`
3. Wire `chat.message.created` in `messenger.ts` for instant DM delivery
4. Consume `presence.updated` in FriendsList component for online indicators
5. Build Admin Realtime Dashboard at `app/(main)/admin/realtime/page.tsx`

### Near-Term — /info Documentation (Milestone 3)
6. Write `info/` docs for: frontend, backend, database, auth, forum, social, game, admin, ucp
7. Retire `docs/TODO.md` (point it to `/info/`)

### Medium-Term — MMO Scaling (Milestone 4)
8. Spatial partitioning — zone-based entity broadcasting (only send players who are in the same map zone)
9. Binary packing — replace JSON with ArrayBuffer for movement events
10. Redis socket adapter for multi-instance deployment

### Long-Term — Ecosystem Expansion (Milestones 5–6)
11. Discord bot → `/api/internal/events` bridge (role sync, event notifications, community webhooks)
12. Achievement unlock automation from game events and social actions
13. ~~FiveM server → `/api/internal/events` bridge for character events and game stats~~ **Done (v2.1.101)** — domain actions via `/api/fivem/events`; raw bus still `/api/internal/events`
14. AI content recommendations, game event generation, chat moderation assist
15. ~~Finish campaign map migration from `campaign-maps.ts` → `WorldMap` DB model~~ **Done (v2.1.100)**
16. S3/CDN migration for uploaded files

---

## Cursor / AI Migration Notes

### Where Development Should Resume

See `info/CONTINUE.md`. Next optional work: S3/CDN for uploads, then AOI soak / database docs.

### Files That Matter Most (Priority Order)

| File | Size | Why It Matters |
| :--- | :--- | :--- |
| `server.ts` | 3.9KB | Entire server entry — game engine init + RealtimeService init + socket.io |
| `src/server/realtime/RealtimeService.ts` | — | All socket broadcasts route through here |
| `src/shared/events/registry.ts` | — | Must check before adding any realtime event |
| `src/server/SocketHandler.ts` | 8.9KB | MMO socket lifecycle — presence bridge missing here |
| `prisma/schema.prisma` | 54KB | Database schema — read before any model changes |
| `app/actions/social.ts` | 28KB | All social platform logic — notifications missing realtime push |
| `src/web/components/the-lobby/store.ts` | 29KB | Client game Zustand store — coupled with game loop |
| `src/web/components/the-lobby/index.tsx` | 28KB | MMO client root — touches game engine, chat, UI overlays |
| `src/web/lib/permissions.ts` | 4.7KB | Permission constants and helpers — always import from here |
| `src/web/lib/xp.ts` | 3.8KB | XP system — already handles FiveM rewards, do not duplicate |
| `app/(main)/layout.tsx` | 2.4KB | Main layout — wraps all pages with Auth + Realtime + Messenger |

### Systems That Must Not Be Touched Without Full Context

> [!CAUTION]
> These systems are complex, battle-tested, and tightly coupled. Always read their docs and the `AGENTS.md` rules before modifying.

| System | Risk | Reason |
| :--- | :--- | :--- |
| `GameCanvasBabylon.tsx` | 🔴 Critical | Sprite atlas texture coordinates are fragile. Wrong vOffset breaks all character sprites for all users. |
| `SocketHandler.ts` (MMO events) | 🔴 Critical | Changing MMO event names breaks the live game client immediately. |
| `auth.ts` / `auth.config.ts` | 🔴 Critical | A broken auth config locks all users out of the platform. |
| `src/web/lib/upload.ts` | 🟠 High | Changing MIME validation or paths could break uploads platform-wide. |
| `src/web/lib/xp.ts` | 🟠 High | Already handles FiveM rewards and tier promotion. Duplicating or modifying breaks the economy. |
| `src/web/components/the-lobby/store.ts` | 🟠 High | Deeply coupled with the game loop. React state mistakes cause re-render storms. |
| `prisma/schema.prisma` | 🟠 High | Field removal breaks existing queries. Always migrate, never delete and recreate. |
| `src/shared/events/registry.ts` | 🟡 Medium | New unregistered events bypass Zod validation. Always add here first. |

### What Context an AI Needs Before Starting

**Read these files in order before any session:**
1. `info/AI_DEVELOPMENT_RULES.md` — constraints and existing solutions table
2. `info/PROJECT_REPORT.md` (this file) — what exists and what is missing
3. `info/realtime/ARCHITECTURE.md` — if touching anything socket/realtime
4. `info/realtime/EVENTS.md` — if adding a new realtime event
5. `CHANGELOG.md` (last 15 entries) — recent patterns and decisions

### Environment Variables Required

| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | Prisma DB connection (SQLite file path or MariaDB URL) |
| `NEXTAUTH_SECRET` | NextAuth session signing key |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Discord OAuth |
| `RESEND_API_KEY` | Email delivery (optional — gracefully degraded) |
| `GEMINI_API_KEY` | AI text enhancement (optional — returns 500 if missing) |
| `SAINTS_INTERNAL_SECRET` | Bearer token for `/api/internal/events` |
| `NEXT_PUBLIC_SITE_URL` | Used in email links and social meta |

### Deployment Notes
- Dev: `npm run dev` (runs Next.js only) or `npx ts-node server.ts` (runs full server with game engine + socket.io)
- Prod: Docker via `docker-compose.yml` + `Caddy` reverse proxy
- Database migration (SQLite → MariaDB): Done via admin UI at `/admin/dev/database`, **not** manually
- PM2 config: `ecosystem.config.js` for process management
- Scripts for deploy: `scripts/setup.sh` (initial), `scripts/update.sh` (updates)
