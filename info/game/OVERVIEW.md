# Game / MMO Overview

Two game surfaces exist — do not confuse them:

1. **MMO lobby** — multiplayer, authoritative server (`/lobby`)
2. **Single-player / engine prototype** — `app/game` + `src/engine/` (separate from MMO tick)

---

## MMO lobby (primary)

| Layer | Path |
| :--- | :--- |
| Page | `app/(main)/lobby/page.tsx` |
| Client root | `src/web/components/the-lobby/index.tsx` |
| Dynamic load | `src/web/components/the-lobby/dynamic.tsx` |
| Client store | `src/web/components/the-lobby/store.ts` |
| Babylon canvas | `src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx` |
| Server clock | `src/server/GameEngine.ts` (~20 TPS sim / ~10 TPS net) |
| Sockets | `src/server/SocketHandler.ts` |
| Managers | `src/server/*Manager.ts` (Player, Combat, Creature, …) |
| Process wiring | `server.ts` |

Legacy terminal URL redirects to `/lobby`.

---

## Networking & scaling

- Interest / AOI: `src/server/net/InterestManager.ts` (zone rooms)
- Binary movement: `src/shared/net/movementCodec.ts`
- Optional Redis adapter: `src/server/net/redisAdapter.ts`
- Coarse website events: `game.player.online` / `offline` via RealtimeService  
  Details: [`../realtime/ARCHITECTURE.md`](../realtime/ARCHITECTURE.md) · [`../realtime/EVENTS.md`](../realtime/EVENTS.md)

High-frequency movement/combat stays on the game socket — **not** the website event bus.

---

## Maps

- Runtime source of truth: Prisma `WorldMap` via `/api/maps`  
- Ops: [`../database/WORLDMAP.md`](../database/WORLDMAP.md)
- Server collision loader: `src/engine/map-loader.js` (prefers WorldMap)
- Client lazy load: `src/web/components/the-lobby/data/maps.ts` (`loadMap` / `listMaps`)

---

## Studio / admin game tools

- Actions: `app/actions/game.ts`, `game-admin.ts`, `game-dev.ts`
- Admin: `/admin/game`, `/admin/game-dev/*`, `/admin/dev/lobby`
- In-game studio panels under `src/web/components/the-lobby/editor/`

---

## Single-player engine (secondary)

- Page: `app/game/page.tsx`
- Client engine: `src/engine/engine.ts` (+ UI under `src/engine/`)
- Not the same class as `src/server/GameEngine.ts`

---

## Sockets & managers

Inbound events + manager map: [`SOCKETS.md`](./SOCKETS.md).

## Rules

1. Do not add a second game loop / `setInterval` tick — extend `GameEngine`.
2. Treat `GameCanvasBabylon.tsx` atlas/`vOffset` changes as high risk.
3. Register new coarse ecosystem events before emitting to the website bus.
4. FiveM UCP / bridges are **back-line** — see `info/fivem/` only when needed.
