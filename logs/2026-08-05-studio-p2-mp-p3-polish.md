# P2 — Lobby multiplayer + P3 polish (2026-08-05)

**Branch:** `giogimic/studio-p0-demo-depth-paint-2d3d`  
**Plan:** `logs/2026-08-05-studio-game-priority-plan.md`

## P2 — Multiplayer root cause

Public `joinMap` treated any non-`_acc` instance as public. Studio private rooms (`MAP_<accountId>`) and PIE (`studio_pie_*`) store `mapId: DEMO_SANDBOX`, so lobby players could land on leftover private/PIE rooms and never see each other.

AOI is **not** the DEMO blocker (30×30 / zone 16 → all peers adjacent).

## P2 fixes

| Change | Where |
| :--- | :--- |
| Public shards = `_chN` only (`isPublicChannelInstanceId`) | `mapIds.ts` + `WorldManager.joinMap` |
| `pickPublicShardAssignment` extracted (testable) | `mapIds.ts` → `WorldManager` |
| GC empty private/PIE instances on leave | `WorldManager.leaveInstance` |
| Party force-join only onto public channels | `canPartyForceJoinInstance` + `PlayerManager` |
| Studio gate warps pass `isPrivate` / `pie` | `GameCanvasBabylon` |
| Connect `join_map` only when in-world (EXPLORING/BATTLE) | `the-lobby/index.tsx` |
| Peer coords use `??` (tile 0,0 safe) | `GameCanvasBabylon` |
| Dev `console.debug` for `map_joined` / `map_players` | `index.tsx` |

## P3 polish

| Change | Where |
| :--- | :--- |
| Layer switch resets logic↔visual brush confusion | `editor-store.setActiveLayerIdx` |
| Erase (GID 0) covers batched art with void plate | `BabylonEngine.updateSingleTile` |
| Erase + Grass quick brushes in World Builder | `WorldBuilderPanel` |
| Mode labels already canonical (Paint/Populate/…) | no change — already in `studioModes.ts` |
| Definition undo stack (snapshot ops) | `definitionOps.ts` + editor-store + Quest catalog |
| Catalog undo/redo chrome | `CatalogEditorShell` |
| PIE options (pause spawners / god mode) | `pieOptions.ts` + Playtest chip + `suppressGameplay` |

### Definition undo (v1)

- Separate stack from map paint (`definitionOpStack`).
- Quest editor records snapshots on field **blur** and discrete structural edits (+ stage).
- Undo/Redo buttons restore the form for the active `quest:{slug}` key only (top-of-stack must match).

### PIE options (v1)

- Defaults: isolate shard on, pause spawners on, god mode off, pause world events on (reserved).
- Playtest chip toggles pause spawners / god mode.
- Studio Playtest: `shouldPieSuppressEncounters` soft-gates step encounters (same `suppressGameplay` path as editor).

## Verify

```bash
npx vitest run src/shared/net/mapIds.test.ts \
  src/shared/game/definitionOps.test.ts \
  src/shared/game/pieOptions.test.ts
```

Manual MP (two browsers, `/lobby` only):

1. Both load characters into DEMO.
2. DevTools: both `map_joined.instanceId` match `DEMO_SANDBOX_chN` (same N).
3. Both see each other’s sprites + movement + chat bubble.

Manual P3:

1. `/studio` → Script → Quest → edit title → blur → Undo restores.
2. Playtest chip → toggle Pause spawners / God mode; walk wild tiles; encounters respect toggles.

## Status

| Phase | Status |
| :--- | :--- |
| P0 | Verified |
| P1 | Code landed (manual create/save smoke nice-to-have) |
| P2 | Code + unit tests; manual two-browser `/lobby` smoke open |
| P3 | Brush/erase + definition undo + PIE options landed |
