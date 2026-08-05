# P1 — Studio map create / save (2026-08-05)

**Branch:** `giogimic/studio-p0-demo-depth-paint-2d3d` (continues P0 track)  
**Plan:** `logs/2026-08-05-studio-game-priority-plan.md`

## Problems

1. **Create New Map** copied the logic grid into `tileLayers` → GID `1` stair borders + GID `0` black interior.
2. **Save Map** could fall back to `GAME_MAPS` / empty shell when `activeMapData` was null → silent wrong persist.
3. Auth/validation failures showed terse toasts (`Forbidden`, status codes).
4. `/studio` layout vs Admin gate was already reconciled (`canEnterStudio`) — no change needed.

## Fixes

| Change | Where |
| :--- | :--- |
| `buildNewStudioMap` — bordered logic + `buildDefaultGroundLayer` (GID 17) | `studioMapCreate.ts` |
| `normalizeStudioMapVisuals` repairs logic→visual copies | shared + API POST |
| Save requires `activeMapData`; no `GAME_MAPS` fallback | `WorldBuilderPanel.tsx` |
| `formatMapWriteError` for 401/403/400 detail toasts | shared + panel |
| Clearer API 401/403 messages | `app/api/maps/[slug]/route.ts` |
| Create path always seeds tilesets/Ground server-side | API POST create |

## Verify

```bash
npx vitest run src/shared/game/studioMapCreate.test.ts
```

Manual (Admin+):

1. `/studio` → World Builder → Create New Map `TEST_P1_*` → grass Ground visible.
2. Paint → Save Map → toast success → `GET /api/maps/TEST_P1_*` has GID 17 Ground.
3. Logged-out / low-level account → toast explains Admin+ / sign-in.

## Status

P1 code landed. P2 (lobby MP) still open.
