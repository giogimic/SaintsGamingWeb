# Lobby walk / avatar + Studio map top + save logic-0

Date: 2026-08-04

## Root cause (lobby green map, no walk, no character)

`GameCanvasBabylon` was mounted with `isDevEditorOpen={isCreationMode}`.

`useEditorStore` defaults `isCreationMode: true` (Studio editor default). That leaked into **`/lobby`**:

- Movement early-return (`if (isDevEditorOpen) return`)
- `player_main` hidden
- Editor camera on
- Play HUD gated off

Studio Playtest worked because Play flips `isCreationMode` false — matched “I can only walk in Studio”.

## Fixes

1. `studioToolsOpen = enableStudio && isCreationMode` — only Studio editor tools drive canvas/HUD
2. Lobby mount clears create-mode on the shared store
3. Map save: logic id `0` = empty walkable (not “unknown”)
4. Camera: soft edge margin + unclamped Studio pan so north rows stay editable / avatars stay visible

## Verify

- `/lobby` → character visible, WASD walks, HUD on
- `/studio` Editor → avatar hidden, no WASD; Playtest → walk + PIE toast
- Save Map with empty logic cells (zeros) succeeds
- Pan/walk to top of map — tiles/characters stay reachable
