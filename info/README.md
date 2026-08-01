# Saints Gaming — /info/ Knowledge Base

This directory is the authoritative internal knowledge base for Saints Gaming Web.
A new developer or AI assistant should be able to open this project, read `/info`, and understand everything needed to continue development safely.

**Read order: PROJECT_REPORT → AI_DEVELOPMENT_RULES → system-specific docs**

---

## Start Here

| Document | Purpose |
| :--- | :--- |
| [PROJECT_REPORT.md](./PROJECT_REPORT.md) | **Full project audit** — what exists, what is missing, broken connections, tech debt, and dev order |
| [AI_DEVELOPMENT_RULES.md](./AI_DEVELOPMENT_RULES.md) | **Mandatory AI rules** — existing solutions table, prohibited actions, per-system constraints |

---

## System Documentation

| Directory | Status | Contents |
| :--- | :--- | :--- |
| [realtime/](./realtime/) | 🟢 M1–M4 live | Architecture diagram, event catalog, connection map |
| [discord/](./discord/) | 🟢 Bridge live | Bot ingestion contract (`BRIDGE.md`) |
| frontend/ | 🔴 Planned | Component architecture, design tokens, routing guide |
| backend/ | 🔴 Planned | API routes catalog, server actions, auth flows |
| database/ | 🔴 Planned | Schema overview, model relationships, migration guide |
| game/ | 🔴 Planned | MMO engine, game loop, Babylon.js client architecture |
| social/ | 🔴 Planned | Social feed, messenger, friends, subscriptions, XP |
| admin/ | 🔴 Planned | Admin panel features, access control, dev tools |

---

## Quick Reference

### Current Version
`2.1.100` — Campaign maps migrated to WorldMap DB (on top of Discord bridge + realtime M1–M4)

### Key Entry Points
| File | Role |
| :--- | :--- |
| `server.ts` | Node.js server: game engine + socket.io + Next.js |
| `app/(main)/layout.tsx` | Main web layout (wraps Auth + Realtime + Messenger) |
| `app/(main)/lobby/page.tsx` | MMO game client entry point |
| `prisma/schema.prisma` | Database schema — read before model changes |
| `src/server/realtime/RealtimeService.ts` | All realtime broadcasts route through here |
| `src/shared/events/registry.ts` | Zod event registry — check before new events |
| `src/web/lib/permissions.ts` | Permission constants — always import from here |
| `src/web/lib/xp.ts` | XP + leveling + FiveM reward system |
| `src/web/lib/upload.ts` | All file upload logic (avatar, forum, social, modpacks) |

### What NOT to Rebuild (Already Exists)
See the full table in [AI_DEVELOPMENT_RULES.md § Identify Existing Solutions](./AI_DEVELOPMENT_RULES.md).

### Realtime Events
See [realtime/EVENTS.md](./realtime/EVENTS.md) — **always check before adding a new event**.

### Before Making Changes
Read [AI_DEVELOPMENT_RULES.md](./AI_DEVELOPMENT_RULES.md).
