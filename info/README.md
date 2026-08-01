# Saints Gaming — /info/ Knowledge Base

This directory is the authoritative internal knowledge base for Saints Gaming Web.

**Read this first. Read the rules second. Then read the system-specific docs you need.**

---

## Start Here

| Document | Purpose |
| :--- | :--- |
| [PROJECT_REPORT.md](./PROJECT_REPORT.md) | Full project overview, completed systems, broken connections, tech debt, and dev order |
| [AI_DEVELOPMENT_RULES.md](./AI_DEVELOPMENT_RULES.md) | Mandatory rules for all AI assistants before modifying any code |

---

## System Documentation

| Directory | Status | Contents |
| :--- | :--- | :--- |
| [realtime/](./realtime/) | 🟡 Partial | Realtime Platform architecture and event catalog |
| frontend/ | 🔴 Planned | Component architecture, design system, routing |
| backend/ | 🔴 Planned | API routes, server actions, auth flows |
| database/ | 🔴 Planned | Schema overview, model relationships, migration guide |
| game/ | 🔴 Planned | MMO engine, game loop, client architecture |
| social/ | 🔴 Planned | Social feed, messenger, friends, subscriptions |
| admin/ | 🔴 Planned | Admin panel features and access control |

---

## Quick Reference

### Version
`2.1.95` — Realtime Platform Milestone 1

### Key Entry Points
- `server.ts` — Node.js server (game engine + socket.io + Next.js)
- `app/(main)/layout.tsx` — Main web layout
- `app/(main)/lobby/page.tsx` — MMO game client entry
- `prisma/schema.prisma` — Database schema
- `src/server/realtime/RealtimeService.ts` — Realtime event bus

### Realtime Events
See [realtime/EVENTS.md](./realtime/EVENTS.md) — always check before adding a new event.

### Before Making Changes
Read [AI_DEVELOPMENT_RULES.md](./AI_DEVELOPMENT_RULES.md).
