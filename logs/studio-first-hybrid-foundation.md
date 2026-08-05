# Game Engine Editor Foundation (Studio-First Hybrid)

Date: 2026-08-04  
Branch: `main` (local)

## Intent

**Not a map editor.** Studio is the Saints Online **game engine editor**: world data, entities, definitions, tools, and a Playtest viewport. Terrain paint is one tool among many.

Phase 1 = harden Editor vs Playtest on the existing shell (bible path).  
Phase 2a = editor camera + CatalogEditorShell / SchemaFieldRenderer wiring.

## Phase 1 shipped

| Piece | What |
| :--- | :--- |
| Runtime kernel | `StudioRuntime` editor\|playtest in `studioSession.ts`; hard input gate helpers |
| Input split | Editor: no WASD / interact / touch move / click-to-move. Playtest: gameplay on |
| Hotkeys | Bare `e` no longer toggles Studio; Ctrl+E = Editor↔Playtest; Ctrl+Z/Y undo/redo |
| World document | `worldDocument.paintWorldCell` + sync; canvas paints through it |
| EditorOps | `editorOps.ts` paint_cells undo/redo stack (map scope) |
| Mode labels | Paint / Populate / Script / Catalog / Play (canonical bridge; ids stable) |
| Play UX | Shell Play / Stop Playtest; restores docks, brush, dirty from snapshot |

## Phase 2a shipped

| Piece | What |
| :--- | :--- |
| Editor camera | `BabylonEngine.setEditorCameraMode` — detach player follow; MMB / Space+drag pan; wheel zoom stays |
| Follow gate | Render loop skips `setCameraPosition` while editor tools active |
| CatalogEditorShell | Shared catalog chrome (`editor/components/CatalogEditorShell.tsx`) |
| SchemaFieldRenderer | Wired into NPC panel (General + Appearance from `entitySchemas`) |
| Paint HUD | Shows pan / undo hints |

## Phase 2b shipped

| Piece | What |
| :--- | :--- |
| Creature Catalog | Migrated onto `CatalogEditorShell` |
| Quest Catalog | Migrated onto `CatalogEditorShell` |
| Dialogue Catalog | Migrated onto `CatalogEditorShell` |
| Class Catalog | Migrated onto `CatalogEditorShell` |
| Overlay hint | Paint HUD XY toggle (`showEditorCoords`) |

## Phase 2c shipped

| Piece | What |
| :--- | :--- |
| Loot Catalog | Migrated onto `CatalogEditorShell` |
| Avatar-free viewport | Hide `player_main` in Editor runtime; restore on Playtest (`shouldHidePlayerAvatar`) |

## Phase 2d shipped (checkpoint)

| Piece | What |
| :--- | :--- |
| Author session | `/studio` loads `DEMO_SANDBOX` without character select (`enterStudioAuthorSession`) |
| Optional hero | Dock **Hero** → character select; cancel returns to author session |
| Persist gate | Autosave still requires `activeCharacterId` (author sessions do not write character state) |

## Phase 2e shipped

| Piece | What |
| :--- | :--- |
| Starter Heroes Catalog | `StarterHeroEditorPanel` on `CatalogEditorShell` (shared chrome + list/form) |

## Phase 2f shipped

| Piece | What |
| :--- | :--- |
| PIE private shard | Playtest → `studio_pie_{userId}` room; Studio author joins `isPrivate` (not public DEMO_chN) |
| Events | `STUDIO_PIE_CHANGED_EVENT` on Play / Stop Playtest |

## Verify

```bash
npx vitest run src/shared/game/studioSession.test.ts src/shared/game/studioModes.test.ts src/shared/game/editorOps.test.ts
```

Manual: open `/studio` → Play → toast “PIE — private playtest shard”. Lobby `/lobby` peers must not see Studio PIE avatars on DEMO.

## Post-strip contracts (do not regress)

See `logs/2026-08-04-studio-resume-after-strip.md`:
- `/lobby` → always DEMO + `lobby: true`
- `/studio` → author/character map + `lobby: false` + private/PIE isolation
- Classes → `ClassEditorPanel` only; inventory → `inventoryService`; TB → `TurnBattleOverlay` only

## Next

**Game-only queue** (one PR → merge to `main` → then next):

1. Gate/Playtest warp — **on main** (#29)
2. Live batched remesh — **on main** (#30)
3. Lobby MP reconnect — **on main** (#31)
4. NPC place live spawn — **on main** (#32)
5. Warp/spawn author overlays — `logs/2026-08-05-studio-author-overlays.md`

P0–P3 product blockers are on `main` (#28).

Parked / next foundation polish:

- Definition undo on remaining catalogs (Quest has v1)
- NPC edit/delete/despawn lifecycle