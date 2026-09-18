# Map Sync Service (`MapSyncService.ts`)

Once a release is LIVE, the players' browsers will download the `ReleaseManifest` over HTTP. However, the authoritative Game Engine (the Go MMO backend running on a socket server) must also be made aware of map changes, collision meshes, and region topologies to accurately calculate physics, line-of-sight, and server-side cheat detection.

## The Sync Lifecycle

1. **Enqueue:** The `initialize-game` pipeline calls `MapSyncService.enqueue`.
   - A `MapSyncEntry` record is created in Prisma with a status of `PENDING`.
   
2. **Eager Push Attempt:**
   - If `process.env.SYNC_MODE !== "pull"`, the service immediately kicks off a background async process.
   - It fetches the newly promoted `WorldMap` details.
   - It retrieves the raw Voxel document (chunks, heights, block definitions) from the `VoxelStorageService`.

3. **HTTP Webhook (`goMmoNotify.ts`):**
   - The payload is dispatched via `POST` to the Go backend's `/api/sync/map` endpoint.
   - **Crucial Requirement:** The Node.js API must know the correct `GO_MMO_API_URL` and `GO_MMO_ADMIN_SECRET` to authenticate with the Go backend.

4. **Acknowledge / Failure Status:**
   - If the Go engine returns `200 OK`, the `MapSyncEntry` is updated to `SYNCED`.
   - If the connection fails, times out, or the Go engine rejects it, it is updated to `FAILED`, storing the error text in the `error` column for diagnostic viewing in the Studio Dashboard.

## Project Sync
There is also a secondary function `MapSyncService.enqueueProjectRelease()` that explicitly alerts the Go MMO when a complete full-version bump occurs (not just a single map).
