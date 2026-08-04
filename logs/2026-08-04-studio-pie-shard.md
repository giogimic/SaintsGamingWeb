# Studio PIE private shard

Date: 2026-08-04  
Branch: `main`

## Why

Studio Playtest was joining the same public DEMO channel as `/lobby` players (`lobby: false` alone is not enough). Bible 32 wants PIE isolation → `studio_pie_{userId}`.

## Behavior

| Mode | Join flags | Room |
| :--- | :--- | :--- |
| `/lobby` | `lobby: true` | Forced DEMO public shard |
| Studio Editor | `lobby: false`, `isPrivate: true` | `{mapId}_{accountId}` |
| Studio Playtest | `lobby: false`, `pie: true` | `studio_pie_{accountId}` |

Play / Stop Playtest dispatches `studio:pie-changed`; lobby client re-emits `join_map`.

## Files

- `src/shared/game/studioSession.ts` — `studioPieRoomId`
- `src/shared/game/studioEvents.ts` — `STUDIO_PIE_CHANGED_EVENT`
- `src/server/WorldManager.ts` / `PlayerManager.ts`
- `src/web/components/the-lobby/editor/editor-store.ts`
- `src/web/components/the-lobby/index.tsx`
- `StudioEditorShell` PIE chip copy
