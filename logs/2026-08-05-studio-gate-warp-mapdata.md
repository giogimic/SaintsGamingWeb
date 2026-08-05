# Studio gate warp — sync map document (2026-08-05)

**Branch:** `giogimic/studio-gate-warp-mapdata-2d3d`  
**Focus:** Game / Studio multi-map play only (not site)

## Bug

Gate / Playtest warps only did `setState({ currentMapId })` and left `activeMapData` on the previous map (usually DEMO). The canvas prefers any non-null `activeMapData`, so visuals + collision + Save stayed on the old document while `join_map` moved the shard.

World Builder warp already set `{ currentMapId, activeMapData }` correctly.

## Fix

| Change | Where |
| :--- | :--- |
| `mapDocMatchesId` / `shouldKeepActiveMapData` | `src/shared/game/mapSwitch.ts` |
| Gate `finishWarp` loads destination then sets both ids | `GameCanvasBabylon.tsx` |
| Canvas keeps `activeMapData` only when it matches `currentMapId` | `GameCanvasBabylon.tsx` |
| `map_joined` refreshes when doc missing/stale on same base | `the-lobby/index.tsx` |

## Verify

```bash
npx vitest run src/shared/game/mapSwitch.test.ts
```

Manual (`/studio`):

1. Place a gate to another map → Save → Playtest → walk gate.
2. Ground / logic / HUD map id match destination (not stuck DEMO grass).
3. Save Map targets the destination slug.
4. Return gate restores source.

## Next after merge

Live batched remesh (paint without overlay/void plates) — separate PR after this lands on `main`.
