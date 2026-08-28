# ✅ Map Validation, Sync & Playtest Pipeline

This document details how maps authored in Saints Studio are validated, saved, synchronized across the server fleet, and playtested.

---

## 1. Map Validation & Studio Problems Panel (`StudioProblemsPanel.tsx`, `mapSaveValidation.ts`)

Before and during saving, maps are automatically scanned for structural and gameplay issues:
- **Missing Ground Tiles:** Scans for cells with missing visual GIDs or zero fills that would result in a black void.
- **Unreachable Warps:** Identifies warp tiles placed inside solid collision cells.
- **Broken Warp Links:** Verifies that target map IDs and target coordinates ($X/Y$) exist.
- **Orphan Entities:** Detects NPCs or Spawners placed outside the valid map grid boundaries.
- **Tileset GID Bootstrap:** Auto-upgrades legacy maps with missing tileset references, injecting `DEFAULT_STUDIO_GROUND_GID = 17` (solid grass).

---

## 2. The Save & Realtime Sync Pipeline

```
[Studio Client] ────(Ctrl+S)────► [POST /api/maps]
                                         │
                                         ▼ (Prisma / MariaDB/MySQL Save)
[Go MMO :3001] ◄───(POST /sync-map)──────┴
       │
       ▼ (Reload map & broadcast)
[Connected Players on Map] ───(map_reloaded event)───► [Live Tile Remesh]
```

1. Creator presses **Ctrl+S** or clicks **Save Map** in Studio.
2. The complete map payload is validated and posted to `/api/maps`.
3. Next.js persists the updated `WorldMap` record into the database.
4. Next.js calls `notifyGoMapSynced(mapId)` (`http://localhost:3001/api/internal/sync-map`).
5. The Go MMO server hot-reloads its spatial collision grid and notifies all active players on that map via socket `map_reloaded` packets.

---

## 3. Playtest Runtime (PIE - Play-In-Editor)

Toggling **Playtest Mode** (**Ctrl+E**) seamlessly activates live gameplay simulation inside Studio:
- **Editor Controls Muted:** Tile painting, entity dragging, and camera panning are suspended.
- **Player Character Spawned:** Spawns a test character at the camera center or designated map spawn point.
- **Full Gameplay Systems Enabled:** Movement physics, collision checks, dialogue interactions, ability hotbars, and creature encounters activate immediately.
- **Snapshot Restoration:** Toggling Playtest off restores the exact editor state, viewport position, and dock arrangements without leaving the screen.
