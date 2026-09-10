# Saints Gaming

> **Time To Play** — Welcome to the Saints Gaming community platform & game project!

Hey everyone! Welcome to the repository for **Saints Gaming**. 

I'm building this for our community. This is a passion project I build for fun in my spare time, designed to serve as our community's home base. It's a completely open-source hybrid that fuses a web forum with an in-browser 2.5D multiplayer world!

---

## 🎮 What is Saints Gaming?

Saints Gaming started way back in 2007 as a chill group of friends hanging out on TeamSpeak, playing SA-MP, FiveM, sandbox builders, and whatever else sounded fun. Over the years, our motto has always been simple: *Time To Play* — just hang out, game together, and have a good time with zero drama.

This project brings our community hub together with an interactive multiplayer game:

- **The Community Hub**: Forums to chat, news updates, game server status trackers (so you can see who's online on our servers), and a FiveM player portal.
- **The Lobby (The Game)**: A browser-based multiplayer world where you can drop in as a character, explore, and hang out with friends directly in your browser.
- **World Studio**: A built-in map builder where you can paint terrain, build structures, set up areas, and test them live.

---

## 🛠️ How to Run it Locally

If you want to poke around the code, run it on your own machine, or test things out:

### What you need
- **Node.js** (v22 or newer recommended)
- **Git**

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

Once it's running, just open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 📝 Changelog

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
