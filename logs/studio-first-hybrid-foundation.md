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

## Verify

```bash
npx vitest run src/shared/game/studioSession.test.ts src/shared/game/studioModes.test.ts src/shared/game/editorOps.test.ts
```

## Next

- Avatar-free editor session (no player required to author)
- PIE private shard
- Migrate Creature/Quest/Loot docks onto CatalogEditorShell
- Definition undo stack
- Toggleable debug overlays (spawn/warp/chunk)
