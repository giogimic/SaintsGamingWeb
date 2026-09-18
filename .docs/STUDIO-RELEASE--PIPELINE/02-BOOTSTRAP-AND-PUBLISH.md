# Bootstrap & Publish Mechanics

## 1. WorldBootstrapRevision
Before a game environment can be published, the backend utilizes the `WorldBootstrapRevision` model.
This model acts as a staging ground. As the developer modifies regions, chunks, and heights in the Voxel Editor, background jobs compute the changes and hash them. 

- **Integrity Requirement:** Every modified `WorldRegion` must have an `artifactChecksum`. This checksum proves that the Voxel geometry and properties have been successfully compiled into a binary flatbuffer format suitable for clients to download.
- **Validation:** If the `WorldBootstrapRevision` status is not `COMPLETED` (e.g., regions are still generating), the publish pipeline explicitly blocks the deployment to prevent pushing half-built maps to players.

## 2. The Setup Publish Route (`initialize-game`)
Located in `app/api/setup/initialize-game/route.ts`, this API route acts as the trigger for the entire deployment pipeline.

### Sequence of Operations:
1. **Permission Check:** Verifies if the request is from a system admin or if it is the first-time setup.
2. **Schema Persistence:** Saves the underlying game definitions (Genre, Style, Classes, Starter Heroes) directly into the Next.js database using Prisma UPSERTs.
3. **Bootstrap Verification:** Queries the provided `bootstrapRevisionId` to ensure the environment is `COMPLETED`.
4. **Starter Content Bootstrapping:** Executes `bootstrapDynamicStarterContent` to inject default items, abilities, and interactables required by the map.
5. **Compilation Trigger:** Dynamically invokes `compileWorldRelease()` from the compiler orchestrator.
6. **Blue-Green Release Promotion:**
   - Queries `prisma.worldRelease.updateMany` to demote any currently active `LIVE` release back to a backup `PUBLISHED` state.
   - Sets the newly compiled release explicitly to `LIVE`.
7. **Sync Trigger:** Invokes `MapSyncService.enqueue` to push the state to the Go MMO backend.

*Note: The system logs every step to `SetupLogger`, capturing `stageName`, `stageCode`, and `status`. These logs are then returned to the UI so the developer can watch the progress bar update in real time.*
