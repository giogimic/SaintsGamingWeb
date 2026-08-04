# Studio painting + permission gating audit

Date: 2026-08-04
Branch: `giogimic/studio-paint-and-permission-audit-56ee`
Reported symptoms:

1. "When placing tiles it only sometimes works."
2. "When placing logic I see the clicks but I don't see it working."
3. "Dev buttons like start server / admin panels are shown to normal players."

Everything below was verified against the running dev server (`npm run dev`,
SQLite, `DEMO_SANDBOX` 30x30) unless explicitly marked as a code-reading
conclusion.

---

## 1. What the painting system actually is

There is no dedicated "paint tool" subsystem. Painting is three pieces wired
together:

| Piece | Where | Role |
| --- | --- | --- |
| Pointer capture | `BabylonEngine.enableTilePicking` | Assigns `scene.onPointerDown`, converts pick to `(r, c)` |
| Paint decision | `GameCanvasBabylon` tile-picking effect | Chooses logic vs visual layer, mutates map data, calls the engine |
| Visual feedback | `BabylonEngine.updateSingleTile` / `updateLogicTile` | Per-cell overlay planes above the batched tileset meshes |

### Editor state

`useEditorStore` (`src/web/components/the-lobby/editor/editor-store.ts`) holds
the whole tool state:

- `isCreationMode` — the master gate. Painting is only wired up when this is
  true. Studio deliberately boots into Walk Mode (`enterWalkMode`), so paint is
  off until Ctrl+E.
- `studioMode` — `build | npc | quest | creature | test`, a dock preset only.
- `activeBrushTileId` — the selected id.
- `activeLayerIdx` — `-1` means the Logic layer, `>= 0` indexes `tileLayers`.

There is no brush size, no stroke/drag painting, and no undo. One pointer-down
paints exactly one cell.

Note the naming drift: the design docs describe modes Walk/Paint/Place/Populate/
Script/Catalog, but the code only implements `isCreationMode` plus `studioMode`.
`29-studio-glossary-canonical.md` is normative for names, and the code has not
caught up.

### Layer model

- Logic layer (`-1`) is `map.grid`, a plain `number[][]` of `MapLogicTile` ids.
  `DEMO_SANDBOX` uses ids 0–11; 13 logic tiles exist in the DB.
- Visual layers are `map.tileLayers[i].grid`, Tiled-style GIDs resolved through
  `map.tilesets`. `DEMO_SANDBOX` has exactly one visual layer, `Ground`, and five
  tilesets with `firstgid` 1 / 1000 / 2000 / 3000 / 4000.

### Rendering

`loadTilemap` batches all visual tiles into one mesh per tileset image
(`tileset_mesh_<image>`), skipping GID 0. Because batched meshes have holes, an
invisible full-map `map_pick_plane` exists purely so clicks always resolve to a
cell. Live paint does not modify the batched mesh; it creates a per-cell overlay
plane named `paint_<layer>_<r>_<c>`. The Logic layer gets its own grid of
`logic_<r>_<c>` planes at `y = 0.5`, created only while `activeLayerIdx === -1`.

### Persistence

`Save Map` in `WorldBuilderPanel` posts to `POST /api/maps/[slug]` and then emits
the `admin_reload_map` socket event. The server invalidates its map cache and
broadcasts `map_reloaded`; the client refetches and calls `setActiveMapData`,
which changes `mapData` and remounts the Babylon engine. The `content_reload`
event described in doc 26 is not implemented — only `map_reloaded` exists.

---

## 2. Why tile painting "only sometimes works"

### 2.1 The Next.js dev watcher wipes paint about once a second (confirmed)

This is the dominant cause and it is not a painting bug at all.

`DATABASE_URL="file:./prisma/db/dev.db"` resolves relative to the schema
directory, so the SQLite file lives at `prisma/prisma/db/dev.db` — inside the
project, and inside the Next.js dev file watcher's scope. `next.config.ts` set no
`watchOptions.ignored`.

Every gameplay database write therefore triggers a full dev recompile and a Fast
Refresh. Measured on the running server: a bare `touch prisma/prisma/db/dev.db`
took the recompile counter from 78 to 79, and during a single play session the log
interleaved one `✓ Compiled in ~600ms` per combat damage tick:

