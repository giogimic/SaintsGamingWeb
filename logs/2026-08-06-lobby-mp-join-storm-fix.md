# Lobby MP — join-storm / peer wipe fix (2026-08-06)

**Branch:** `giogimic/lobby-mp-visibility-fix-2d3d`  
**Focus:** Game `/lobby` multiplayer only (aligned with CONTINUE / LOBBY_VERIFY)

## Problem

Socket smoke (`smoke-lobby-mp`) could PASS while real `/lobby` browsers still looked alone.

Root cause: the UI emits `join_map` up to 3× (character load + socket `connect` + late-join effect). Each hard rejoin did `player_left` + leave rooms + new entity, racing `map_players` empties that wiped `otherPlayers`.

## Fixes

| Change | Where |
| :--- | :--- |
| Soft rejoin same socket on public lobby shard (no `player_left`) | `PlayerManager.refreshLobbySeat` |
| Coalesce late `join_map` when already on `*_chN` | `lobbyJoin.ts` + `index.tsx` |
| Empty `map_players` does not wipe peers on a live public shard | `shouldReplacePeerSnapshot` |
| Peer spawn coords use `??` (tile 0 safe) | `store.ts` |
| Smoke asserts soft rejoin does not `player_left` | `scripts/smoke-lobby-mp.ts` |

## Verify

```bash
npx vitest run src/shared/game/lobbyJoin.test.ts src/shared/net/mapIds.test.ts src/shared/game/lobbyReconnect.test.ts
npm run dev
npx tsx scripts/smoke-lobby-mp.ts
```

Manual (two accounts, `/lobby` only — not `/studio`):

1. DevTools: both `map_joined.instanceId` = same `DEMO_SANDBOX_chN`
2. Mutual sprites + movement + chat bubble
3. Staff nearby list shows the other player

## Out of scope

Studio private/PIE isolation (by design peers do not share shards there).
