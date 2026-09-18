# Restore Pipeline (`publishing.ts`)

While the primary release pipeline handles migrating data from the **Working World** to a **Live Release**, the system also supports the inverse operation: restoring a previous `WorldRelease` snapshot back into the **Working World** for editing.

## Mechanism of Action (`restoreWorldRelease`)

This function is critical for disaster recovery (e.g., corrupted voxel data, accidental deletions in the Studio) or rolling back gameplay changes.

### 1. Auto-Backup
Before any destructive operations occur, the orchestrator triggers an automatic backup.
```typescript
await compileWorldRelease(snapshot.projectId, "Auto-Backup Pre-Restore", "Automated backup created before restoring a previous snapshot.");
```
This guarantees that the current state of the Working World is saved as a new snapshot, even if it is currently broken.

### 2. Destructive Wipe
The system wipes all current `WorldMap` and `WorldRegion` data for the project. Because `WorldRegion` cascades from `WorldMap`, this completely cleans the slate for the voxel and map entity layers. Note that player data (`GameCharacter`) is untouched.

### 3. Reconstruction
The pipeline iterates over the exact JSON `ReleaseManifest` of the chosen backup snapshot and reconstructs the working database tables:
- **Maps:** Re-inserts rows into `WorldMap` using the decoupled `WorldMapSnapshot` records associated with the release.
- **Regions:** Re-inserts rows into `WorldRegion` using the flat `atlas` lookup map (`region_key -> checksum`). By explicitly injecting the `artifactChecksum` back into the database, it reconnects the SQL layer to the raw `.data/voxels/` flatbuffer files on disk without needing to re-mesh the world.
- **Configurations:** Overwrites `GameConfig` and `CharacterClass` definitions with the values present in the manifest at the time of the backup.

### Potential Issues during Restore
- **Voxel Desync:** If the underlying binary flatbuffer files on disk (`.data/voxels/...`) were manually deleted, restoring the SQL `WorldRegion` will not magically bring the physical terrain back. The `artifactChecksum` will point to a missing file.
- **Dangling Connections:** If warp gates point to Map IDs that were deleted *before* the backup was made, the restore will succeed but players attempting to use those warps will be softlocked.
