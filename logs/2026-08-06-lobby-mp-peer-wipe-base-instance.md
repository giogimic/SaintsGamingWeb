# Lobby MP — peer wipe while instanceId is base map (2026-08-06)

**Branch:** `giogimic/lobby-mp-peer-render-fix-2d3d`  
**Follow-up to:** #38 join-storm soft rejoin (still alone after merge)

## What users saw

Two real `/lobby` browsers still could not see each other after #38. Socket smokes kept passing.

## Root cause

Character load set `instanceId: 'DEMO_SANDBOX'` (base id) before `map_joined` delivered `DEMO_SANDBOX_chN`.

#38’s empty-`map_players` guard only kept peers when `isPublicChannelInstanceId(instanceId)`. While still on the base id, empty snapshots **wiped** `otherPlayers`. Server also emitted `map_players` *before* `map_joined`, so the client applied snapshots before the shard id armed the guard.

Secondary: `setMapData(null)` during same-base reloads disposed Babylon with no replacement engine → sprites gone even if the store still had peers.

## Fixes

| Change | Where |
| :--- | :--- |
| Character load sets `instanceId: ''` + clears peers for a fresh seat | `index.tsx` |
| Lobby empty-snapshot guard uses `lobbySeat: !enableStudio` | `lobbyJoin.ts` |
| Emit `map_joined` **before** `map_players` | `PlayerManager` |
| Keep prior `mapData` while refetching same base map | `GameCanvasBabylon` |
| Peer/local world math uses live engine map dims | `BabylonEngine.getMapWidth/Height` |
| Toast “X is nearby” on `player_joined` (lobby) | `index.tsx` |

## Verify

```bash
npx vitest run src/shared/game/lobbyJoin.test.ts
npx tsx scripts/smoke-lobby-mp.ts
npx tsx scripts/smoke-lobby-mp-ui-storm.ts
```

Manual (two **different** accounts on `/lobby` only):

1. Both enter world → toast “\<name\> is nearby” when the other joins  
2. Matching `map_joined.instanceId` (`DEMO_SANDBOX_chN`)  
3. Mutual sprites + movement  

If you see the toast but no sprite → render path; if no toast → still not on the same public seat.
