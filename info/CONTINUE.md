# CONTINUE HERE — AI / Dev Handoff

**Last updated:** 2026-08-01  
**Point every new agent session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Realtime Milestones 1–3 landed (v2.1.97). Next: MMO scaling / ecosystem bridges.**

### Done

- **M1**: Realtime bus, Zod registry, reconnect sync, notification infra
- **M2 (v2.1.96)**: notification/presence/chat/forum wiring + admin realtime dashboard
- **M3 (v2.1.97)**: `game.player.online` / `game.player.offline` coarse bridge + ServerStatusCard consumers
- Smoke: `npx tsx server.ts` boots; `/api/game/server-status` online; registry validates both game events

### Next concrete steps (in order)

1. Optional deeper smoke with two authenticated clients (join_map → live player count)
2. **Milestone 4 — MMO scaling**: spatial partitioning (zone broadcast), binary packing for movement, Redis socket adapter for multi-instance
3. Discord bot → `/api/internal/events` bridge
4. Achievement unlock automation from game/social events
5. Finish campaign map migration `campaign-maps.ts` → `WorldMap` DB

---

## Mandatory Read Order (before coding)

1. **This file** — current task
2. `info/AI_DEVELOPMENT_RULES.md` — constraints + existing solutions
3. `info/PROJECT_REPORT.md` — what exists / broken / order
4. If realtime: `info/realtime/ARCHITECTURE.md` then `info/realtime/EVENTS.md`
5. `/logs/LOCAL_CHANGELOG.md` — recent local work notes

---

## Rules Snapshot (non-negotiable)

- Realtime: `RealtimeService.publishEvent()` / `emitToUser()` / `emitGlobal()` only — never raw `io.emit()` from API routes
- Prefer `src/web/lib/realtime-emit.ts` helpers from server actions / API routes
- MMO → website: only via `ecosystemBroadcast` → SocketHandler bridge (coarse events)
- Client realtime state: `useRealtimeStore` only — never `socket.on()` in page components
- New events: register in `src/shared/events/registry.ts` + update `info/realtime/EVENTS.md`
- MMO ticks stay in MMO — website bus gets coarse ecosystem events only