```
[PlayerManager] Player took 15 damage! HP: 40/100
 ✓ Compiled in 577ms (5084 modules)
[PlayerManager] Player took 15 damage! HP: 25/100
 ✓ Compiled in 662ms (5084 modules)
```

Each Fast Refresh remounts `GameCanvasBabylon`, which disposes the engine and
calls `loadTilemap`, and `loadTilemap` starts with `clearPaintOverlays()`. Since
live paint only exists as overlay planes, **every painted tile disappears on the
next database write.** From the creator's seat that reads exactly as "it only
sometimes works": the paint lands, then vanishes a moment later.

### 2.2 The brush id is shared between Logic and visual layers

`activeBrushTileId` is one number used for both a logic tile id and a visual GID.
`WorldBuilderPanel` swaps the palette when you change layer (`LogicTagPalette` vs
`TilesetPicker`) but never resets the brush. So:

- Pick a tileset tile (say GID 4321), switch to Logic (−1), click: you write
  logic id 4321. Nothing is registered at 4321, so the overlay paints it the
  generic indigo "other node" colour at alpha 0.6 — visually almost identical to
  the neighbours. Then `Save Map` is rejected for the whole map by
  `validateMapSave` with `Unknown logic tile id(s): 4321`.
- Pick a logic tag (say id 2), switch to `Ground (0)`, click: you write GID 2,
  which lands in `Terrain_by_George.png` at local id 1 — a stair fragment, mostly
  transparent at 16px. It looks like the click did nothing.

### 2.3 Clicks near any sprite paint the wrong cell

`enableTilePicking` used whatever mesh `scene.onPointerDown` handed it, including
billboarded `entity_*` sprites (player, NPCs, creatures, loot). Sprites are
vertical planes, so `pickedPoint` sits well above the ground, and
`worldToTile(point.x, point.z)` converts that into a cell one or more rows away
from the one under the cursor — or off-map, in which case `worldToTile` returns
`null` and the click is dropped with no feedback. The player sprite is pinned to
the centre of the viewport, which is exactly where people click most.

### 2.4 A paint overlay could be buried under a higher layer

Batched layer `i` renders at `y = i * 0.02`; the paint overlay used
`y = layerIdx * 0.02 + 0.03`. For `layerIdx = 0` that is `0.03`, which is above
layer 1 (`0.02`) but below layer 2 (`0.04`). So on a three-layer map, painting
the ground could be hidden by the layer above it. `DEMO_SANDBOX` only has one
layer, so this does not bite on the demo map, but it does on richer maps.

### 2.5 Silent guards that drop a click

Every one of these produced no user-visible feedback:

| Guard | Consequence |
| --- | --- |
| `!pickResult.hit` / `!pickedMesh` / `!pickedPoint` | click dropped |
| `worldToTile` returns `null` (out of bounds) | click dropped |
| `activeMap.tileLayers[idx].grid[r]` missing | `TypeError` inside the pointer callback, visual already applied, data never written |
| `updateSingleTile`: GID below every `firstgid` | returns with no visual change |
| `updateLogicTile`: no `logic_<r>_<c>` mesh | grid written, nothing repainted |

### 2.6 Paint on a locally loaded map is discarded on save

`GameCanvasBabylon` keeps its own `mapData` state. When `activeMapData` is set in
the store, `mapData` is the same object, so the in-place paint mutations are
visible to `Save Map`. When `activeMapData` is `null`, the component fetches the
map itself and paints a **local-only** object, while `handleSaveMap` falls back to
`GAME_MAPS[baseMapId]`. Everything painted in that window is silently dropped.

---

## 3. Why logic painting shows clicks but does nothing

### 3.1 The logic overlay is never rebuilt after the engine remounts

This is the direct answer to symptom 2.

`GameCanvasBabylon` declared the logic-overlay effect *before* the engine-mount
effect. React runs every cleanup for a commit before any setup, so on a `mapData`
change the order is:

1. engine-mount cleanup — disposes the engine, sets `engineRef.current = null`
2. logic-overlay setup — sees `engineRef.current === null`, does nothing
3. engine-mount setup — builds a fresh engine with no logic overlay

