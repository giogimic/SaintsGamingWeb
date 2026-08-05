# Studio NPC edit / delete / live despawn (2026-08-05)

**Branch:** `giogimic/studio-npc-lifecycle-2d3d` (stacks on author overlays)

## What

Populate NPC catalog is no longer place-only:

- List NPCs from `listMapNpcs`
- Select → edit → `updateMapNpc` + despawn/respawn live
- Delete → `deleteMapNpc` + `studio_despawn_npc` → `creature_despawned`

## Files

- `app/actions/map-npcs.ts` — `updateMapNpc` / `deleteMapNpc`
- `WorldManager.despawnNpcLive` + `CreatureManager.despawnNpcsByDialogueId`
- Socket `studio_despawn_npc`
- `NpcEditorPanel` list/select/update/delete
- `studioNpcSpawn` helpers

## Verify

```bash
npx vitest run src/shared/game/studioNpcSpawn.test.ts
```

Manual: place NPC → select → move coords → Update (sprite moves) → Delete (sprite gone).
