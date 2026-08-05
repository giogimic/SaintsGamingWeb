# Studio NPC live spawn (2026-08-05)

**Branch:** `giogimic/studio-npc-live-spawn-2d3d`  
**Focus:** Game / Studio Populate loop

## Problem

`placeMapNpc` persisted `WorldMap.npcsData` + dialogue, but the toast said “Rejoin map to spawn.” Warm shards never received `creature_spawned`; `admin_reload_map` only remeshed tiles.

## Fix

| Change | Where |
| :--- | :--- |
| `WorldManager.spawnNpcLive` → spawn on every warm instance + invalidate cache | `WorldManager.ts` |
| Socket `studio_spawn_npc` (Admin+ write) | `SocketHandler.ts` |
| Pass `dialogueNpcId` on spawn broadcast | `CreatureManager.ts` |
| After save: append to `activeMapData.npcs` + emit spawn | `NpcEditorPanel.tsx` |
| Invalidate dialogue cache on place | `map-npcs.ts` |
| Pure helpers + tests | `studioNpcSpawn.ts` |

## Verify

```bash
npx vitest run src/shared/game/studioNpcSpawn.test.ts
```

Manual (`/studio` Populate):

1. Click tile → fill NPC → Save NPC.
2. Sprite appears immediately (no rejoin).
3. Interact → greeting dialogue.
4. Refresh / rejoin → NPC still there.

## Next after merge

Studio author overlays (warp/spawn markers) or definition undo on remaining catalogs.