Its dependency array is `[activeLayerIdx, activeMap]`, so it will not re-run
until you toggle layers again. From then on the map has no `logic_<r>_<c>` planes
at all: clicks fall through to `map_pick_plane`, `activeMap.grid[r][c]` is written
correctly, and `updateLogicTile` finds no mesh and silently returns. The click
registers, the data changes, and the screen never updates.

Combined with 2.1 this happens constantly: any database write remounts the engine
and kills the overlay for the rest of the session.

### 3.2 An unregistered brush id looks like a no-op

Per 2.2, arriving on the Logic layer with a leftover visual GID paints the
generic indigo colour, which is easy to miss, and then blocks the save.

### 3.3 The overlay is expensive enough to feel broken

`enableLogicGridOverlay` created one mesh **and one `StandardMaterial`** per cell:
900 meshes and 900 materials on `DEMO_SANDBOX`, each needing shader setup. Toggling
to the Logic layer stalls visibly.

### 3.4 The tileset bootstrap can silently kick you off the Logic layer

`WorldBuilderPanel`'s bootstrap effect calls `setActiveLayerIdx(0)` whenever
`ensureMapHasStudioTilesets` returns a new object and the active layer is
negative. If that fires while you are on Logic, your next clicks paint GIDs into
`Ground` instead.

---

## 4. Permission gating

### 4.1 The model

Authorization is a single integer, `User.permissionLevel`, compared against
`PERMISSION_LEVELS` in `src/web/lib/permissions.ts` (`USER` 20, `MODERATOR` 200,
`ADMIN` 400, `HEAD_ADMIN` 500, `DEVELOPER` 1000). The relational `Role` row is
for display only, and its `level` is a different scale — nothing gates on it.
Studio has its own thresholds in `src/shared/game/studioPermissions.ts`
(`STUDIO_ENTRY_LEVEL` 400, `STUDIO_ENGINE_CONFIG_LEVEL` 1000). The session
exposes `session.user.permissionLevel`, re-synced from the database on every
request in `auth.ts`.

### 4.2 The in-game dev affordances are gated

For a default account (`permissionLevel` 20) the game client hides all of it, and
I could not find an ungated dev control in `/lobby`:

| Control | Gate |
| --- | --- |
| Start Realm (Dev) | `canUseStudioServerControls(session.user.permissionLevel)` — Admin+ |
| Staff floating menu | `if (!isMod) return null` — Moderator+, kick is Admin+ |
| OPEN STUDIO / STUDIO (Ctrl+E) | `canEnterStudio(permissionLevel)` — Admin+ |
| Ctrl+E hotkey | `enableStudio && canStudio` |
| Studio Editor Mode toggle in options | `isAdminUser={enableStudio && canStudio}` |
| Studio docks | `canUseStudioDock(permissionLevel, id)` |
| Dev Tools panel | Admin+ for server controls, Developer+ for engine config |
| Global dev console overlay | Developer+ **and** `devConsoleEnabled` |

`permissionLevel` also starts at `0` in local state and is only raised once the
session resolves, so there is no permissive first paint. The matching write paths
(`POST /api/game/server-status`, `POST /api/maps/[slug]`, `admin_save_map`,
`admin_reload_map`, `staff_announce`, `staff_kick`) all re-check the level against
the database, so the client gates are cosmetic rather than load-bearing.

### 4.3 What is actually leaking

**The `/admin` dashboard is the real answer to symptom 3.** `app/(main)/admin/layout.tsx`
admits anyone who is Moderator+ **or** has `isWriter`:

```ts
if (!dbUser || (dbUser.permissionLevel < PERMISSION_LEVELS.MODERATOR && !dbUser.isWriter)) {
  redirect("/not-found");
}
```

`isWriter` is a content flag, not a staff rank, so a `permissionLevel` 20 writer
gets in. Once in, `app/(main)/admin/page.tsx` rendered its six quick-link cards
with **no gating at all** — User Management, Game Dev Suite, Modpacks & Servers,
Stream Approvals, Forum Categories, News. The sidebar in `admin-overlay-shell.tsx`
does gate per item, so the dashboard grid contradicted the nav right next to it.
Several of those targets (`/admin/modpacks`, `/admin/streams`,
`/admin/game-dev/*`, `/admin/server-manager`, `/admin/realtime`) have no
page-level check either and rely on the layout alone.

