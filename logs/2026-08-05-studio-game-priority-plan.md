# Studio / Game — Where We Left Off + Priority Plan

**Date:** 2026-08-05  
**Status:** Planning only (no code fixes in this commit)  
**Handoff pointers:** `info/CONTINUE.md` · `logs/2026-08-04-studio-resume-after-strip.md` · `logs/studio-first-hybrid-foundation.md`

---

## Verdict

Studio **editor shell** (Editor ↔ Playtest, catalogs, author session, PIE shard, paint plumbing) is largely on `main`. The **player-visible product gaps** you are hitting are still open: demo depth/paint on the north half, reliable map create/save, and lobby multiplayer visibility. Treat those three as the next workstream — not Phase 2 catalog polish.

---

## Already shipped (do not redo)

| Area | What’s on `main` |
| :--- | :--- |
| Editor kernel | Editor vs Playtest hard split, Ctrl+E, undo/redo paint ops, mode labels Paint/Populate/Script/Catalog/Play |
| Editor camera | Detach follow; MMB / Space+drag pan; unclamped Studio pan for map edges |
| Catalogs | Creature / Quest / Dialogue / Class / Loot / Starter Heroes on `CatalogEditorShell` |
| Author session | `/studio` → DEMO without character select; Hero dock optional |
| PIE | Playtest → `studio_pie_{userId}` (isolated from public lobby) |
| Lobby vs Studio maps | `/lobby` always `DEMO_SANDBOX` + `lobby: true`; `/studio` keeps map + `lobby: false` |
| Paint reliability (partial) | Immer freeze disabled for map mutation; `paintCell` / `worldDocument`; drag paint; tileset bootstrap (`DEFAULT_STUDIO_GROUND_GID = 17`); SQLite watcher ignore; sprite-pick ignore |
| Lobby walk regression | Create-mode no longer leaks into `/lobby` (`studioToolsOpen = enableStudio && isCreationMode`) |
| Duplicate strip | Ghosts removed; inventoryService; ClassEditorPanel only; TurnBattleOverlay only |
| Save path (code exists) | `POST /api/maps/[slug]` + `admin_reload_map`; Create New Map UI in World Builder |

Foundation next items that were **parked** (not blocking your three bugs): definition undo stack, richer debug overlays, PIE god-mode options.

---

## Reported issues → likely causes

### 1. Top half of DEMO: character under ground tiles + those tiles not editable

**Symptoms match known depth / pick / camera edge debt.**

| Likely cause | Why it matches |
| :--- | :--- |
| Depth / alpha on batched `tileset_mesh_*` | Flat ground quads at `y ≈ 0` + sprites at `y = 0.85` with `rotation.x = π/4`. Transparent tileset mats can write depth and bury the avatar, worse toward map north where the camera pitch foreshortens. |
| Paint pick / north reach | Earlier session already had to soften camera clamp + unclamp Studio pan so north rows stay reachable. If clamp / pick plane / ray still fail on high rows, clicks do nothing → “can’t modify.” |
| Overlay buried / mesh not rebuilt | Live paint is overlay-only; batched mesh does not update until reload. Erase-to-0 leaves old art. North-half paint can look “stuck.” |
| Wrong layer / brush | Shared brush id between Logic (−1) and Ground; wrong GID looks like a no-op. |

**Not** “missing DEMO tilesets” if grass is visible — bootstrap already fills GID 17 when layers were blank.

### 2. Studio still can’t create or save maps

Code paths exist (`WorldBuilderPanel` → `POST /api/maps/[slug]`). Failures usually come from:

| Gate / bug | Detail |
| :--- | :--- |
| Permission | Write requires **Admin+ (400)**. `/studio` layout may still redirect below **Developer (1000)** — Admin can see Lobby “Open Studio” and then get bounced (audit finding). |
| `validateMapSave` | Unknown logic tile ids reject the **whole** map (e.g. painting a visual GID onto Logic). |
| Create-map visual fill bug | `handleCreateNewMapSubmit` copies the **logic** grid into `tileLayers` (walls as GID `1`, interior `0`) instead of `buildDefaultGroundLayer` / GID `17` → new maps look broken / unpaintable. |
| Session / toast | 401/403/400 only shown as toast — easy to miss. |
| Local-only paint | If `activeMapData` was null and canvas fetched locally, Save can persist stale `GAME_MAPS` data (audit §2.6). |

### 3. Multiplayer not functioning

Shard / join plumbing was hardened; remaining failure modes:

