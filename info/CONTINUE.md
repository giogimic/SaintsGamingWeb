# CONTINUE HERE — AI / Dev Handoff

**Last updated:** 2026-08-01  
**Point every new agent session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Realtime M1–M3 + MMO Scaling M4 landed (v2.1.98). Next: ecosystem bridges.**

### Done

- **M1–M3**: Realtime bus + site wiring + coarse `game.player.online/offline`
- **M4 (v2.1.98)**: AOI zone interest management, binary movement codec, optional Redis adapter
  - `InterestManager` → `aoi:{map}:{zx}:{zy}` rooms, 3×3 neighbor broadcasts
  - `src/shared/net/movementCodec.ts` + vitest round-trip
  - `attachRedisAdapter(io)` when `REDIS_URL` / `REDIS_HOST` set
  - Client `player_moved` accepts binary or JSON

### Next concrete steps (in order)

1. Discord bot → `/api/internal/events` bridge (role sync / community events)
2. Achievement unlock automation from game/social events
3. Finish campaign map migration `campaign-maps.ts` → `WorldMap` DB
4. Optional: deeper multi-client AOI soak test; S3/CDN for uploads

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