**Studio entry disagreed with itself.** `canEnterStudio` is Admin+ (400) and every
Studio dock and content API uses 400, but `app/(main)/studio/layout.tsx` required
`DEVELOPER` (1000). Admins saw the OPEN STUDIO button and got bounced back to
`/lobby`.

**Smaller gaps:**

- `toggleDevConsole` (`app/(ucp)/ucp/actions.ts`) only checked that the caller is
  logged in, so any user could set their own `devConsoleEnabled`. Not an
  escalation, because the overlay also requires Developer+, but the flag should
  not be self-serve.
- `ServerControl` renders Start/Stop Server with no internal gate. It is only
  mounted behind `DevToolsPanel` today, so it is safe by placement, not by
  construction.
- `GET /api/maps`, `GET /api/maps/[slug]`, `GET /api/world/logic-tiles`,
  `fetchAllMaps` and `listMapNpcs` are unauthenticated reads. Information
  disclosure of world data, not privilege escalation.
- `SocketHandler` accepts `socket.handshake.auth.token` as a user id when
  `NODE_ENV === "development"`, which is arbitrary impersonation on any dev or
  staging box.
- `scripts/seed-roles.ts` defines its own scale (`USER` 100, `ADMIN` 500,
  `DEVELOPER` 1100) that disagrees with `permissions.ts`, and falls back to level
  100 (`HELPER` on the canonical scale) for unmatched users. If that script has
  ever been run against a real database, ordinary players can end up above the
  Moderator threshold and legitimately see staff UI.

If specific accounts really do see Start Realm or the Staff menu, the first thing
to check is `SELECT username, permissionLevel, isWriter FROM User` — the client
code is gating correctly, so the data is the more likely culprit.

---

## 5. Changes made on this branch

| # | Change | Fixes |
| --- | --- | --- |
| 1 | `next.config.ts` ignores the SQLite files and `logs/` in the dev watcher | 2.1 |
| 2 | Logic-overlay effect moved after the engine-mount effect; `updateLogicTile` reports a miss and the caller rebuilds the overlay | 3.1 |
| 3 | `activeLogicTileId` split from `activeBrushTileId`; unregistered logic ids are refused with a toast | 2.2, 3.2 |
| 4 | Paint picking re-picks against tile meshes only | 2.3 |
| 5 | Paint overlay `y` moved to `layerIdx * 0.02 + 0.011` | 2.4 |
| 6 | `src/shared/game/tilePaint.ts` centralises target resolution and bounds-checked writes, with an explicit toast on every refusal | 2.5 |
| 7 | Editor mode publishes its loaded map into the store | 2.6 |
| 8 | Logic overlay materials shared per logic id (5 instead of one per cell) | 3.3 |
| 9 | Bootstrap no longer forces the active layer away from Logic | 3.4 |
| 10 | `/studio` layout uses `canEnterStudio` | 4.3 |
| 11 | `/admin` dashboard cards gated per required level | 4.3 |
| 12 | `toggleDevConsole` requires Developer+; `ServerControl` self-gates | 4.3 |

## 6. Known gaps not addressed here

- Erasing (GID 0) on a batched map removes the overlay but leaves the underlying
  `tileset_mesh_*` art until the next full reload. Fixing this needs a
  cell-to-vertex index so a quad can be collapsed in place.
- No stroke/drag painting, no brush size, no undo.
- `content_reload` from doc 26 is still unimplemented; saves go through
  `admin_reload_map`, which remounts the engine and drops unsaved overlays.
- Mode names in code still do not match `29-studio-glossary-canonical.md`.
- Layout-only `/admin/*` pages still lack page-level checks, and the `isWriter`
  bypass into `/admin` remains (narrowing it is a product decision).
- `SocketHandler`'s development auth bypass is untouched.
- `scripts/seed-roles.ts` still uses a divergent permission scale.