| Cause | Detail |
| :--- | :--- |
| Wrong client | Studio is **private / PIE** — peers on `/lobby` will never see Studio authors. Test MP only on **`/lobby`** with two accounts. |
| Parallel shards | Joining a raw `_chN` id (or retired map) used to hide peers — mostly fixed via `toBaseMapId` + `lobby: true`. Re-verify both clients land on same `DEMO_SANDBOX_chN`. |
| AOI | Movement broadcasts are zone-neighborhood (`InterestManager`, default 16). Far-apart players on a large map can miss each other; DEMO 30×30 should usually be fine if both near spawn. |
| Socket / session | NextAuth refetch reconnect wipe was fixed (depend on `session.user.id`). Disconnect still clears `otherPlayers` until rejoin. |
| Character not loaded | `join_map` needs account + character context; title/character-select only clients never enter the shard. |

---

## Priority order (importance × leverage)

Work **top-down**. Each phase should leave a verifiable demo before the next.

### P0 — Demo ground truth (visual + paint) — **highest**

**Goal:** Character always draws above walkable ground; every DEMO cell is pickable/paintable in Studio; paint survives Save + reload.

1. Reproduce on `/lobby` + `/studio` walking the **north** half of `DEMO_SANDBOX`.
2. Fix sprite vs ground depth (render order / alpha depth write / slight Y lift / row-sorted alphaIndex — pick one approach and document).
3. Fix north-half pick: confirm `map_pick_plane` hits, camera can center north rows, paint overlays sit above all visual layers.
4. After paint: either rebuild batched mesh for changed cells or force a non-destructive remesh so Save/reload matches what you see.
5. Smoke: paint 5 north cells → Save → hard refresh → still there; walk avatar across them → feet/body never under grass.

**Files likely:** `BabylonEngine.ts` (`loadTilemap`, `updateEntity`, `updateSingleTile`, `enableTilePicking`, `setCameraPosition`), `GameCanvasBabylon.tsx`, `worldDocument` / `tilePaint`.

### P1 — Map create + save must work end-to-end

**Goal:** Admin/Dev can Create New Map and Save Map with clear success/failure; new maps boot with real grass tilesets.

1. Fix create payload: Ground layer = `buildDefaultGroundLayer` (GID 17), **not** a copy of logic `grid`.
2. Surface save errors loudly (permission, validation details, network).
3. Reconcile `/studio` layout gate with `canEnterStudio` (400 vs 1000) so the account that can open Studio can also write.
4. Confirm `activeMapData` is always the Save source of truth (no silent fallback to static maps).
5. Smoke: Create `TEST_MAP_*` → warp → paint → Save → `GET /api/maps/...` matches → restart server → still loaded.

**Files likely:** `WorldBuilderPanel.tsx`, `app/api/maps/[slug]/route.ts`, studio layout auth, `mapSaveValidation.ts`.

### P2 — Lobby multiplayer visibility

**Goal:** Two real `/lobby` accounts on DEMO see each other move and chat.

1. Manual verify with [`info/game/LOBBY_VERIFY.md`](../info/game/LOBBY_VERIFY.md) §3 — both on `/lobby`, not Studio.
2. Instrument or log: `map_joined.instanceId`, `map_players` count, AOI room keys on join.
3. Fix whatever diverges (rejoin flags, AOI for DEMO size, `otherPlayers` wipe, sprite sync).
4. Smoke: two browsers, same shard id, both sprites + `player_moved` + chat bubble.

**Files likely:** `the-lobby/index.tsx`, `PlayerManager.ts`, `WorldManager.ts`, `InterestManager.ts`, store `otherPlayers`.

### P3 — Studio polish (only after P0–P2)

- Definition / non-paint undo stack  
- Erase GID 0 updates batched mesh without full remount  
- Brush reset when switching Logic ↔ visual  
- Mode id naming catch-up to bible 29  
- PIE advanced options  

### Parked (do not prioritize)

UCP / FiveM / Discord bot / S3-default / heavy AI / dual map-loader merge — see `info/CONTINUE.md` back-line.

---

## Suggested session checklist

```bash
npm run dev
curl --max-time 120 http://localhost:3000/studio   # warm compile
curl --max-time 120 http://localhost:3000/lobby
```

| Check | Pass criteria |
| :--- | :--- |
| Lobby walk | Avatar visible, WASD works, not stuck in create-mode |
| North DEMO | Avatar above tiles; Studio can paint north cells |
| Save | Toast success; `GET /api/maps/DEMO_SANDBOX` reflects strokes |
| Create | New slug with grass Ground + tilesets; Save persists |
| MP | Two `/lobby` accounts, same `instanceId` prefix, mutual visibility |

---

## Implementation tracking

| Phase | Status |
| :--- | :--- |
| P0 depth + north paint | OPEN |
| P1 create/save | OPEN (create fill bug confirmed in code) |
| P2 lobby MP | OPEN (verify first; fix if broken) |
| P3 polish | PARKED until P0–P2 |

Update this file as each phase lands.
