# Lobby MP reconnect + map_reloaded harden (2026-08-05)

**Branch:** `giogimic/lobby-mp-reconnect-harden-2d3d`  
**Focus:** Game lobby multiplayer only

## Problems

1. Soft disconnect wiped `otherPlayers` → empty world until `map_players` after reconnect.
2. `map_reloaded` was a **global** `io.emit` and client always `setActiveMapData(newObj)` → Babylon remount / black flash for every connected client, including peers not on that map.

## Fixes

| Change | Where |
| :--- | :--- |
| Soft disconnect keeps peers; server kick clears | `shouldClearPeersOnDisconnect` + `index.tsx` |
| `map_reloaded` only to shard rooms of that base map | `WorldManager.broadcastMapReloaded` |
| Client ignores other maps / dirty Studio paint | `shouldApplyMapReload` |
| Hot-merge into live doc + remesh event (no remount) | `mergeMapDocumentInPlace` + `STUDIO_MAP_HOT_RELOAD_EVENT` |
| Canvas remeshes via existing engine | `GameCanvasBabylon` |

## Verify

```bash
npx vitest run src/shared/game/lobbyReconnect.test.ts
```

Manual (two `/lobby` browsers):

1. Both on same `DEMO_SANDBOX_chN` — mutual sprites + move + chat.
2. Throttle/offline ~5s on one client → reconnect toast → peers still visible (or back via `map_players` without stuck empty).
3. Studio Save DEMO while lobby peers play → peers stay; no full black remount (hot remesh toast OK).

## Status

P0–P5 on main; this is P6 lobby MP harden.
