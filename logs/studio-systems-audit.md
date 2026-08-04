# Studio Systems Audit

Date: 2026-08-04
Scope: Read-only audit of Studio visual-tile and Logic (-1) painting, their persistence/runtime paths, and staff/developer control visibility and authorization.

## Working record

- Inspected the Studio editor store, World Builder, Properties, Logic palette, Babylon canvas/engine picking and rendering, map persistence, runtime logic simulation, Socket.io handlers, and role-gated UI/API routes.
- No application code was modified.

## Findings

### Tile painting

1. The visual-tile flow exists: `TilesetPicker` selects a global GID, `WorldBuilderPanel` selects a visual layer, `GameCanvasBabylon` writes that GID into `activeMapData.tileLayers[layer].grid`, and `BabylonEngine` creates a non-pickable per-cell overlay for immediate feedback. Save persists `grid`, `tileLayers`, and `tilesets` through `POST /api/maps/[slug]`; an authorized Socket.io reload then refetches the map for connected clients.
2. The main reliability risk is mutation outside the Zustand setter. The canvas directly changes `activeMap.grid[r][c]` and `activeMap.tileLayers[layer].grid[r][c]` without calling `setActiveMapData`. This does not notify React/Zustand consumers, so dirty UI, dependent effects, and reload sequencing cannot reliably observe a paint. The live overlay can make the change look successful even where reactive state has not advanced.
3. The immediate visual path is only an overlay. Batched `tileset_mesh_*` geometry is not rebuilt after a paint; the overlay is removed when the engine reloads. If the save is rejected, skipped, overwritten by another reload, or the selected GID cannot resolve to a valid tileset, the visual change disappears.
4. GID selection has no bounds validation. The picker calculates `firstgid + row * columns + col` from rendered image dimensions, while the renderer estimates tileset rows where source metadata is incomplete. Clicking transparent/out-of-range portions can produce a GID that is not a real source cell; rendering may be blank even though the grid stored the numeric value.
5. Empty/missing tile layers or tilesets are partly guarded, but the source-of-truth split remains: the map's logic grid is `grid`, visual tiles are `tileLayers`, and a legacy fallback can write to `grid` from the visual paint handler. These representations are easily confused and only the logic grid receives server-side semantic validation.

### Logic paint and gameplay

1. Logic paint targets `grid` (the layer `-1` authority grid). Selecting a tag changes the global brush; a canvas click directly mutates `activeMap.grid[r][c]` and recolors a logic overlay.
2. The current logic overlay is deliberately generic: IDs 0–4 have named colors and all other registered logic IDs use the same indigo fallback. It is a collision/tag visualization, not a preview of a tree, ore, shop, or other gameplay object. Seeing no world-art change after a logic click is therefore expected.
3. Logic behavior is active only in Walk Mode. Studio creation mode suppresses gameplay, and the editor shell initially enters Walk Mode. A painted interactable must be adjacent and faced before `F`/Space activates it; step actions require walking onto the cell in Walk Mode.
4. Several tags have incomplete or weak feedback paths. `WorldSimulation` returns all interactable actions as `RESOURCE_HARVEST`; the canvas only gives dedicated local handling to crafting, wood, and ore before emitting `gather_interact`. `CLEAR_BRAMBLE` and unhandled/custom actions depend entirely on server-side handling and do not get a direct client confirmation. Gates are also a two-step workflow: “Place Warp” only creates `gates` data and selects/paints a gate brush; it does not itself paint the selected cell.
5. Runtime logic uses the client-loaded map data and registered logic-tile definitions. A paint is not authoritative until it is saved, passes the map validation, and reloads. In particular, a custom brush ID missing from `MapLogicTile` causes save rejection, which is reported only as a toast.

### Permissions and developer controls

1. The requested normal-player restriction is mostly already implemented. User level is 20; Studio entry, map/logic writes, and Start Realm are level 400 (Admin+); Developer is level 1000. The Start Realm button is conditionally rendered only for authenticated Admin+ users, and its POST endpoint repeats the database-backed check. Map save/reload socket handlers and REST writes also re-check permission from the database.
2. The in-world Staff menu renders only for Moderator+ (200), not normal players. Its actions are additionally checked server-side: announce requires Moderator+, kick requires Admin+. The `/admin` entry is intentionally offered to staff; the `/admin` layout admits Moderator+ or writers, so its label is broader than a strictly Admin-only console.
3. There is a concrete role-policy inconsistency: shared Studio permissions declare Admin+ can enter Studio, but the `/studio` server layout redirects everyone below Developer. In contrast, the lobby’s Studio button uses the shared Admin+ check. An Admin can therefore be shown an “Open Studio” affordance and then redirected. This is a usability/contract bug, but it does not expose tools to normal players.
4. The Studio shell does role-filter every dock and the Dev Tools panel separately filters server controls (Admin+) from engine/class configuration (Developer+). There is no evidence in the audited code that a normal authenticated user receives these buttons unless their client session has an incorrect/stale `permissionLevel`; endpoint checks still prevent invocation.

## Recommended remediation order

1. Make paint operations immutable Zustand updates through a single `applyMapPaint` action, add dirty state, undo/redo, and a save result/version indicator.
2. Validate visual GIDs against each tileset's real tile count/rows; reject invalid tiles in the picker and show the exact selected tileset/cell.
3. Separate logic tag feedback from visual asset placement. Show the tag name/color per cell, make test-mode behavior explicit, and provide success/failure feedback for every action.
4. Reconcile the `/studio` layout authorization with `canEnterStudio` and decide whether `/admin` is staff-only or Admin-only; use the same shared policy at all UI and route boundaries.
