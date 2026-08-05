# Studio author overlays — warp + spawn markers (2026-08-05)

**Branch:** `giogimic/studio-author-overlays-2d3d`

## What

Editor-only viewport markers for gate tiles (amber), NPC spawns (sky), and gate destination spawn pins (green). Toggles on StudioPaintHud. Cleared in Playtest / `loadTilemap`. Never serialized (`shouldExportEditorOverlays`).

## Files

- `src/shared/game/authorOverlays.ts` (+ test)
- `BabylonEngine.setAuthorOverlays` / `clearAuthorOverlays`
- `editor-store` `showWarpOverlays` / `showSpawnOverlays`
- `StudioPaintHud` toggles
- `GameCanvasBabylon` rebuild effect

## Verify

```bash
npx vitest run src/shared/game/authorOverlays.test.ts
```

Manual: `/studio` → Place Warp → amber gate + green spawn pin; place NPC → sky marker; toggles Off hide; Save Map has no overlay keys.
