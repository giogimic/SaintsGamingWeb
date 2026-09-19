# Saints Gaming

> **Time To Play** — Welcome to the Saints Gaming community platform & game project!

Hey everyone! Welcome to the repository for **Saints Gaming**. 

I'm building this for our community. This is a passion project I build for fun in my spare time, designed to serve as our community's home base. It's a completely open-source hybrid that fuses a web forum with an in-browser 2.5D multiplayer world!

---

## 🎮 What is Saints Gaming?

Saints Gaming started way back in 2007 as a chill group of friends hanging out on TeamSpeak, playing SA-MP, FiveM, sandbox builders, and whatever else sounded fun. Over the years, our motto has always been simple: *Time To Play* — just hang out, game together, and have a good time with zero drama.

This project brings our community hub together with an interactive multiplayer game:

- **The Community Hub**: Forums to chat, news updates, game server status trackers (so you can see who's online on our servers), and a FiveM player portal.
- **The Lobby (The Game)**: A browser-based multiplayer world where you can explore, build a Saint from a playable Archetype and modular Classes, grow long-term skills, collect Creatures, and fight Monsters with friends.
- **World Studio**: A built-in creator suite for Tile Maps, Voxel Maps, infinite procedural Fractal Domains, Archetypes, Classes, abilities, quests, dialogue, creatures, monsters, assets, and live world releases.
- **Combat**: Creature Battles are turn-based and capture-focused. Monster Battles are real-time, open-world action combat. A Creature can be configured to appear in both systems; a Monster is action-combat-only.

---

## 🛠️ How to Run it Locally

If you want to poke around the code, run it on your own machine, or test things out:

### What you need
- **Node.js** (v22 or newer recommended)
- **Git**

Linux is the primary deployment target. Windows is supported for local development and the Saints desktop app. The built-in setup supports Caddy for HTTPS and reverse-proxy configuration, but Caddy is optional.

### Steps

```bash
# 1. Clone this repository
git clone https://github.com/giogimic/SaintsGamingWeb.git
cd SaintsGamingWeb

# 2. Install dependencies and set up the local database
npm run setup

# 3. Start the local server
npm run dev
```

Once it's running, open [http://localhost:24001](http://localhost:24001) in your browser.

---

## 📜 Changelog

### v2.1.917 - Canonical Gameplay, Studio, and Deployment Documentation
- **Canonical terminology:** Defined Archetypes as playable player foundations and Classes as modular ability, stat, and equipment packages that Archetypes can equip.
- **Combat clarity:** Replaced retired battle labels with Creature Battles (turn-based capture) and Monster Battles (real-time action); documented the Creature-to-Monster configuration boundary.
- **Studio map boundaries:** Documented Tile Maps, Voxel Maps, and Fractal Domains as separate authoring systems.
- **Linux-first delivery:** Documented Linux as the primary server target, with Windows compatibility retained and built-in Caddy support kept optional.

### v2.1.911 - Go MMO Snapshot Lazy Fetching, JoinMap Definition Canonicalization & Atlas Checksum Resilience
- **Go MMO Snapshot Lazy Fetching (`FetchMapDef`):** Wired up `wm.FetchMapDef` in `the-lobby/cmd/server/main.go` to lazily query `WorldMapSnapshot` from SQLite on demand. Any map requested by clients or transitions that is not yet resident in memory is dynamically parsed and instantiated with its full grid, gates, and encounters.
- **JoinMap Definition Canonicalization & Case-Insensitive Matching:** In `the-lobby/internal/world/manager.go`, `JoinMap` now calls `GetDef(baseMapID)` before assigning shards, properly canonicalizing map IDs case-insensitively and triggering lazy loading. This eliminates the edge case where un-cached maps or casing variations dropped players into empty 128x128 fallback voids.
- **Atlas Compiler Checksum Fallback Resilience:** In `app/actions/studio/compiler/AtlasCompiler.ts`, missing `artifactChecksum` values on regions now generate a deterministic fallback checksum and log a non-fatal warning instead of halting compilation with a hard error.
- **Go MMO Sync Webhook Aliases:** Registered `/api/internal/sync-map` and `/api/sync/map` aliases alongside `/api/internal/sync` in `the-lobby/internal/httpapi/maps.go`, ensuring 100% compatibility across all pipeline documentation, scripts, and webhook callers.

### v2.1.909 - Setup Flow Finalization, Starter Pack Detection, Resilient Spawn Fallback & Offline Screen Clarity
- **Setup Completion & Starter Pack Setting Alignment:** Fixed an issue where importing a starter pack (such as `blank-canvas`) recorded `STARTER_PACK_IMPORTED` but omitted `SETUP_COMPLETED` and `GAME_INITIALIZED`, causing the system to falsely report that setup was never completed. Both flags and timestamps are now written explicitly, and `setupDetection.ts` now checks `STARTER_PACK_IMPORTED` as an additional completion indicator.
- **Package Import Auto-Publish Pipeline:** In `/api/setup/import`, ensured `worldProject` and `gameConfig` exist for project `saints`, wrote complete initialization and setup completion flags, and automatically compiled and deployed an initial `WorldRelease` when maps are imported so the imported world is immediately playable.
- **Resilient Canonical World Spawn Resolution:** Removed the hard-abort exception in `WorldCompiler.ts` when `defaultSpawnGateId` is undefined or unconfigured in `GameConfig`. The compiler now smoothly checks for explicit SPAWN-category gates or falls back safely to the primary map coordinates without crashing the publish pipeline.
- **Restore Pipeline Active Promotion:** Updated `restoreWorldRelease` in `publishing.ts` to demote existing `LIVE` releases and promote the restored snapshot to `LIVE` in an atomic transaction before dispatching the sync notification to Go MMO shards.
- **Go MMO Release Query & Snapshot Optimization:** In `the-lobby/internal/world/release.go`, updated `ActiveReleaseVersion` to prioritize releases with `status = 'LIVE'`, and simplified `ParseRelease` to query `WorldMapSnapshot` directly by `releaseId` instead of relying on a subquery. Demoted older releases to `PUBLISHED` in Go's SQLite database when ingesting a new `LIVE` release.
- **Game Offline Screen & Admin Navigation:** Updated `the-lobby/index.tsx` to pass `isAdmin` and an active `onRefresh` handler when no active release is deployed. Updated `GameOfflineScreen.tsx` to offer both "Open World Studio" (`/studio`) and "Realm Setup" (`/setup`) actions for world developers, eliminating navigation loops.
- **Setup Wizard Interaction Guardrails:** Guarded `WorldGenerationStep.tsx` against repeated `onChange` dispatches by checking `startingMap.bootstrapRevisionId !== bootstrapRevisionId`, and updated `PublishReviewStep.tsx` to read `data.defaultMapId`.

### v2.1.908 - Go MMO SQLite Schema Fix, Studio Deployment Sync & Published Pipeline Hardening
- **Go MMO SQLite Schema Alignment:** Fixed critical queries in `the-lobby/internal/world/release.go` (`ActiveReleaseVersion`, `ParseRelease`) by removing non-existent `LEFT JOIN WorldProject` clauses that caused SQLite errors (`no such table: WorldProject`), which previously prevented Go MMO from loading releases and map snapshots on startup and on-demand.
- **Go MMO Migration V7:** Added `migrateV7` to automatically provision `WorldRelease` (with `id`, `projectId`, `version`, `manifestData`, `publishedBy`, `status`, `createdAt`) and `WorldMapSnapshot` tables in Go's SQLite database on startup, ensuring shard tables are always ready before first sync.
- **Studio Release Deploy Sync Notification:** Added `MapSyncService.enqueueProjectRelease()` into `deployWorldRelease` (`world-release.ts`), ensuring Go MMO runtime shards are eagerly and immediately notified whenever a release is published or deployed from the Studio UI.
- **Publish Route Decoupling & Checksum Alignment:** Updated `/api/world/publish` to resolve projects by either CUID or slug (`saints`), and aligned region validation with `AtlasCompiler` to check `artifactChecksum` without requiring in-memory voxel data rows.
- **Resilient Go MMO URL & Port Fallbacks:** Updated `the-lobby/internal/config/config.go` and `deployPublishedProjectRelease` in `maps.go` to fall back through `NEXT_JS_URL`, `NEXT_URL`, `NEXT_PUBLIC_SITE_URL`, and default to `http://127.0.0.1:24001` (matching Saints Web's default port), sending both `Authorization` and `X-Saints-Internal-Secret` headers.
- **Spawn Map Auto-Healing:** Added auto-healing in Go's `deployPublishedProjectRelease` and `ApplyReleaseMaps` so that if a canonical spawn map ID casing differs or is missing, it automatically resolves to the first available map in the release rather than rejecting the deployment.
- **Targeted Recovery Toasts:** Updated `the-lobby/internal/socket/handler.go` so the recovery notice is only shown if the player was genuinely relocated away from an invalid map.

### v2.1.907 - Studio Release Pipeline Hardening & Resilient Runtime Sync
- **Studio Release Pipeline Verification:** Audited all compiler, publish, and restore stages against `.docs/STUDIO-RELEASE--PIPELINE/`. Resolved potential failure vectors where dangling or missing sub-dependencies could block publishing.
- **Resilient Connection & Dependency Resolvers:** Upgraded `ConnectionCompiler.ts` to automatically route warp gates to destination map spawns/entry points and record non-fatal warnings instead of hard aborting on unlinked gates. Updated `ActorDependencyResolver.ts` and `GameplayDependencyResolver.ts` to push non-fatal warnings for missing optional NPC, creature, item, ability, and quest templates.
- **Go MMO Multi-Secret & Docker Networking Support:** Updated `the-lobby/internal/config/config.go`, `goMmoNotify.ts`, and `docker-compose.yml` to support `GO_MMO_ADMIN_SECRET`, `GO_MMO_INTERNAL_SECRET`, and `GO_MMO_INTERNAL_URL`, guaranteeing internal notification delivery in containerized and bare-metal environments.
- **Map Loading & Snapshot Fallback:** Upgraded `/api/maps/[slug]` with case-insensitive map resolution and `worldMapSnapshot` fallback, ensuring all published release maps can be loaded even if working-world tables are altered.
- **Restore Pipeline Go MMO Synchronization:** Added `MapSyncService.enqueueProjectRelease()` call in `restoreWorldRelease` (`publishing.ts`), ensuring Go MMO runtime shards stay synchronized whenever an admin restores a world snapshot backup.
- **Character Select Location Routing:** Improved character login in `CharacterSelectScene.tsx` and `the-lobby` socket handler to preserve character's saved map ID and avoid spurious "location no longer exists" toasts on normal fresh logins.

### v2.1.906 - World Compiler Spawn Fallback & Go MMO On-Demand Recovery
- **Resilient World Compiler Spawn Resolution:** Upgraded `WorldCompiler.ts` with fallback scanning for `category === 'SPAWN'` gates, explicit `spawnPoint` positions, and map origins, preventing fatal publish aborts when custom spawn gates are configured in Studio.
- **Map Spawn Coordinate Propagation:** Configured `WorldCompiler` to embed exact `spawnX`, `spawnY`, and `spawnZ` coordinates directly into `ctx.manifest.maps` for the designated spawn map, ensuring Go MMO receives accurate spawn points.
- **Go MMO Shard On-Demand Auto-Recovery:** Implemented `LoadActiveRelease()` and fallback handling in `the-lobby/internal/socket/handler.go` and `manager.go` so when players connect or join a map without prior cache, Go MMO loads the release on demand from SQLite/MySQL or recovers gracefully to the demo realm rather than dropping players with a connection rejection.

### v2.1.905 - Complete Studio-to-Game Release Pipeline Alignment
- **Go MMO Release Sync On Setup:** Dispatched `MapSyncService.enqueueProjectRelease()` during `initialize-game` setup so Go MMO automatically ingests the newly compiled release manifest, registering maps, gates, NPCs, and canonical world spawn.
- **Project ID & Slug Decoupling:** Upgraded `/api/internal/projects/[slug]`, `/api/internal/worlds/[mapId]/[version]/manifest`, and `/api/internal/worlds/[mapId]/[version]/regions/[regionX]/[regionZ]` to resolve projects by either ID (CUID) or slug (`saints`), preventing 404s when Go MMO pulls published releases and voxel artifacts.
- **Atlas Map ID Delimiter Hardening:** Fixed region manifest parsing in `/api/internal/worlds/.../manifest` so maps with underscores (e.g. `STARTING_MEADOW`) correctly extract region coordinates instead of returning an empty array.
- **Auto-Promotion on Studio Publish:** Configured `createWorldRelease` in `world-release.ts` to automatically call `deployWorldRelease`, promoting newly compiled releases to `LIVE` status.
- **Go MMO SQL Query Robustness:** Updated `ActiveReleaseVersion` and `ParseRelease` in `the-lobby/internal/world/release.go` with `LEFT JOIN WorldProject` and `ORDER BY createdAt DESC` fallback to ensure seamless boot and shard map loading.

### v2.1.904 - World Release Fallback Resolution, Studio Hook Fix & Linux SAMP Server Management
- **Spawn Map & World Release Fallback:** Resolved "Cannot create character: No spawn map configured" and false setup-pending prompts. Upgraded `getActiveWorldRelease` to resolve project ID or slug across `LIVE`, `PUBLISHED`, or latest database releases, and added robust fallback chains in `CharacterCreateScene`, `character-creator`, and `The Lobby` so players are never blocked if a release compilation is pending.
- **Studio React Hook Fix (#310):** Hoisted conditional `useEditorStore` hooks to the top level of `StudioEditorShell.tsx`, resolving React error #310 during Author session initialization on `/studio`.
- **Debian / Linux Native SAMP Lifecycle:** Upgraded `SampManager` with cross-platform binary auto-detection (`omp-server`, `start.sh`, `samp03svr` on Linux vs `.exe` on Windows), line ending sanitization (CRLF -> LF), executable chmod enforcement, persistent PID file tracking (`server.pid`), process-group graceful signal termination (`SIGTERM`/`SIGKILL`), and added server restart support.
- **Server File Manager & Window Sizing:** Added responsive window containment (`min(defaultWidth, 96vw)`, `min(defaultHeight, 88vh)`) with inner flex scroll, collapsible deployment cards, and a real-time file search filter to prevent UI overflow on displays and long directory listings.

### v2.1.903 - Optimize Build Pipeline & Route Dynamism
- **Dynamic Server Usage Fix:** Configured `/api/servers/status` with `export const dynamic = "force-dynamic"` to resolve `DYNAMIC_SERVER_USAGE` errors caused by reading client request headers during static prerendering.
- **Lazy Bake Worker Pool:** Deferred `WorldBakeService` thread pool initialization to on-demand job submission, preventing premature worker instantiation and critical missing bundle warnings during Next.js static build phases.

### v2.1.902 - Purge Obsolete Fix/Scratch Scripts & Enforce Git Ignore
- **Repository Cleanup:** Eradicated all 38 obsolete scratch and fix scripts (`fix*.js`, `fix_db.*`, `patch.js`, `temp.ts`, `app/api/admin/fix-db/route.ts`, broken `scripts/check-*.ts`, and the deprecated `.scripts/` engine extraction directory).
- **Git Hygiene Protection:** Updated `.gitignore` to prevent any temporary fix/patch scripts from being accidentally tracked or deployed to production servers.

### v2.1.901 - Fix Internal Project Route Snapshot Typo & Type Alignment
- **Prisma Field Alignment:** Fixed TypeScript compile failure in `app/api/internal/projects/[slug]/route.ts` where `release.snapshots` was referenced instead of `release.mapSnapshots`.
- **Test Definition Compatibility:** Corrected `projectId` property references to `gameId` in creature and NPC release integration tests.

### v2.1.885 - Initialization Generation Diagnostics
- **Observable Setup Pipeline:** Stripped out opaque, fake progress timers during setup in favor of a real-time `DiagnosticConsole` that tracks exactly what happens across 13 backend stages.
- **Unified Correlation:** Implemented a new `SetupLogger` that generates deterministic logs using a unified `initializationId`, correlating the frontend wizard to the backend persistence layer.
- **Explicit Fractal Hand-off:** The setup process now explicitly logs Fractal bake generation as `SKIPPED`, rather than bypassing silently, and logs the canonical map contract with its `proceduralConfig`.

### v2.1.857 - Actor Editor Architecture Standardization
- **Unified World Model Selector:** Abstracted the World Model visualization logic (2D Sprite, 2D Box Sprite, 3D Model, Other) into a unified `WorldModelSelector` component.
- **Strict Actor Boundaries:** Segmented the editor UI to reflect strict architectural boundaries:
  - **Archetype Editor:** Uses World Model.
  - **Creature Editor:** Uses World Model and introduces an independent Battle Appearance configuration (front/back sprites).
  - **Monster & NPC Editors:** Created standalone thin UI wrappers utilizing the World Model selector, streamlining the setup flow and enforcing clear scope boundaries without unnecessary backend schema churn.
- **UI Integrity:** Fixed UI duplication and TS reference issues in the Archetype Editor.

### v2.1.818 - Dynamic Perspective System
- **Player-Controlled Camera:** Map authors can no longer lock players into forced camera perspectives (e.g. First Person or Top-Down).
- **Dynamic Camera Mode:** Players now have complete autonomy to choose their perspective via the Game Options menu. The new "Dynamic (Auto)" default camera style seamlessly transitions from First Person (fully zoomed in), to Third Person Over-Shoulder, to 2.5D Isometric (fully zoomed out) organically as the player scrolls their mouse wheel.

### v2.1.817 - Full Uninstall Script
- **Server Cleanup:** Added `scripts/uninstall.sh` to cleanly and safely remove Saints Gaming from a server. It stops PM2 web services, stops and removes systemd Go Lobby services, resets the Prisma database, and self-destructs the project files to leave no trace. Includes a mandatory confirmation safeguard.

### v2.1.816 - Setup Wizard Re-entry & Base Class Seeding
- **Admin Re-entry:** Added `?reinit=true` flag to `/setup` route to allow Server Administrators (permissionLevel >= 80) to bypass the "Setup Completed" lock. This restores the ability to edit the Game Identity, configure initial Entities, and tweak Environment variables post-launch without needing a full DB wipe.
- **Base Class Seeding:** Added `scripts/ensure-base-classes.ts` which is now automatically invoked during `update.sh --db`. This ensures the 5 core base classes (Warrior, Mage, Ranger, Paladin, Priest) are always reliably populated into the `CharacterClass` table for existing installations, fixing the issue where they were missing in the Studio class dropdown.

### v2.1.815 - Remove Hardcoded Default Archetypes
- **No More Ghost Archetypes:** Removed `DEFAULT_STARTER_HERO_PRESETS` fallback from `getStarterHeroes()` and the setup wizard. Archetypes now only exist if explicitly created through the Setup Wizard or Hero Studio. If none exist, the character creator shows a clear "No archetypes available" message instead of injecting 5 hardcoded defaults.

### v2.1.814 - Lobby Layout Fix (White Square / Purple Backdrop)
- **Root Cause:** The lobby's `MainLayoutShell` branch was rendering `AmbientBackground` (purple tropical backdrop), the site `Navbar`, and `GlobalBottomBar` as siblings of the game canvas. Since `TheLobby` uses `fixed inset-0 z-30`, these elements overlapped — the game HUD went under the navbar and the canvas appeared as a white square on the purple ambient background.
- **Fix:** Lobby now uses the same full-bleed pattern as Studio — no site chrome (navbar/bottombar/ambient bg). The game owns the entire viewport.

### v2.1.813 - Game Client & Setup Redirect Fixes
- **Lobby Architecture:** Delegated `PlayerClient.tsx` back to the battle-tested monolithic `index.tsx` component to restore immediate functionality (movement, chunk loading, Studio-to-Lobby integration) while the new `src/client/` architecture is built in parallel.
- **Fresh Install Redirects:** Added `getSystemSetupStatus` check to the root page (`/`) and home page (`/home`) so that new installs immediately push admins to the web setup wizard (`/setup`).

### v2.1.812 - Setup Script UX & Build Reliability
- **Clearer Setup Prompts:** Rewrote all `whiptail` menus to use plain-language descriptions explaining what each option does and why you'd pick it.
- **Live Build Output:** Replaced the silent background spinner with live Docker build output so you can actually see what's happening (npm ci progress, Next.js compilation, errors).
- **Automatic Swap Provisioning:** If the VPS has less than 3GB RAM and no swap, setup now creates a 2GB swap file before building to prevent OOM kills during Next.js compilation.
- **Docker Layer Caching:** Removed `--no-cache` so repeat builds use layer caching and finish in minutes instead of 15+.
- **Build Failure Diagnostics:** Added clear error messages with common causes when the Docker build fails.

### v2.1.811 - ChunkStreamer Transport Readiness & Diagnostics
- **Transport Readiness Queue:** Fixed a race condition where `ChunkStreamer` permanently swallowed chunk requests if the socket was still connecting. It now accurately subscribes to `useGameStore`'s `connectionStatus` and queues requests.
- **Go MMO Configuration Diagnostics:** Added a development diagnostic log in `index.tsx` to surface the resolved socket connection URL. This proves whether remote clients are improperly connecting to `127.0.0.1`.
- **Chunk Lifecycle Debugging:** Added structured lifecycle logs to trace chunk states from queued, sent, received, decoded, to meshed.

### v2.1.782 - Voxel Terrain UI Fix
- Fixed a bug where the `VoxelTerrainBrushPanel` was stuck open globally across the entire studio by correctly wrapping it in a dockable `<DraggablePanel>` window and restricting its rendering specifically to Voxel mode.

### v2.1.781 - Saints Atlas (Procedural World Generation)
- **Mathematical World Fields:** Implemented Atlas deterministic World Fields and Geographical Fractal Areas (`FractalArea.ts`) to describe climate rules (temperature, moisture) and terrain multipliers.
- **Atlas Decorators:** Added a deterministic `mulberry32` PRNG to `VoxelWorldGenerator` to scatter flora, trees, dead bushes, and subsurface ores onto chunks dynamically based on the generated `FractalArea` climate.
- **Voxel Generator Refactor:** Ripped out the legacy `DeterministicNoise2D` logic and completely wired chunk generation to consume Atlas regions, enabling fully geographic and structured terrain generation.
- **Sea Level UI:** Added a "Sea Level" configuration slider to the Procedural Map generator UI to govern global fluid boundaries.

### v2.1.776 - Canvas Editor Isolation & Cursor Drift Fixes
- Refactored `TileCanvasBabylon` and `VoxelCanvasBabylon` tools to use `context.updateMapData` to prevent edits in secondary panels from mutating the primary map.
- Added a `ResizeObserver` to `<canvas>` components to explicitly call `babylonEngine.engine.resize()`, resolving cursor drift when dragging panel splitters.
- Fixed type errors and syntax errors related to missing prop spreading.

### v2.1.775 - Studio Canvas Architecture Overhaul

- Unified Tile and Voxel canvases into a clean renderer pattern.
- Extracted MMO playtest loops to PlaytestRuntime.tsx.
- Resolved canvas cursor drift and UI isolation bugs.

### v2.1.774 - Setup Wizard Upload Window Isolation Fix
- Fixed the Sprite Browser's "Upload" button so that it opens the `AssetUploadPanel` in its own completely separate, resizable DraggablePanel floating window, rather than squashing it inside the fixed 80vh Setup Wizard modal!

### v2.1.773 - Setup Wizard Upload UI Fix
- Added an embedded Upload UI directly into the `SpriteBrowser` so that users can actually upload sprites during the setup wizard when clicking "Click to select or upload a creature battler sheet".

### v2.1.772 - Studio Asset Upload UX & Voxel React Fixes
- Added `AssetUploadPanel` to open the Asset Upload tool in its own resizable DraggablePanel window.
- Fixed `Cannot read properties of undefined (reading 'userId')` crash when connecting to realtime without an event payload.
- Fixed `Minified React error #300` when painting Voxel maps by wrapping the state update in `startTransition`.

### v2.1.771 - Voxel Canvas UX, Spawn Loop & Freezing Fixes
- **Voxel Canvas Editing Fixed:** Allowed dynamic chunk generation when painting solid blocks on blank procedural/empty maps. Voxel raycasting tests and resolution math has been fixed to align with the non-centered coordinate system mapping.
- **Async Flood Fill:** Refactored the Voxel Volumetric Fill tool into an asynchronous routine, breaking the 65,000 block fill queue into sub-chunks. This totally resolves the UI thread freezing bugs observed on large empty maps.

### v2.1.771
- Fixed a bug where voxel maps would lose their `mapType` during canvas hydration, causing them to become uneditable and convert to tile maps when saved.
### v2.1.768
- **Voxel Canvas Decoupling**: Completely stripped legacy 2D Tile logic (freeform layers, 2D brushes, and layer isolation tools) from `VoxelCanvasBabylon.tsx`, ensuring a pure 3D canvas environment.
- **Voxel Map Persistence**: Fixed an issue where the database would drop voxel chunks during fallback saves and revert Voxel maps into Tile/Hybrid maps.
- **Editor UI Glitches**: Resolved the "Green Box" clipping glitch caused by empty voxel maps triggering the 2.5D logic grid fallback geometry.
- **Voxel Tool Support**: Voxel painting tools now work properly by disabling the invisible 2D click-intercept plane (`mapPickPlane`) when in Voxel mode, allowing 3D raycasting against chunk meshes.

### v2.1.767
- **Hero Studio UI**: Replaced the raw text inputs for Sprite Key and Sprite Bundle ID with a unified "Select Character Sprite" button.
- **Web Setup UI**: Updated the `EntitySetupStep` to use the unified `SpriteBrowser` catalog instead of the old `RoleAwareAssetPicker`, bridging the UI consistency between the setup phase and Hero Studio.
- **Spawn Logic Integration**: Ensured that the Character Creator spawns players properly on the server by relying on the `getSpawnMapId()` Server Action which correctly reads the `SPAWN_MAP_ID` site setting instead of a hardcoded map name fallback.
- **Atlas Hub Sync**: Setting a map as a Hub from the World Atlas will now properly synchronize with the `SPAWN_MAP_ID` site setting so the changes propagate globally.

### v2.1.750
- **Tile Studio UX:** Added a dedicated Logic Palette for collision and game logic tile painting when `activeLayerIdx === -1`.
- **Brush Patterns:** Improved `activeBrushPattern` to work smoothly alongside the Paint brush tool, stamping multi-tile selections natively without relying on a distinct Paste mode.
- **Creature Engine:** Extended the `AbilityDictionary` and `CreatureTemplate` Prisma schema models with `Mythos` references to accurately support creature classification as outlined in the game bible taxonomy.

---

## Changelog

**v2.1.894**
- Built **SA-MP Remote Integration Architecture**:
  - `GameServer` schema extended to support remote servers via `apiKeyHash`.
  - Added standalone `saints-server-agent` to be run on external nodes to securely poll UCP for remote commands and push stats.
  - New `SampPlayerSession` and `SampLinkCode` Prisma models for syncing live player states and generating one-time authentication link codes.
  - Implemented `/api/samp/player/*` and `/api/servers/[serverId]/commands` endpoints, secured via SHA-256 API Key verification headers.

---

## 📖 Documentation

If you are looking for **deep technical breakdowns**, engine architecture, and creator guides, please check out our interactive **Wiki** directly on the website once you have the app running, or navigate to the `/wiki` page on saintsgaming.net!

---

## 💬 Community & Links

Come say hello, hang out, or give feedback! We'd love to have you:

- **Website:** [https://saintsgaming.net](https://saintsgaming.net)
- **Discord:** [discord.saintsgaming.net](https://discord.saintsgaming.net)
- **GitHub:** [giogimic/SaintsGamingWeb](https://github.com/giogimic/SaintsGamingWeb)

---

## 📄 License & Notes

- **Creator:** GioGimic
- **License:** [Business Source License 1.1 (BSL-1.1)](LICENSE). Free for personal use, learning, modding, and community self-hosting.
- © 2007–2026 Saints Gaming.
