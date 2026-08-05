# Studio live batched remesh (2026-08-05)

**Branch:** `giogimic/studio-live-tile-remesh-2d3d`  
**Focus:** Game / Studio paint loop only

## Problem

`updateSingleTile` drew per-cell `paint_*` overlays (and erase void plates) on top of immutable `tileset_mesh_*`. Visual truth only caught up on full `loadTilemap` remount (Save / reload).

## Fix

| Change | Where |
| :--- | :--- |
| Pure UV / quad helpers | `src/shared/game/tileBatchHelpers.ts` |
| Cell → quad index at load (`layerIdx_r_c`) | `BabylonEngine.loadTilemap` |
| Updatable batched meshes | `applyToMesh(mesh, true)` |
| In-place UV rewrite / collapse / append | `patchBatchedTile` |
| `updateSingleTile` prefers remesh; overlay is fallback | `BabylonEngine.updateSingleTile` |

Erase collapses the batched quad (no void plate when remesh works). Overpaint on the same tileset rewrites UVs; cross-tileset collapses the old quad and appends to the new mesh.

## Verify

```bash
npx vitest run src/shared/game/tileBatchHelpers.test.ts
```

Manual (`/studio` Paint on DEMO):

1. Paint, overpaint, erase ~10 cells without remount — ground matches brush; no leftover void plates.
2. Save → hard refresh → same art.
3. North half still paintable; avatar still above grass.

## Next after merge

Lobby MP two-browser smoke / reconnect harden if needed.
