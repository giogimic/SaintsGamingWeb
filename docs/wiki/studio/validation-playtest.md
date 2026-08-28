# Map Validation, Save Pipeline & Playtest Runtime

Saints Studio incorporates automated map validation, an internal server sync pipeline, and an instantaneous in-engine playtest runtime (**PIE**).

---

## 1. Studio Validation Engine & Problems Panel

Before persisting a map to the database, `mapSaveValidation.ts` scans the map grid and entities for structural errors displayed in the **Problems Panel**:

```
┌──────────────────────────────────────────────────────────┐
│                   Studio Problems Panel                  │
├──────────────────────────────────────────────────────────┤
│ ❌ Error: Missing ground GID at cell [14, 22] (Void)     │
│ ⚠️ Warn: Warp tile at [30, 12] links to missing map 'cave'│
│ ⚠️ Warn: NPC 'npc_miner_02' placed in solid collision cell│
│ ℹ️ Info: Auto-bootstrapping default grass GID (17)       │
└──────────────────────────────────────────────────────────┘
```

- **Missing Ground Tiles:** Flags unpainted cells ($GID = 0$) on Layer 0 to prevent black rendering voids.
- **Unreachable Warps:** Identifies warp gates surrounded by solid collision tags.
- **Broken Warp Links:** Verifies that target map IDs exist in the database and target coordinates are within map bounds.
- **Orphan Entities:** Detects NPCs or Spawners placed outside the grid dimensions.
- **Tileset GID Bootstrap:** Automatically injects default solid grass tiles (`DEFAULT_STUDIO_GROUND_GID = 17`) for unpopulated base cells.

---

## 2. Save & Synchronization Pipeline

Saving in Studio triggers a coordinated workflow between Next.js and the Go MMO service:

```
[Studio Editor] ────(Ctrl+S)────► [POST /api/maps]
                                         │
                                         ▼ (Prisma / MariaDB/MySQL Persist)
[Go MMO :3001]  ◄───(POST /sync-map)─────┘
       │
       ▼ (Reload collision matrix)
[Connected Players on Map] ───(map_reloaded socket)───► [Live Tile Remesh]
```

1. **Client Save:** The user hits **Ctrl+S** or clicks **Save Map**.
2. **Persistence:** Next.js saves the `WorldMap` record to MariaDB/MySQL/Prisma.
3. **Cluster Notification:** Next.js invokes `POST http://localhost:3001/api/internal/sync-map`.
4. **Broadcast:** Go MMO reloads the map collision grid and broadcasts `map_reloaded` to active players, triggering seamless chunk remeshing.

---

## 3. Play-In-Editor (PIE) Runtime

Pressing **Ctrl+E** toggles the **Playtest Runtime** directly in the Studio viewport:
- **Editor Controls Suspended:** Brush cursors, tile selections, and gizmos are muted.
- **Player Character Instantiation:** Spawns a playable character at the camera center or map spawn point.
- **Live Systems Active:** Movement physics, collision checks, NPC dialogue, hotbars, and creature encounters run immediately.
- **Lossless State Restoration:** Pressing **Ctrl+E** again exits playtest and restores exact editor viewports, brush settings, and panel layouts.
