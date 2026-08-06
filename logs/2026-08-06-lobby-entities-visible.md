# Lobby — only grass, no characters (2026-08-06)

**Branch:** `giogimic/lobby-entities-visible-2d3d`  
**After:** #39 merged to `main`

## Symptom

User sees DEMO grass tiles only — no local avatar, no NPCs, no peers.

## Root causes

1. **Babylon remount on `mapData` identity** — every `setActiveMapData` new object flipped `GameCanvasBabylon`’s `[currentMapId, mapData]` effect, disposed the engine, and could leave a frame (or stuck state) with ground remeshed and entity meshes gone.
2. **Entity materials still alpha-blend** — P0 fixed tileset mats to alphatest + depth write; entity sprites stayed `ALPHATESTANDBLEND` and could bury under batched grass (“only grass”).
3. **Poisoned `loadMap` cache** — failed fetches cached `npcs: []` for the session.
4. **Static NPC fallback closed over mount-time `activeMap`** — after keeping the engine across refreshes, NPCs never refreshed from the store doc.

## Fixes

| Change | Where |
| :--- | :--- |
| Remount Babylon only on base `engineMapKey` | `GameCanvasBabylon` |
| Keep same-base `mapData` ref unless richer NPCs/tilesets arrive | `GameCanvasBabylon` |
| Entity mats → alphatest + `renderingGroupId = 1` | `BabylonEngine` |
| Live `activeMapData.npcs` + live dims for entity world math | `GameCanvasBabylon` |
| Do not cache empty `loadMap` fallbacks | `data/maps.ts` |

## Verify

```bash
npx vitest run src/shared/game/babylonViewHelpers.test.ts src/shared/game/lobbyJoin.test.ts
npx tsx scripts/smoke-lobby-mp.ts
```

Manual `/lobby`:

1. Own avatar visible on grass near spawn  
2. Trail NPCs (Vance / greeter / etc.) visible near plaza  
3. Two different accounts → peer nameplate + Nearby ≥ 1  

## Status

**Merged:** #40 → `main` (`e1c0619`)  
**Browser confirm (2026-08-06):** `/lobby` as `mp_vis_a` — own avatar + ~7 NPC sprites on Saints Trail Sandbox grass (not grass-only). Screenshot: `/tmp/computer-use/5b4b2.webp`.

## Hotfix — Docker build type error

`prev as Record<string, unknown>` failed under `tsc` (`GameMapData` has no index signature). Pass `GameMapData` directly into `shouldKeepActiveMapData` (accepts `MapIdDoc`).
