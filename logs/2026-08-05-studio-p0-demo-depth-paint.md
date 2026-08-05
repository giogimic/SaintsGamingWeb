# P0 — DEMO north depth + paint (2026-08-05)

**Branch:** `giogimic/studio-p0-demo-depth-paint-2d3d`  
**Plan:** `logs/2026-08-05-studio-game-priority-plan.md`

## Root cause

Batched `tileset_mesh_*` used alpha-**blend** materials. Transparent meshes sort by **mesh center**, so anything north of map center (sprites + Studio paint overlays) drew first and was then covered by the whole ground mesh. That matched both symptoms: character under tiles on the top half, and north cells looking unpaintable.

## Fixes

| Change | Where |
| :--- | :--- |
| Tileset mats → `MATERIAL_ALPHATEST` + `forceDepthWrite` + low `alphaCutOff` | `BabylonEngine.configureTilesetMaterial` |
| Batched tileset meshes `isPickable = false` (pick via `map_pick_plane` only) | `loadTilemap` |
| Pick plane at `y = 0.001` (above ground depth) | `loadTilemap` |
| Softer camera edge margin (~5% tile) so north rows stay in frame | `clampCameraFocus` in `babylonViewHelpers.ts` |
| Avatar clearance `0.85` → `1.05` | `ENTITY_GROUND_CLEARANCE` |
| Paint overlay Y via shared helper (still in-layer slot) | `paintOverlayHeight` |

## Verify

```bash
npx vitest run src/shared/game/babylonViewHelpers.test.ts
```

Manual:

1. `/lobby` → walk to DEMO north half → avatar stays **above** grass.
2. `/studio` → Paint → pan/click northern cells → overlays visible; Save Map persists.

## Status

P0 code landed; **manual visual confirm passed** (2026-08-05):
- `/lobby` north cells (20,5), (26,4), (28,4) — avatar above grass
- Studio paint not exercised (login required in that session)
- Screenshots: `/opt/cursor/artifacts/screenshots/p0-fix-*.webp`
- Report: `/opt/cursor/artifacts/p0-verification-report.md`

P1/P2/P3 also landed on the same branch — see sibling logs.
