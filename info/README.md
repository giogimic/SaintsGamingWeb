# Saints Gaming — /info/ Knowledge Base

This directory is the authoritative internal knowledge base for Saints Gaming Web.
A new developer should be able to open this project, read `/info`, and understand everything needed to continue development safely.

**Read order: PROJECT_REPORT → DEVELOPMENT_RULES → system-specific docs**

---

## Start Here

| Document | Purpose |
| :--- | :--- |
| [CONTINUE.md](./CONTINUE.md) | **Current task pointer** — start every session here |
| [PROJECT_REPORT.md](./PROJECT_REPORT.md) | Full project audit — what exists, gaps, debt |
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Mandatory coding rules — existing solutions, prohibitions |

---

## System Documentation

| Directory | Status | Contents |
| :--- | :--- | :--- |
| [frontend/](./frontend/) | 🟢 | Layouts, theming, routes (`OVERVIEW.md`, `ROUTES.md`) |
| [backend/](./backend/) | 🟢 | `server.ts`, APIs, actions (`OVERVIEW.md`, `API_CATALOG.md`) |
| [auth/](./auth/) | 🟢 | NextAuth, sessions, permissions (`OVERVIEW.md`) |
| [social/](./social/) | 🟢 | Feed, messenger (`OVERVIEW.md`, `ACTIONS.md`) |
| [admin/](./admin/) | 🟢 | Staff console (`OVERVIEW.md`, `PERMISSIONS.md`) |
| [game/](./game/) | 🟢 | MMO lobby (`OVERVIEW.md`, `SOCKETS.md`) |
| [forum/](./forum/) | 🟢 | Boards + text enhance (`OVERVIEW.md`, `TEXT_ENHANCE.md`) |
| [realtime/](./realtime/) | 🟢 | Bus architecture + event catalog |
| [database/](./database/) | 🟢 | WorldMap ops (`WORLDMAP.md`) |
| [uploads/](./uploads/) | 🟢 | Local (+ optional S3 later) (`STORAGE.md`) |
| [ops/](./ops/) | 🟢 | Staging smoke checklist (`STAGING_SMOKE.md`) |
| [discord/](./discord/) | 🟡 Back-line | Bot bridge (`BRIDGE.md`) |
| [fivem/](./fivem/) | 🟡 Back-burner | Bridge exists; UCP + plugin work deferred |

---

## Quick Reference

### Current Version
`2.1.111` — Staging smoke script + production build fixes (social barrel, achievements split)

### Key Entry Points
| File | Role |
| :--- | :--- |
| `server.ts` | Node.js server: game engine + socket.io + Next.js |
| `app/(main)/layout.tsx` | Main web layout (Auth + Realtime + Messenger) |
| `app/(main)/lobby/page.tsx` | MMO game client entry |
| `prisma/schema.prisma` | Database schema — read before model changes |
| `src/server/realtime/RealtimeService.ts` | All realtime broadcasts |
| `src/shared/events/registry.ts` | Zod event registry — check before new events |
| `src/web/lib/permissions.ts` | Permission constants |
| `src/web/lib/xp.ts` | XP + leveling |
| `src/web/lib/upload.ts` | All file upload logic |

### What NOT to Rebuild
See [DEVELOPMENT_RULES.md § Identify Existing Solutions](./DEVELOPMENT_RULES.md).

### Realtime Events
See [realtime/EVENTS.md](./realtime/EVENTS.md) — **always check before adding a new event**.

### Before Making Changes
Read [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md).
