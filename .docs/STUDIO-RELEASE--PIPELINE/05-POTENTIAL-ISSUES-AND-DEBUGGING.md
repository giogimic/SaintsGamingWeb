# Potential Issues & Debugging

When managing the Studio Release Pipeline, several failure vectors exist spanning from database compilation faults to network issues with the Go engine. 

## 1. Webpack / Dynamic Import Build Errors
**Symptom:** Next.js build (`npm run build`) fails with `Identifier has already been declared` or complains about dynamic imports in client components.
**Cause:** Attempting to `await import()` a Server Action inside a `'use client'` component.
**Fix:** Server Actions must be statically imported at the top of the file.

## 2. Unresolved Canonical Spawn (HTTP 400 / 500 on Publish)
**Symptom:** The setup-publish pipeline throws an error stating `Canonical World Spawn gate "..." not found in any Working World map. Publish aborted.`
**Cause:** The `compileWorldRelease` orchestrator mandates that the exact spawn gate ID assigned in `GameConfig.defaultSpawnGateId` exists somewhere in the `gatesData` or `entitiesData` of the maps being published. 
**Fix:** Ensure the Map Editor has a Spawn Gate placed, and its ID exactly matches the project configuration.

## 3. Missing Artifact Checksums (Failed Region Compilations)
**Symptom:** Voxel maps do not load in production, or the pipeline errors during the `AtlasCompiler` phase.
**Cause:** The World Builder relies on background workers to mesh and chunk the raw voxel grids into `.bin` artifacts. If the process is halted or fails, the `WorldRegion` will be stored in Prisma without an `artifactChecksum`.
**Fix:** Check the Studio dashboard for "Stuck" regions. Force-recalculate geometry for the affected Map in the Voxel Editor to trigger a new `WorldBootstrapRevision`.

## 4. MapSyncService Failures (Go MMO Desync)
**Symptom:** Players can load into the game client-side (because they download the JSON manifest), but they fall through the floor or cannot interact with server-side logic. The Studio dashboard shows `MapSyncEntry` rows with `status = FAILED`.
**Cause:** 
- The Node.js server cannot reach the Go server (`connection refused`).
- Invalid Secret Token (auth failure from Go).
- CORS misconfigurations.
**Fix:** 
1. Check `.env` for `GO_MMO_API_URL` and `GO_MMO_ADMIN_SECRET`.
2. Inspect the Go backend console output for rejected HTTP requests on `/api/sync/map`.
3. If running via Docker, ensure `saints-gaming-db` and `go-mmo` containers are properly networked with the Node.js container.

## 5. Corrupted Voxel Storage
**Symptom:** `MapSyncService.enqueue` fails with `Cannot read properties of undefined` or `JSON parse error` when reading `VoxelStorageService.getVoxelDoc()`.
**Cause:** The raw file on disk (`.data/voxels/...`) is corrupted, truncated, or missing entirely despite the SQL database having a map record.
**Fix:** The map must be rebuilt or restored from a World Snapshot backup via `app/actions/studio/publishing.ts`.
