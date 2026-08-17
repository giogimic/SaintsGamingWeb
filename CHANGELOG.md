## [2.1.344] - 2026-08-17
### Added & Fixed
- **Setup Completion Determinism & Fresh-Install Loop Fixes:**
  - **Deterministic default map persistence (`app/api/setup/complete/route.ts`)**: Setup completion now validates and persists explicit `defaultMapId` values instead of silently relying on nondeterministic DB-first map fallback.
  - **Wizard completion contract (`FirstTimeSetupWizard.tsx`)**: Setup finalization now submits `defaultMapId` by selected starter path (`SAINTS_HAVEN` for community starter, `STARTING_MAP` placeholder for blank-canvas flow).
  - **Post-complete verification guard (`FirstTimeSetupWizard.tsx`)**: Added immediate setup-status verification before route handoff to reduce stale-state bouncebacks.
- **Blank-Canvas Studio Start Path Hardening:**
  - **Studio author entry defaults (`src/web/components/the-lobby/index.tsx`)**: Studio author sessions now prefer `STARTING_MAP` blank-canvas behavior and avoid demo-biased fallback during fresh world creation.
  - **Setup gate correction (`GameTitleScreen.tsx`, `index.tsx`)**: Setup redirects now trigger only when setup is incomplete, preventing completed blank-canvas installs (`mapCount === 0`) from being forced back to setup.
- **Studio UI Viewport Safety:**
  - **Realm Settings modal containment (`RealmSettingsModal.tsx`)**: Added viewport-bounded modal height and internal scrolling to prevent controls from rendering off-screen.
- **Character-Select Chat Duplicate Mitigation:**
  - **Chat bridge dedupe (`src/web/components/the-lobby/index.tsx`)**: Added canonical event dispatch + short-lived dedupe key cache across chat channels (`player_chat`, `global_chat_msg`, `chat_message`) to reduce duplicate feed lines.

## [2.1.343] - 2026-08-17
### Added & Fixed
- **Selection Enhancements & Shift+Click Line Painting (Phase 5C):**
  - **Select All & Deselect Shortcuts (`StudioEditorShell.tsx`)**: Added `Ctrl+A` / `Cmd+A` (Select All map tiles) and `Ctrl+D` / `Cmd+D` (Deselect / Clear selection), syncing with Babylon viewport overlay.
  - **Shift+Click Straight-Line Painting (`GameCanvasBabylon.tsx`)**: Holding `Shift` while clicking in Paint or Erase mode rasterizes and paints all tiles along a straight line from `lastPaintedTile` to current target coordinate using Bresenham's algorithm.
  - **Layer Isolation & Dimming Engine (`BabylonEngine.ts`)**: Added `highlightCurrentLayer(layerIdx)`, `restoreLayerIsolation()`, and `toggleLayerIsolation(layerIdx)` methods in Babylon engine. Toggling `H` dims non-active layers and paint overlays to 0.35 opacity.
  - **Bresenham Line Rasterizer (`lineRaster.ts`, `lineRaster.test.ts`)**: Pure line rasterization utility with unit tests for horizontal, vertical, diagonal, and arbitrary slope lines.

## [2.1.342] - 2026-08-17
### Added & Fixed
- **Tool Mode Shortcuts (Phase 5B):**
  - **Tool Mode Key Bindings (`StudioEditorShell.tsx`)**: Added single-key shortcuts for rapid tool switching in Editor runtime:
    - `B`: Paint Brush (`setBrushMode('paint')`)
    - `E`: Eraser (`setBrushMode('erase')`)
    - `I`: Eyedropper / Tile Sample (`setBrushMode('eyedropper')`)
    - `M`: Marquee Selection (`setBrushMode('select')`)
    - `G`: Prefab Stamp (`setBrushMode('prefab')`)
    - `H`: Layer Isolation Toggle (`studio_toggle_layer_dim`)
  - **Interactive Input & Dialog Guard**: Ensured single-key shortcuts only execute when not typing in inputs/textareas and no dialog modals are open.
  - **Tooltips & HUD Hints (`StudioPaintHud.tsx`)**: Updated tooltips across all toolbar buttons with their corresponding hotkey hints.
  - **Tool Shortcuts Engine & Tests (`studioShortcuts.ts`, `studioShortcuts.test.ts`)**: Created pure resolver engine with comprehensive unit tests.

## [2.1.341] - 2026-08-17
### Added & Fixed
- **Stamp & Brush Transform Shortcuts (Phase 5A):**
  - **Transform Shortcuts (`StudioEditorShell.tsx`)**: Added Tiled-standard key bindings: `X` (Flip Stamp Horizontally), `Y` (Flip Stamp Vertically), `Z` (Rotate Stamp 90° Clockwise), and `Shift+Z` (Rotate Stamp 90° Counter-Clockwise).
  - **HUD Visual Indicators (`StudioPaintHud.tsx`)**: Added persistent visual transform chips and quick-action buttons with active state highlighting and rotation angle readouts (`0°`, `90°`, `180°`, `270°`).
  - **Transform Mathematics Engine (`stampTransform.ts`, `stampTransform.test.ts`)**: Built 2D matrix transformation pipeline for horizontal/vertical flipping and 90°/180°/270° clockwise rotations.
  - **Transformed Clipboard Pasting (`editor-store.ts`)**: Integrated active `stampTransform` state into `pasteClipboard` to automatically transform multi-tile clipboard layers prior to canvas stamping.

## [2.1.340] - 2026-08-17
### Added & Fixed
- **Bundled Assets as Optional Asset Packs (Phase 3B):**
  - **CLI Asset Pack Installer (`scripts/install-asset-pack.ts`, `npm run assets:install`)**: Added command-line utility to selectively install and register asset packs (e.g. `--pack=tilesets`, `--pack=creatures`, `--pack=all`).
  - **Selective Asset Pack API (`/api/assets/install-pack`)**: Added dedicated REST endpoint with elevate/admin permission checking to install single or multiple packs on demand.
  - **In-Studio Asset Pack Installer (`AssetPackInstaller.tsx`)**: Created modular pack installer UI with pack overview cards, preview strips, asset count estimates, and instant sync actions.
  - **Full-Screen Asset Browser Integration (`FullScreenAssetBrowser.tsx`)**: Added dedicated "Asset Packs" tab for effortless asset pack discovery and installation directly from Studio.

## [2.1.339] - 2026-08-17
### Added & Fixed
- **"Sheets" Category & Spritesheet Asset Management (Phase 4A):**
  - **Dedicated "Sheets" Category (`AssetEditor.tsx`)**: Added `SHEET` as a first-class asset filter option in the sidebar and type selector dropdown, automatically querying multi-frame sheets.
  - **Asset Card Badges & Metadata**: Added pack origin badges (`Saints`, `Tuxemon`, `LPC`), frame counts (`16f`, etc.), and sheet markers across Grid and List views.
  - **Sheet Asset Ingestion (`sync-local-assets.ts`, `assetPackInstaller.ts`)**: Auto-tagged battle animation sheets, NPC walk cycles, and hero sprites with `sheet` and `spritesheet` taxonomy.
  - **Spritesheet Helper Utilities (`assetSheets.ts`)**: Added helper functions and unit tests for spritesheet classification and multi-frame grid dimension calculations.

## [2.1.338] - 2026-08-17
### Added & Fixed
- **Zoom Presets, Percentage Display & Navigation Aids (Phase 2B):**
  - **Live Zoom Percentage & Presets (`StudioBottomToolbar.tsx`)**: Added zoom percentage readout and dropdown presets (`25%`, `50%`, `100%`, `200%`, `400%`) synchronized with Babylon camera orthographic size.
  - **Keyboard Shortcuts (`StudioEditorShell.tsx`)**: Added `Ctrl+0` / `Cmd+0` shortcut to instantly reset zoom to 100% and wired `Home` to `studio_fit_map`.
  - **Camera Fit & Zoom Dispatch (`BabylonEngine.ts`)**: Added `fitMapInView()`, `setZoomPercent()`, and global event listeners for `studio_set_zoom` and `studio_fit_map` with two-way `studio_zoom_changed` event notifications.
  - **Zoom Calculations & Math (`zoomMath.ts`)**: Added utility functions and unit tests for ortho/percentage conversions and aspect-ratio-aware fit-map framing.

## [2.1.337] - 2026-08-17
### Added & Fixed
- **Unified Tileset Browser & Asset Integration (Phase 4C):**
  - **Dynamic Tileset Management (`TilesetPicker.tsx`)**: Upgraded Tileset Picker with an integrated "+ Add Tileset" modal searching `type: 'TILESET'` assets in the Asset Catalog and calculating automatic `firstgid` offsets.
  - **Map Tileset Removal & Search**: Added quick filtering across map tilesets and one-click removal with confirmation.
  - **Asset Catalog Integration (`AssetEditor.tsx`, `WorldBuilderPanel.tsx`)**: Added "Use as Map Tileset" action to Asset Inspector and linked `onUpdateTilesets` state updates to mark maps dirty.
  - **Tileset Calculations (`tilesetCalculations.ts`)**: Added unit-tested helper utilities for `firstgid` progression and bi-directional GID/coordinate translations.

## [2.1.336] - 2026-08-17
### Added & Fixed
- **Creature Asset Sub-Categories & Fine-Grained Filtering (Phase 4B):**
  - **Creature Classification Suite (`creatureCatalog.ts`)**: Defined `CreatureAssetSubcategory` types (`battle_sheet`, `front_sprite`, `back_sprite`, `face_portrait`, `overworld`) and pattern classifier `classifyCreatureAsset()`.
  - **Asset Tagging in Ingestion Pipelines (`sync-local-assets.ts`, `assetPackInstaller.ts`)**: Auto-tagging all imported game assets with specific sub-categories and `creature:<subcat>` tags.
  - **Asset Manager Filtering & Badges (`AssetEditor.tsx`, `SpriteBrowser.tsx`)**: Added subcategory dropdown selectors and colorful badges on grid/list cards for creature front/back sprites, face portraits, and battle sheets.

## [2.1.335] - 2026-08-17
### Added & Fixed
- **Setup Flow Polish & Asset Import Stage (Phase 7B):**
  - **Bundled Asset Pack Installer (`src/server/assetPackInstaller.ts`)**: Built structured asset installer for selective registration of 8 core asset libraries (Tilesets, Creature Sheets, Portraits, LPC NPCs, Hero Sprites, Items, Objects, and UI).
  - **First-Time Setup Asset Screen (`FirstTimeSetupWizard.tsx`)**: Added Step 3 for interactive multi-select asset pack installation with live progress, count metrics, and quick-skip support.
  - **Studio-First Launch Flow**: Replaced equal-weight landing buttons with a prominent primary "Launch World Studio" action.
  - **Setup Assets API (`app/api/setup/assets/route.ts`)**: Added authenticated API route to query available bundled asset packs and trigger batch installations.

## [2.1.334] - 2026-08-17
### Added & Fixed
- **Zero-Asset Setup & Resilient Tileset Loading (Phase 3A.1):**
  - **Tileset Disk Introspection (`demoMapSeed.ts`)**: Added `checkTilesetExistsOnDisk()`, `hasBundledTilesetsOnDisk()`, and `getAvailableStudioTilesets()` to protect map bootstrap from missing image crashes in zero-asset environments.
  - **Graceful Babylon Texture Fallbacks (`BabylonEngine.ts`)**: Added texture load error interception with solid fallback material coloring (`mat.diffuseColor = new Color3(0.2, 0.45, 0.2)`) and warning logs rather than throwing rendering errors.
  - **TilesetPicker Empty & Error States (`TilesetPicker.tsx`)**: Replaced broken hardcoded secondary image fallback with a clean onboarding empty state and direct button to open the Asset Browser when zero tilesets exist.

## [2.1.333] - 2026-08-17
### Added & Fixed
- **Studio Context Menu Restructure & Quick-Create Suite (Phase 1C):**
  - **Structured GIMP/Tiled Layout**: Organized right-click context menu into 4 distinct functional blocks: Clipboard, Tile & Layer Operations, Quick Create, and Selection.
  - **Clipboard Actions**: Added Copy (`Ctrl+C`), Cut (`Ctrl+X`), Paste (`Ctrl+V`), and Paste in Place (`Ctrl+Shift+V`) directly to context menu with dynamic disabled states and keyboard hints.
  - **Quick Create Menu**: Added expandable quick-creation suite with 11 Warp Gate types, Default Map Spawn configuration, Author avatar teleportation, Loot Containers (#4), Encounter Zones (#6), and NPC Triggers (#8).
  - **Selection Controls**: Added Select All (`Ctrl+A`) with visual 3D preview bounds and contextual Clear Selection (`Escape`).

## [2.1.332] - 2026-08-17
### Added & Fixed
- **Character Spawn Alignment & Hub Metadata Resolution (Phase 6E):**
  - **Dynamic Map Spawn Resolution (`character-creator.tsx`)**: Replaced generic fallback coordinates with dynamic map `spawnPoint` metadata lookups.
  - **Map Payload SpawnPoint Support (`app/api/maps/[slug]/route.ts`)**: Added automatic resolution and extraction of designated spawn points and center-grid fallbacks in map payload endpoints.
  - **Hub Prioritization**: Prioritized canonical hub worlds (`SAINTS_HAVEN` at `(20, 20)`, `LOBBY` at `(32, 32)`) over arbitrary off-grid positions when creating new Saint operatives.

## [2.1.331] - 2026-08-17
### Added & Fixed
- **Skills Floating Windows & UX Polish (Phase 6C):**
  - **Floating Inspect & Full Guide Windows (`SkillGuideModal.tsx`, `SkillGuideFull.tsx`, `skills-overlay.tsx`)**: Replaced modal blur backdrops with independent draggable `FloatingWindow` instances featuring minimize, dragging, custom z-index elevation, and viewport bounds clamping.
  - **Auto Scroll-to-Top on Skill Navigation (`SkillGuideFull.tsx`)**: Added `contentRef` and `useEffect` lifecycle hook ensuring the proficiency guide smoothly scrolls to the top whenever opened or when changing skills/tabs.
  - **Enhanced Skill Card Sizing & Typography (`skills-overlay.tsx`)**: Increased card padding, minimum height (64px), and icon sizing (`w-4 h-4 sm:w-4.5 sm:h-4.5` in dedicated themed badges), with explicit `LV {level}` displays and responsive grid spacing.

## [2.1.330] - 2026-08-17
### Added & Fixed
- **Camera & Zoom Limits Optimization (Phase 2A):**
  - **Tightened Game & Studio Zoom Bounds (`BabylonEngine.ts`)**: Reduced maximum zoom-out limit in Game/Lobby mode from `22` → `16` (maintains clear character visibility ~8 tiles radius) and in Studio Editor mode from `60` → `40` (prevents extreme bird's-eye distortion where tiles become dots).
  - **Cursor-Anchored Wheel Zooming (`BabylonEngine.ts`)**: Implemented mouse-cursor anchored zoom calculations in the canvas wheel event handler for Studio Editor mode, keeping the tile beneath the cursor statically pinned while zooming in or out.

## [2.1.329] - 2026-08-17
### Added & Fixed
- **Home Page Game Showcase & Navbar Guest Visibility (Phase 6D):**
  - **Navbar Game Link for Guests (`navbar.tsx`)**: Removed the `!user` hide restriction so unauthenticated guests can discover and access the MMO; displays "Enter Game" for guests and "Play Now" for logged-in players with high-visibility cyber-gold/emerald styling in both desktop and mobile drawer navigation.
  - **Home Page Live Game Showcase (`app/(main)/home/page.tsx`)**: Added a prominent "Play Saints MMO" primary action button to the Hero section and an enriched premier feature showcase card for "Saints MMO / The Lobby" with live game badge and cyberpunk-gradient styling.

## [2.1.328] - 2026-08-17
### Added & Fixed
- **Canonical "Saint" Player Identity & Realm Settings (Phase 6B):**
  - **Realm Settings Module (`realmSettings.ts`, `realmSettings.test.ts`)**: Established `DEFAULT_PLAYER_IDENTITY = "Saint"`, `getPlayerClassName()`, and `formatPlayerIdentity()` for configurable server identity conventions.
  - **Studio Realm Settings Modal (`RealmSettingsModal.tsx`, `StudioMenuBar.tsx`)**: Added a dedicated Realm Settings modal under the File menu in Studio to allow admins to customize the Player Class Name, Realm Display Name, and MOTD.
  - **Replaced "Tamer" Fallbacks Across Game Systems**:
    - Updated chat handler fallbacks in `the-lobby/index.tsx` (local, global, party, whisper, and battle presence).
    - Updated 3D Babylon peer name resolution in `GameCanvasBabylon.tsx` and `PeerPresenceHud.tsx`.
    - Updated character creator perk title to **Master Saint** (`character-creator.tsx`).
    - Updated leaderboard titles and descriptions (`app/(main)/leaderboards/page.tsx`).
    - Updated default NPC dialogues (`EntityEditorPanel.tsx`, `WorldSimulation.ts`, `data/quests.ts` - "The Saint Awakening").
    - Added `title_saint` to achievement dispatcher and updated `ach_first_companion` in `achievementCatalog.ts`.
    - Updated Section 9 of `.agents/AGENTS.md` and `01-gameplay-bible.md` to establish "Saint" as the canonical player identity term.

## [2.1.327] - 2026-08-17
### Added & Fixed
- **Studio In-Memory Tile Clipboard — Cut / Copy / Paste (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`, `Ctrl+Shift+V`):**
  - **Shared Subgrid Extraction & Stamping Engine (`subgridStamp.ts`, `subgridStamp.test.ts`)**: Built reusable subgrid extraction and stamping algorithms supporting **Overlay** (transparent merge), **Replace** (full footprint overwrite), and **New Layer** (paste directly to an auto-created layer) modes.
  - **Prefab Builder Integration (`PrefabBuilderPanel.tsx`)**: Replaced duplicate selection extraction in Prefab Builder with the shared `extractSubgridFromMap` engine.
  - **Clipboard State & Undo Actions (`editor-store.ts`)**: Added `copySelection`, `cutSelection`, `pasteClipboard`, and `cancelPaste` actions to `useEditorStore` with full undo stack tracking (`Ctrl+Z` / `Ctrl+Y`) and Babylon mesh event syncing (`STUDIO_MAP_CELLS_CHANGED_EVENT`).
  - **Interactive Paste Floating Toolbar (`PasteOptionsToolbar.tsx`)**: Added a floating modal toolbar when paste mode is initiated, displaying clipboard tile dimensions, mode selectors (Overlay, Replace, New Layer), Apply, and Paste in Place buttons.
  - **Canvas Hover Preview & Click-to-Place (`GameCanvasBabylon.tsx`)**: Renders translucent bounding box previews at the author's cursor during paste mode and commits the paste on click.
  - **Studio Shortcuts & Menu Bar (`StudioMenuBar.tsx`, `StudioEditorShell.tsx`)**: Enabled Cut/Copy/Paste/Paste in Place/Paste to New Layer in the File Edit menu and registered global shortcuts (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Ctrl+Shift+V`, `Escape`).

## [2.1.326] - 2026-08-17
### Added & Fixed
- **Studio Selection Deletion (`Del` / `Backspace` keys, context menu, & batch erase):**
  - **Tile Deletion Engine (`tilePaint.ts`, `tilePaint.test.ts`)**: Implemented `eraseTilesInRegion` pure bounding box eraser with boundary protection, supporting both logic (`-1`) and visual (`0..N`) layers.
  - **Delete Action & State Management (`editor-store.ts`)**: Added `deleteSelectionTiles(map, engine, layerIdx)` action to `useEditorStore` that records undoable batch operations via `opStack`, syncs `mapDirty` / `hasUnsavedChanges`, and dispatches `STUDIO_MAP_CELLS_CHANGED_EVENT`.
  - **Keyboard Shortcuts (`StudioEditorShell.tsx`)**: Bound `Delete` and `Backspace` keys in Studio creation mode to delete selected marquee regions or the currently hovered tile with active toast feedback.
  - **Context Menu Integration (`StudioContextMenu.tsx`)**: Replaced raw cell zeroing in the right-click "Erase Tile" action with `deleteSelectionTiles`, bringing undo/redo tracking and live 3D mesh sync to context menu erasing.

## [2.1.325] - 2026-08-17
### Added & Fixed
- **Studio Exit Navigation, Save & Exit, and Global Save Architecture (`StudioMenuBar.tsx`, `StudioEditorShell.tsx`, `StudioStatusBar.tsx`, `editor-store.ts`):**
  - **Save & Exit Menu Actions**: Added **"Save & Exit to Character Select"** (`Ctrl+Shift+Q`) and **"Exit to Character Select"** options to the Studio File menu in `StudioMenuBar.tsx`, with unsaved changes verification.
  - **Global Map Save Listener (`StudioEditorShell.tsx`)**: Replaced dock-dependent save listeners with a globally mounted handler in `StudioEditorShell.tsx`, guaranteeing map saves (`Ctrl+S`, menu item, status bar) always execute regardless of which dock or panel is active.
  - **Pre-Playtest Save Prompt**: When switching to Playtest mode (`Ctrl+E` or mode switcher) with unsaved changes, authors are prompted to save before testing to prevent map reload overwrites.
  - **Global Saving Status Indicator (`StudioStatusBar.tsx`, `editor-store.ts`)**: Added `isSavingMap` and `hasUnsavedChanges` reactive state tracking to the editor store, updating the status bar Save button with an animated spinner and active feedback while map saves are in flight.

## [2.1.324] - 2026-08-17
### Fixed
- **Character Select & Lobby Chat Double Message Echo Bug (`handler.go`, `LobbySocketHandler.ts`, `the-lobby/index.tsx`, `GameTitleScreen.tsx`):**
  - **Go MMO Socket Hub (`handler.go`)**: Included client connection `socketId` and `accountId` on pre-map join chat broadcasts (`broadcastChat`).
  - **TS Fallback Socket Handler (`LobbySocketHandler.ts`)**: Included `accountId` in global and local chat broadcasts.
  - **Lobby Socket Bridge (`the-lobby/index.tsx`)**: Added account-level self-echo filtering (`data.accountId === session.user.id`) in addition to socket ID filtering on global and party chat messages.
  - **Title & Character Select Screen (`GameTitleScreen.tsx`)**: Made incoming chat deduplication sender-agnostic within the timestamp window, preventing optimistic messages from duplicating if sender display name differs from server-broadcast fallback.

## [2.1.323] - 2026-08-17
### Fixed
- **Setup Wizard Blank Canvas Infinite Redirect Loop (`app/(main)/studio/layout.tsx`, `app/(main)/lobby/page.tsx`):**
  - Removed `setupStatus.mapCount === 0` check from the route guards on `/studio` and `/lobby`.
  - Fixes the critical bug where choosing a "Blank Canvas" (0 maps) realm during onboarding redirected infinitely back to `/setup`, locking authors out of Studio and preventing them from creating their first map.

## [2.1.322] - 2026-08-17
### Added & Documented
- **Dynamic World Hub & Unstuck Teleport System (`worldSpawns.ts`, `GameOptionsMenu.tsx`, `the-lobby/index.tsx`, `character-creator.tsx`):**
  - **Dynamic New Character Spawns**: New characters now dynamically query the active world maps index and spawn on the active lobby hub instead of defaulting to `DEMO_SANDBOX`.
  - **Automatic Hub Recovery for Deleted Maps**: When a saved map is deleted or removed from the database, characters logging in from that map are automatically routed to the current world lobby hub with safe coordinates.
  - **Unstuck Teleport Feature**: Added an **Unstuck Teleport** option in the ESC / Game Options Menu (`GameOptionsMenu.tsx`) featuring a 5-second channeling timer, 5-minute cooldown between uses, and instant relocation to the world lobby spawn.
  - **Demo Auto-Seeding Guard**: Updated `DemoBootstrap.ts` to skip re-creating `DEMO_SANDBOX` on startup if custom world maps exist in the database.

## [2.1.321] - 2026-08-17
### Added & Documented
- **World Management & Gate Placement Enhancements (`StudioContextMenu.tsx`, `api/maps/[slug]/route.ts`):**
  - Removed deletion restrictions on `DEMO_SANDBOX` so authors/admins can delete the demo sandbox map once custom maps exist.
  - Added an interactive **"Add Gate..."** selector in the Studio right-click context menu, prompting authors to choose between standard warps, Atlas north/east/south/west boundary gates, dungeons, raids, seasonal events, mines, and realm portals.
  - Added **"Set Default Player Spawn Here"** to the context menu to configure default map entry coordinates with one click.

## [2.1.320] - 2026-08-17
### Added & Documented
- **Canonical Studio SoftLock & Presence Engine (`softLockEngine.ts`):**
  - Implemented the collaboration and soft-lock engine (Gameplay Bible 32 §1) supporting multi-user edit locks, automatic heartbeat renewals, administrator takeover, and project presence tracking.
  - Added automated unit test suite in `softLockEngine.test.ts`.

## [2.1.319] - 2026-08-17
### Added & Documented
- **Canonical RewardBundle Engine (`rewards.ts`):**
  - Implemented the unified RewardBundle definition, validation, and aggregation engine (Gameplay Bible 31 §1 & §2) consolidating credits, item grants, skill XP, faction reputation, and titles across quests, dialogues, and loot tables.
  - Added automated unit test suite in `rewards.test.ts`.

## [2.1.318] - 2026-08-17
### Added & Documented
- **Canonical CatalogEditorShell Standard (`CatalogEditorShell.tsx`):**
  - Implemented the unified CatalogEditorShell component (Gameplay Bible 30 §2) providing standard master-detail panels, live search/filtering, dirty-state badges, footer validation chips, and revert/save callbacks across all Studio definition registries.

## [2.1.317] - 2026-08-17
### Added & Documented
- **Canonical Studio Glossary & Resource Definitions (`studioGlossary.ts`):**
  - Implemented the normative vocabulary (Gameplay Bible 29) establishing the 6 canonical UI modes (`walk`, `paint`, `place`, `populate`, `script`, `catalog`), legacy alias adapters, and `CanonicalResourceRef` scoping keys.
  - Added automated unit test suite in `studioGlossary.test.ts`.

## [2.1.316] - 2026-08-17
### Added & Documented
- **Studio Backend Services Suite (`src/server/studio/studioServices.ts`):**
  - Implemented the unified Studio Services layer (Gameplay Bible 28 §7) providing `StudioAuditService` and `StudioPublishService` for transactional mutation logging, cache invalidation, and content reload broadcasting.
  - Added unit test suite in `studioServices.test.ts`.

## [2.1.315] - 2026-08-17
### Added & Documented
- **Server Content Cache Facade (`src/server/studio/contentCache.ts`):**
  - Implemented the master ServerContentCache facade (Gameplay Bible 28 §2 & §3) with in-memory TTL caching and real-time invalidation pipelines across single resources, entire domains, and global cache flushes.
  - Added unit test suite in `contentCache.test.ts`.

## [2.1.314] - 2026-08-17
### Added & Documented
- **Canonical Studio Localization & Audit Logging Engine (`localizationAuditEngine.ts`):**
  - Implemented the production tooling engine (Gameplay Bible 27 §3.11 & §3.12) providing dictionary translation lookups with language fallbacks and mutation audit trail schemas.
  - Added automated unit test suite in `localizationAuditEngine.test.ts`.

## [2.1.313] - 2026-08-17
### Added & Documented
- **Canonical Studio Task & Dependency Graph Engine (`taskEngine.ts`):**
  - Implemented the production tooling engine (Gameplay Bible 27 §3.5 & §3.6) managing development task pipelines, resource references, and bidirectional dependency tracking (hard/soft edges).
  - Added automated unit test suite in `taskEngine.test.ts`.

## [2.1.312] - 2026-08-17
### Added & Documented
- **Canonical Revision Store & Publishing Lifecycle Engine (`revisionStore.ts`):**
  - Implemented the master ContentRevision engine (Gameplay Bible 26 §4, §5 & §6) supporting immutable content snapshots, draft-to-live promotions, and non-destructive forward-incrementing rollbacks.
  - Added automated unit test suite in `revisionStore.test.ts`.

## [2.1.311] - 2026-08-17
### Added & Documented
- **Canonical Content Reload Bus Expansion (`contentReloadBus.ts`):**
  - Expanded `ContentReloadType` to support hot-reloads across all canonical gameplay categories: `ability`, `status`, `skill`, `class`, `profession`, `recipe`, and global cache invalidation (`flush_all_caches`) as defined in Gameplay Bible 26 §3.1.

## [2.1.310] - 2026-08-17
### Added & Documented
- **Canonical Gameplay Integrity & Validation Engine (`gameplayValidator.ts`):**
  - Implemented the automated validation suite (Gameplay Bible 25 §8) enforcing hard rules against RT capture leakage, unknown status effects, unregistered skill slugs, and missing class abilities.
  - Added automated test coverage in `gameplayValidator.test.ts`.

## [2.1.309] - 2026-08-17
### Added & Documented
- **Studio Dock Registration & Role Permissions (`studioModes.ts`, `studioPermissions.ts`, `editor-store.ts`):**
  - Fully wired the `gameplay` dock into the Studio workspace modes, floating panel geometry store, and role-permission matrices.

## [2.1.308] - 2026-08-17
### Added & Documented
- **Studio Gameplay Panels Hub (`GameplayStudioPanels.tsx`):**
  - Implemented the unified Studio Gameplay Editor panel (Gameplay Bible 25) with tabbed dock views for Abilities, Status Conditions, 27-Skill Matrix, Professions, and the 100x Monte Carlo Combat Balance Simulator.

## [2.1.307] - 2026-08-17
### Added & Documented
- **Canonical Type Chart Engine (`typeChartEngine.ts`):**
  - Implemented the 10-element type advantage matrix and multiplier calculator (Gameplay Bible 25 §3.7).
  - Added support for compound dual-typing defensive resistances, super-effective boosts (2.0x / 4.0x), and immunities (0.0x).
  - Added automated test suite in `typeChartEngine.test.ts`.

## [2.1.306] - 2026-08-17
### Added & Documented
- **Canonical ClassDef Schema Alignment (`classCatalog.ts`):**
  - Extended `ClassDefData` with `learnableAbilityIds` and `combatStyleDefault` (Gameplay Bible 25 §3.5).
  - Prepared hotbar abilities and class progression mapping for dynamic editor resolution.

## [2.1.305] - 2026-08-17
### Added & Documented
- **Canonical Combat Balancing & Simulation Engine (`combatBalanceEngine.ts`):**
  - Implemented the deterministic balance simulation engine (Gameplay Bible 25 §3.7 & §3.8) computing average damage, DPS, time-to-kill (TTK), and XP-per-hour projections.
  - Added support for player combat tuning multipliers, armor mitigation formulas, and health scaling thresholds.
  - Added automated unit test suite in `combatBalanceEngine.test.ts`.

## [2.1.304] - 2026-08-17
### Added & Documented
- **Canonical Profession Registry Engine (`professionRegistry.ts`):**
  - Implemented the master `ProfessionDef` schema and mapping engine (Gameplay Bible 25 §3.6) covering Blacksmithing, Culinary Arts, Artisan Crafting, Apothecary, Lumber Harvesting, Geology/Mining, Angling, and Agronomy.
  - Linked gathering and crafting professions to primary skills, world station tags (`anvil`, `furnace`, `range`, `workbench`, `alchemy_table`), and recipe domains.
  - Added automated unit test suite in `professionRegistry.test.ts`.

## [2.1.303] - 2026-08-17
### Added & Documented
- **Canonical SkillDef & XpCurveDef Registry Engine (`skillRegistry.ts`):**
  - Implemented the master 27-skill definition registry and XP curve formulas (`combat_curve_50` and `standard_curve_99`) as defined in Gameplay Bible 25 §3.3 & §3.4.
  - Added deterministic level-from-XP and XP-for-level helper algorithms.
  - Added automated unit test suite in `skillRegistry.test.ts`.

## [2.1.302] - 2026-08-17
### Added & Documented
- **Canonical Ability Registry & Domain Engine (`abilityRegistry.ts`):**
  - Implemented the unified `AbilityDef` specification (Gameplay Bible 25 §3.1) supporting Real-Time player combat and Turn-Based creature battles.
  - Enforced strict domain boundaries keeping creature capture actions isolated to Turn-Based encounters.
  - Added full automated test coverage in `abilityRegistry.test.ts`.

## [2.1.301] - 2026-08-17
### Added & Documented
- **Canonical Combat Status Effects Registry (`statusRegistry.ts`):**
  - Integrated full StatusDef registry as specified in Gameplay Bible 25 §3.2 (`burn`, `poison`, `frostbite`, `stun`, `regen`, `might`).
  - Added support for real-time and turn-based duration ticks, capture chance multipliers, stat delta modifiers, and tag categorization.
  - Added unit test suite in `statusRegistry.test.ts`.

## [2.1.300] - 2026-08-17
### Enhanced & Refactored
- **Quest Journal Glance → Inspect Hierarchy (`quest-log-overlay.tsx`):**
  - Refactored the Quest Log into the canonical **Glance → Inspect** UX model.
  - Active quest view now renders compact mission status cards with 1-click Inspect triggers.
  - Added dedicated full-detail Quest Inspect overlay displaying complete multi-stage objectives, objective target trackers, and rewards without vertical scroll strain.

## [2.1.299] - 2026-08-17
### Enhanced & Integrated
- **Achievements Overlay Overhaul (`achievements-overlay.tsx`):**
  - Connected the Lobby HUD Achievements overlay directly to the canonical `CANONICAL_ACHIEVEMENTS` registry.
  - Added interactive category filter tabs (`ALL`, `COMBAT`, `SKILLING`, `EXPLORATION`, `COLLECTION`, `QUESTS`) with distinct icons and theme colors.
  - Added live display of achievement point rewards, platform XP, coin payouts, and unlockable title indicators.

## [2.1.298] - 2026-08-17
### Added & Documented
- **Canonical Achievement Catalog (`achievementCatalog.ts`):**
  - Integrated structured achievement definitions across Combat, Skilling, Exploration, Collection, and Quests with reward titles and progression milestones.
  - Added full automated test coverage in `achievementCatalog.test.ts`.
- **27-Skill Progression Matrix Bible Sync (`09-progression-27-skills.md`):**
  - Aligned the gameplay bible with the 27 Saint Proficiencies, dual level curves (Lv 50 Combat vs Lv 99 Skilling/Artisan/Support), and Glance → Inspect → Learn menu architecture.

## [2.1.297] - 2026-08-16
### Enhanced
- **Subdomain Setup Prompt (`scripts/setup.sh`):**
  - Integrated optional subdomain configuration across all setup modes (First-Time Setup and Nuclear Reinstall).
  - Explicitly asks the user if they wish to add/reverse-proxy subdomains (e.g. `mmo.domain.com`, `dev.domain.com`, `panel.domain.com`, `bot.domain.com`) with automated port & target IP wiring.

## [2.1.296] - 2026-08-16
### Fixed
- **Setup Script Fixes (`scripts/setup.sh`):**
  - Fixed syntax error with extra `fi` in proxy/web server block on line 621.
  - Fixed Caddy service reload failure when inactive (`sudo systemctl unmask/enable/restart/start caddy`).
  - Silenced `fuser -k` port killer stdout/stderr to avoid dirtying terminal output.

## [2.1.295] - 2026-08-16
### Added & Enhanced
- **Setup Gateway & Nuclear Reinstall Mode (`scripts/setup.sh`):**
  - Added a clean top-level **Deployment Gateway Menu** on the very first screen of `./scripts/setup.sh` offering:
    1. `✨ FIRST-TIME SETUP` (Interactive guided clean deployment)
    2. `🔄 UPDATE DEPLOYMENT` (Pulls latest code, migrates DB & restarts stack)
    3. `🌐 UPDATE DOMAINS / PROXY` (Configure Caddy, subdomains & SSL)
    4. `☢️ NUCLEAR REINSTALL` (Wipe database, containers, .env & fresh deploy)
  - **Nuclear Reinstall Flow**: Prompts a single *"Are you sure?"* confirmation dialog. Upon confirmation, it force-stops/removes old containers, wipes `./mysql_data`, deletes SQLite `dev.db`, purges `.env`, and bypasses all redundant, repetitive warning/prompt boxes across the setup script for a clean, prompt-free fresh install.

## [2.1.294] - 2026-08-16
### Added & Fixed
- **Mandatory First-Run Setup Gate & Disconnect Invalidation Policy (Bible 17 & Bible 35):**
  - **Mandatory Setup Gate**: Hard-gated `/lobby` and `/studio` server-side (`LobbyPage` & `StudioLayout`) and client-side (`initData`). Access to the MMO world, character selector, and editor is blocked and immediately routed to `/setup` if setup has not been run or 0 maps exist.
  - **25-Second Connection Loss Expiration Policy**: Implemented `MAX_DISCONNECT_RECONNECT_WINDOW_MS` (25s) and `isSessionConnectionStale`. If a player's realm socket connection is lost for more than 25 seconds, the session is expired, active socket is disconnected, in-memory tokens are cleared, and the client is returned to the Title Screen / Gateway with an expiration notice, preventing stale link hijacking.

## [2.1.293] - 2026-08-16
### Fixed
- **Setup Script Discord OAuth Verification (`scripts/setup.sh`):**
  - Added `-H "Content-Type: application/x-www-form-urlencoded"` and `-d "scope=identify"` to the Discord API credentials test call in `scripts/setup.sh`. Discord API v10 requires an explicit scope parameter on `grant_type=client_credentials` requests; without it, valid keys were returning `invalid_request: A scope is required`.

## [2.1.292] - 2026-08-16
### Fixed & Improved
- **Lobby Setup Delivery & Admin Authorization (Bible 17 & Bible 35):**
  - Upgraded first-time user registration to automatically grant `permissionLevel: 1000` (Developer / Owner) and auto-heals single-user dev databases to Developer permissions.
  - Added glowing **Realm Setup Required** banner to the Game Title Screen when fresh install or setup is pending.
  - Added dedicated **Realm Setup Wizard** shortcut in the Title Screen Realm Gateway widget and in the Main Website Navbar Admin dropdown.
  - Added auto-redirection to `/setup` upon login or clicking Play when no maps exist or setup is pending.

## [2.1.291] - 2026-08-16
### Added
- **Studio Asset Repository Upgrades & Starter Pack Integration (Bible 16 §7 & Bible 35):**
  - Expanded approved asset pack registry with **Saints Official Bundle** (`saints`), ensuring starter bundle tilesets, sprite sheets, items, and audio soundscapes are recognized and categorized.
  - Upgraded `AssetEditor.tsx` with a modern pack navigator, classification chips (`Sprites`, `Tilesets`, `Monsters`, `Items`, `Audio`, `UI`), pixel-art rendering with checkered canvas preview background, zoom controls (`1x`, `2x`, `4x`), one-click path and key copy, and Slicer integration.
  - Linked `FullScreenAssetBrowser` and `AssetBrowserPanel` directly to `SpritesheetSlicer` for 1-click slicing from the inspector.

## [2.1.290] - 2026-08-16
### Added
- **Fresh Install Setup Wizard & Prepackaged World Asset Management System (Bible 17 & Bible 35):**
  - `setupDetection.ts`: Robust fresh install vs server update state evaluation (`evaluateSetupStatus`, `getSystemSetupStatus`), checking `SiteSetting.SETUP_COMPLETED` and `WorldMap` counts to protect existing live game worlds from accidental re-seeding.
  - `prepackagedPacks.ts`: Modular starter pack bundler and manifest importer (`getCommunityStarterPackManifest`, `importStarterPackToDb`), enabling 1-click importing of the 8-map Official Saints Starter Realm (Haven, Meadows, Quarry, Arena, Dungeons, Quests, Items, Recipes) or starting with a clean Blank Canvas.
  - `FirstTimeSetupWizard.tsx`: Multi-step creator onboarding wizard for realm identity configuration, starter bundle selection with feature cards, and 1-click Studio launch.
  - `app/(main)/setup/page.tsx`: Dedicated Setup Wizard route with access guards for fresh installations.
  - `app/api/setup/status`, `app/api/setup/import`, `app/api/setup/complete`: Dedicated backend API endpoints for checking setup permissions, importing packs, and finalizing realm startup.
  - **First-User Admin Promotion**: Automatically promotes the first registered account on a pristine database to `permissionLevel: 100` (Owner/Admin) and `isFounder: true`.
  - **Studio 0-Map Graceful Fallback**: Added interactive blank canvas state to `/studio` and `/lobby` when no world maps exist, preventing empty void crashes.

## [2.1.289] - 2026-08-16
### Added
- **Solak: The Grove Guardian & Blight Corrupted Roots Engine (Bible 24 & Bible 27):**
  - `solakPhaseEngine.ts`: 4-Phase tree progression (Phase 1 limb destruction to expose Blight Core, Phase 2 Anima Storm, Phase 3 Merethiel Elf Mind realm corruption cleansing, and Phase 4 Manifestation execute with compounding 2.5% max HP stacking bleed).
  - `solakMechanics.ts`: Root Cage entrapment rescue check and Merethiel's Nature Blessing golden dome with 100% storm damage immunity (vs 1,200/tick outside).
  - `solakLootEngine.ts`: Erebus Grimoire pocket slot item (+12% crit rate & 15k damage cap expansion), torn grimoire page recharging (45 mins/page), Tier 92 Blightbound Crossbows (50% bolt conservation chance), and Solly pet drop matrix.

## [2.1.288] - 2026-08-16
### Added
- **Telos: Warden of the Telosian Core & Font Anima Mechanics Engine (Bible 24 & Bible 27):**
  - `telosPhaseEngine.ts`: 0% to 4,000% Enrage scaling matrix for boss HP and damage, 5-phase arena transitions, Phase 5 100%+ Enrage unlock, Green/Black/Red Anima Beam mechanics with player blocking, and equilibrium balance bar.
  - `telosSpecialAttacks.ts`: "Hold still, invader!" heavy crush slam with Resonance heal / Barricade / Freedom stun mitigation, Grasping Anima Tendrils burst DPS check, and "Soaria" Anima Bomb font shield absorption.
  - `telosLootEngine.ts`: Dynamic unique drop rate scaling ($10000 / (10 + 0.25E + 3S)$ down to 1/9 at 4000% Enrage / 150 Streak), Volcanic/Pure/Corrupted Anima Orbs, Dormant Staff of Sliske, Zaros Godsword, Seren Godbow, Reprisal codex, and Tier 92 God Weapon assembly matrix.

## [2.1.287] - 2026-08-16
### Added
- **Nex: Angel of Death, Ancient Elementals & Praesul Codex Engine (Bible 24 & Bible 27):**
  - `nexPhaseEngine.ts`: 5-Phase combat progression (Smoke, Shadow, Blood, Ice, Zaros Enrage), 4-quadrant positioning matrix, Blood Siphon damage-reversal heal, Blood Sacrifice 7-tile distance escape (80% HP & 33% prayer penalty), and Ice Prison breakout mechanics.
  - `nexMinionMechanics.ts`: 4 Elemental Minions (Fumus, Umbra, Cruor, Glacies), Blood Reaver minion pathing & 250,000 HP absorption heal, and Zarosian Wrath 5-tick channeled 8-tile radius instant-wipe death explosion.
  - `nexLootEngine.ts`: Praesul Codex consumption unlocking Tier 99 Ancient Curses (Malevolence, Desolation, Affliction with +12% accuracy, +12% damage, +10% defence), Tier 92 Wand of the Praesul & Imperium Core, and Torva/Pernix/Virtus armor drop distribution.

## [2.1.286] - 2026-08-16
### Added
- **Player-Owned Ports, Naval Exploration & Voyage Management Engine (Bible 18 & Bible 31):**
  - `portFleetEngine.ts`: Player fleet vessel management (Hulls, Deck Cannons, Figureheads), Captain and Crew recruitment with Combat, Morale, Seafaring stats, traits (Tactician, Leader, Navigator, Daredevil, Sturdy), level advancement, and injury debuffs.
  - `portVoyageEngine.ts`: 7 Progressive Archipelago Regions (Arc, Skull, Hook, Scythe, Bowl, Pincers, Shield), multi-stat requirement success probability calculations, voyage departures, and high-seas random encounters (Kraken Attack, Maelstrom, Siren Song, Treasure Drift).
  - `portCraftingEngine.ts`: Port Trade Goods economy (Bamboo, Slate, Cherrywood, Gunpowder, Lacquer, Chi, Ancient Bones, Plate, Chimes), 4-fragment scroll recipe unlocking, and Ancient Tier 85 armor crafting (Superior Tetsu, Death Lotus, Seasinger) and Combat Scrimshaws.

## [2.1.285] - 2026-08-16
### Added
- **Fortis Colosseum, Wave Modifiers & Sol Heredit Engine (Bible 24 & Bible 27):**
  - `colosseumWaveEngine.ts`: 12-wave arena spawner matrix, 8 stackable handicap modifiers (Doom, Mantimayhem, Solar Flare, Relentless, Myopia, Red Flag, Bees, Dynamic Duo) with 3-tier drafting, Doom 3-stack instant fatality, and glory multiplier scaling.
  - `solHereditEngine.ts`: Sol Heredit 3-phase fight progression, Phase 2 Shield Parry frontal reflection (15 dmg) with rear/flank vulnerability, Triple Laser lane avoidance, and Sand Trap knockback eruptions.
  - `quiverUpgradeEngine.ts`: Dizana's Quiver item mechanics, Sunfire Splinter charging (10 charges/splinter), permanent blessing (150,000 splinters + sacrifice quiver), +1 Sunfire Ranged Max Hit, and Dual Ammo Slot auto-resolution (Bows vs Crossbows).

## [2.1.284] - 2026-08-16
### Added
- **Raids, Chambers of Xeric & Boss Mechanics Matrix Engine (Bible 24 & Bible 27):**
  - `raidRoomGenerator.ts`: Procedural 3-floor raid dungeon layouts (Combat, Puzzle, Scavenge, Boss rooms), party size HP multiplier $1 + (N-1) \times 0.75$, defence scaling, Challenge Mode +50% HP / +20% def boosts, and room clear contribution point distribution.
  - `olmBossEngine.ts`: The Great Olm 3-phase fight progression (Left Hand, Right Hand, Head), Phase 3 enrage & head vulnerability unlock, Crystal Burst spike avoidance, Teleport Pairs proximity resolution, and Burn status effect contagion loops.
  - `raidLootEngine.ts`: Party point scaling and unique drop probability calculations (8,675 points per 1% chance, capped at 65%), 40% personal death penalty, and unique chest drops (Twisted Bow, Ancestral Robes, Elder Maul, Kodai Insignia, Prayer Scrolls, Olmlet pet, CM Metamorphic Dust).

## [2.1.283] - 2026-08-16
### Added
- **Slayer Assignment System, Superior Monsters & Slayer Master Engine (Bible 09 & Bible 21):**
  - `slayerTaskEngine.ts`: 6 canonical Slayer Masters (Turael, Mazchna, Vannaka, Chaeldar, Nieve, Duradel), weighted assignment based on combat and slayer level prerequisites, streak milestone multipliers (10th=5x, 50th=15x, 100th=25x, 250th=35x, 1000th=50x), task kill tracking, and Turael streak reset mechanics.
  - `superiorSlayerEngine.ts`: 1/200 superior spawn rolls for 15 monster variants (Marble Gargoyle, King Kurask, Insatiable Bloodveld, Greater Abyssal Demon) with 10x Slayer XP, tiered unique relic drop table (Imbued Heart, Eternal Gem, Dust & Mist Battlestaffs), and +1 + 10% Magic boost calculation.
  - `slayerShopEngine.ts`: Slayer Reward Shop unlock matrix (Bigger and Badder, Malevolent Masquerade, Ring Bling, Broader Fletching, Task Extensions), task blocking with Quest Point scaling (up to 6 slots), task cancelling for 30 points, and on-task combat bonuses (+16.67% melee, +15% ranged/magic for imbued slayer helm).

## [2.1.282] - 2026-08-16
### Added
- **Studio UI & Full-Screen Editor Architecture Overhaul:**
  - `StudioBottomToolbar.tsx`: Unified bottom IDE toolbar consolidating brush/erase/eyedropper/pan/select/prefab/gate tools, active layer toggle chips, size steppers, overlay toggles (XY coords, warp gates, NPC spawns), categorized dock panel launchers, latency/FPS telemetry, playtest mode transition, and dirty map/definition save triggers.
  - `FullScreenMapBrowser.tsx`: Full-screen modal overlay for map discovery with search filtering by name/slug/category, world dimensions readout, NPC/gate counters, one-click teleport/warp, new map creator, and map deletion with safety confirmations.
  - `FullScreenAssetBrowser.tsx`: Full-screen asset library modal featuring Catalog management, Sprite browser, texture upload, and spritesheet slicer tabs.
  - `StudioContextMenu.tsx`: Viewport right-click context menu supporting tile sampling (eyedropper), one-click warp gate placement, player avatar teleportation, whole-layer fill, and tile erasure.
  - `DELETE /api/maps/[slug]`: Secured administrative map deletion endpoint with WorldMap and GameMap cascading cleanup and Go MMO sync notifications.
  - `WorldBuilderPanel.tsx`: Redesigned collapsible accordion layout dividing Active Realm Overview, Map Index & Quick Switch with row-level map deletion, Painting Layers, and Tileset/Logic palettes.

## [2.1.281] - 2026-08-16
### Added
- **Creature Breeding, Genetic Inheritance & Pet Growth Engine (Bible 12 & Bible 23):**
  - `breedingEngine.ts`: Parent gender and egg group validation, maternal species inheritance, 3 parent IV stat alleles + 3 random IVs, Shiny Charm rolls, and incubation step countdowns.
  - `petLoyaltyEngine.ts`: 5 mood classifications (Joyful, Content, Hungry, Lonely, Neglected), dietary preferences with favorite food boosts, progressive trick unlocks (Sit, Dance, Cheer, Sniff), and time-based needs decay.
  - `evolutionEngine.ts`: Level-up thresholds (Flame Lizard -> Inferno Dragon), elemental stone infusions (Thunder, Fire, Water stones), friendship affinity with biome catalysts (Saints Espeon), and combat stat multiplier upgrades.
- **Grand Exchange Economy & Player Marketplace Engine (Bible 15 & Bible 31):**
  - `exchangeEngine.ts`: Buy/sell limit order matching, 1% GE tax sink on seller proceeds, buyer escrow difference refunds, and order cancellation.
  - `marketPriceEngine.ts`: Traded volume aggregation, intraday high/low tracking, volume-weighted average pricing (VWAP), market trend indicators (`RISING`, `FALLING`, `STABLE`), and ±5% daily swing guardrails.
  - `bankEngine.ts`: 4-digit bank PIN security with 3-attempt lockout protection, 800-slot vault storage, 5 category tabs, unnoting on deposit, and banknote certificate withdrawal conversions.

## [2.1.280] - 2026-08-16
### Added
- **Resource Gathering Nodes & Depletion Engine (Bible 08 & Bible 14):**
  - `miningEngine.ts`: 10 rock vein tiers (Copper through Runite & Saint's Gold), pickaxe speed modifiers, prospecting text inspection, and rare uncut gem discoveries (Sapphire, Emerald, Ruby, Diamond).
  - `woodcuttingEngine.ts`: 7 tree species (Normal, Oak, Willow, Maple, Yew, Magic, Elder Redwood), hatchet speed tiers, stump respawn cooldowns, and random bird's nest loot drops.
  - `fishingEngine.ts`: 5 fishing spot methods (Small Net, Bait Rod, Fly Rod, Lobster Pot, Harpoon), bait consumption, level-scaled catch weight formulas, and sea casket discovery rolls.
- **Clue Scrolls, Treasure Trails & Puzzle Box Engine (Bible 18 & Bible 25):**
  - `clueEngine.ts`: Easy through Master clue scrolls, spade coordinate digging, tile distance calculations, NPC riddles, and tiered reward casket handoffs.
  - `puzzleEngine.ts`: 3x3 and 4x4 sliding tile puzzles, mathematical permutation inversion parity checks (`isPuzzleSolvable()`), tile slide movement, Caesar ciphers, and anagram resolution.
  - `casketRewardEngine.ts`: Easy through Master reward caskets (2–7 loot rolls), trimmed armor pieces (g/t), Ranger Boots, Robin Hood Hat, and 3rd Age mega-rare artifacts.
- **Audio Synthesis, Environmental Ambience & Soundscape Engine (Bible 28 & Bible 33):**
  - `soundscapeEngine.ts`: 6 biome acoustic soundscapes (Town, Forest, Dungeon, Coastal, Mountain, Volcanic), day/night sound variation layers, rain/storm/snow weather blending, and smooth cross-fade volume transitions.
  - `spatialAudioEngine.ts`: Positional 3D audio mechanics with Euclidean distance attenuation falloff curves, camera yaw orientation stereo panning (`-1.0` to `+1.0`), and combat impact / UI fanfare sound lookup maps.
  - `jukeboxEngine.ts`: Regional background music track unlocks (Saints Harmony, Whispering Pines, Forge of the Ancients, Depths of Despair, New Beginnings, Grand Coronation), playlist queues, loop, and shuffle modes.
- **Minigames & Arena Encounters (Bible 24 & Bible 27):**
  - `waveArenaEngine.ts`: TzTok-Jad Overlord and arena monsters with radial perimeter spawn coordinates, wave combat advancement, Tokkul rewards, and Fire Cape distribution.
  - `barrowsEngine.ts`: 6 Barrows brothers (Dharok, Ahrim, Guthan, Karil, Torag, Verac), secret labyrinth tunnel sarcophagus routing, and central chest loot calculations.
  - `agilityCourseEngine.ts`: Rooftop courses across Gnome Stronghold, Draynor, Varrock, and Seers' Village with level-scaled obstacle success checks, fail damage, lap XP bonuses, and Mark of Grace spawners.

## [2.1.279] - 2026-08-16
### Added
- **Real-Time Party System, Social Hub & Guilds (Bible 04 & Bible 05):**
  - `partyEngine.ts`: Dynamic multi-player parties, leader delegation, invite/kick lifecycles, and `ROUND_ROBIN`, `FREE_FOR_ALL`, and `LEADER_DISTRIBUTED` loot allocation.
  - `partyAuraEngine.ts`: Shared combat XP distribution with party synergy multipliers (+10% per nearby member within 20 tiles) and the "Fellowship of Saints" proximity aura (+5% speed, +5% defence).
  - `guildEngine.ts`: Guild clan roster management with strict rank hierarchy validation (`LEADER` > `OFFICER` > `VETERAN` > `MEMBER` > `RECRUIT`), treasury contributions, and level milestone perks.
- **Player Housing, Sanctuary Estate & Farming Plots (Bible 08 & Bible 13):**
  - `estateEngine.ts`: 5x5 Sanctuary estate plots, Construction level room prerequisites (Garden, Parlour, Kitchen, Workshop, Portal Chamber, Altar, Throne Room), and 2D bounding-box furniture placement collision detection.
  - `farmingEngine.ts`: Agricultural crop lifecycles (`ALLOTMENT`, `HERB`, `FLOWER`, `TREE`), weed clearing (`rakePatch`), compost tiers (`COMPOST`, `SUPERCOMPOST`, `ULTRACOMPOST`), growth timer ticking, and level-scaled harvest yields.
  - `portalNexus.ts`: Housing portal chamber frame attunement, global destination coordinates (`DEMO_SANDBOX`, `WILD_MEADOWS`, `QUARRY_MINE`, `WHISPERING_FOREST`), unlock prerequisites, and Magic level requirement enforcement.
- **Player Achievements, Titles & Mastery Milestones (Bible 25 & Bible 26):**
  - `achievementEngine.ts`: Multi-category milestone progression (`COMBAT`, `SKILLING`, `EXPLORATION`, `COLLECTION`, `QUESTS`), threshold unlock events, and achievement point aggregation.
  - `titleDispatcher.ts`: Prefix and Suffix title formatting (`Novice`, `the Monster Slayer`, `Master Angler`, `the Grandmaster`) with rarity styling colors and unlock validation.
  - `highscoreEngine.ts`: Authoritative 1–126 Combat Level formula (Attack, Strength, Defence, HP, Prayer, Ranged, Magic), Total Level, Total XP, and hierarchical highscore leaderboard ranking.
- **Artisan Crafting Matrices & Smithing Engine (Bible 14 & Bible 22):**
  - `smithingEngine.ts`: 7 metal tiers (`BRONZE`, `IRON`, `STEEL`, `MITHRIL`, `ADAMANT`, `RUNE`, `SAINTS_GOLD`), furnace ore smelting recipes, hammer validation, and anvil forging matrices.
  - `cookingEngine.ts`: Dynamic burn curves across Fires, Ranges, and Chef Ranges, stop-burn mastery thresholds (`0.0%` burn rate), and food healing values.
  - `potionBrewEngine.ts`: Unfinished potion mixing with secondary reagents, dynamic flat + percentage stat boost calculations, and 1–4 dose flask decanting with vial recovery.
- **Magic Spellbook & Prayer Aura Engine (Bible 10 & Bible 14):**
  - `spellbookEngine.ts`: Elemental combat spellbook (Wind Strike, Fire Bolt, Ice Burst, Fire Wave, Saint's Holy Blast), rune inventory validation, infinite elemental staff catalyst waivers, and magic damage scaling.
  - `prayerEngine.ts`: Multiplier blessings, overhead protection prayers (Protect from Melee, Missiles, Magic) with exclusivity rules and gear drain resistance ticks.
  - `enchantEngine.ts`: Lvl 1–6 jewelry enchantment (Sapphire Recoil, Emerald Dueling with 8 charges, Ruby Strength, Diamond Power, Dragonstone Glory with 4 charges, Onyx Fury) with cosmic rune formulas and Magic XP awards.

## [2.1.278] - 2026-08-16
### Added
- **Terrain & Environmental Mechanics (Bible 34 §5 & Bible 08):**
  - `waterMechanics.ts`: Wading speed multipliers (`0.65x` in shallow water), deep-water swim/fly capability checks, and shore fishing query resolver.
  - `elevationMechanics.ts`: Multi-level terrain transitions, climb requirements, and one-way single-tier ledge hops.
  - `weatherEngine.ts`: Dynamic weather system resolving ambient lighting, sun intensity, fog density, particle presets (`rain_drops`, `snow_flakes`, `fog_mist`, `storm_lightning`), and elemental damage/defense affinity modifiers.
- **Creature Collection & Turn-Based Buddy Battle Engine (Bible 07 & Bible 11):**
  - `buddyBattleEngine.ts`: Turn-based move damage calculation with STAB (1.25x), type chart multipliers, and capture probability formulas with master film guarantees.
  - `encounterGenerator.ts`: Wild encounter spawner with diurnal/nocturnal time-of-day weighting, weather synergy multipliers, and shiny roll determination.
  - `companionParty.ts`: 6-slot party manager (1 lead + 5 reserve), slot swapping, leveling thresholds (`getXpForLevel`), and level-up stat growth curves.
- **Seamless World Atlas & Spatial Border Links (Bible 23 & Bible 24):**
  - `spatialAtlas.ts`: 4-directional spatial adjacency lookups and cross-map coordinate alignment.
  - `borderWarp.ts`: Dynamic player step intent interceptor seamlessly warping players across map borders into adjacent zones.
  - `atlasLinter.ts`: Automated world linter diagnosing broken map gates, out-of-bounds spawn points, solid tile spawn traps, duplicate Atlas slots, and one-way gate warnings.
- **Studio Omnisearch & Command Palette (Bible 19 & Bible 29):**
  - `studioOmnisearchEngine.ts`: Headless multi-domain search index with prefix scoring and domain query filters (`@map`, `@npc`, `@creature`, `@item`, `@dock`, `@action`).
  - `omnisearchDispatcher.ts`: Dynamic jump dispatcher loading maps, centering camera over NPC coordinates, and opening relevant editor docks.
  - `studioCommands.ts`: Creator action registry supporting hotkeys (`Ctrl+1` through `Ctrl+5` mode switching, `Ctrl+E` playtest, `Ctrl+S` map save, `Ctrl+N` new map).
- **Inventory, Equipment & Action Hotbar (Bible 12 & Bible 14):**
  - `equipmentEngine.ts`: 8 equipment slots, skill level requirement validation (`canEquipItem`), and aggregate offensive/defensive stat computation.
  - `hotbarDispatcher.ts`: Action hotbar dispatcher (keys 1-8) for food/consumable healing, tool swapping, abilities, and emotes.
  - `inventoryEngine.ts`: Fixed 28-slot MMO inventory grid with smart stack merging, cross-stack removal, drag-and-drop slot swapping, and capacity overflow protection.
- **Combat Targeting, Threat Aggro & Enemy AI Engine (Bible 09 & Bible 10):**
  - `aggroEngine.ts`: Multi-player threat tables, proximity vision aggro, and leash distance boundary enforcement.
  - `monsterStateMachine.ts`: Real-time AI state machine (`IDLE`, `PATROL`, `CHASE`, `ATTACK`, `FLEE` on critical HP, `RETURN_LEASH` on leash breach, `DEAD`).
  - `targetFrameResolver.ts`: Relationship evaluation (`FRIENDLY`, `HOSTILE`, `NEUTRAL`), Euclidean distance & in-range casting validation (`isInRange`), and contextual action triggers (`PARTY_INVITE`, `WHISPER`, `DUEL`, `ATTACK`, `CAPTURE`, `TALK`).
- **Creator Bookmarks & Navigation History (Bible 19 & Bible 27):**
  - `studioBookmarksEngine.ts`: Multi-domain bookmark storage with folder organization, tag filters, search, and JSON export/import.
  - `navigationHistory.ts`: Map navigation history stack with back/forward traversal, new branch forward-stack truncation, and dynamic breadcrumbs (`getBreadcrumbs`).
  - `creatorRecents.ts`: Most-Recently-Used (MRU) tracking for recently modified maps, entities, and assets with auto-eviction.
- **Quest Progression, Scripting & Dialogue Tree Engine (Bible 15 & Bible 16):**
  - `dialogueEngine.ts`: Multi-branch NPC conversation trees, conditional prerequisite verification (`reqQuestId`, `reqItemId`, `reqSkillLevel`), and action execution triggers.
  - `questEngine.ts`: Multi-step quest objective tracking (`TALK`, `KILL`, `GATHER`, `DISCOVER`), sequential stage advancement, and completion reward disbursement.
  - `dialogueLinter.ts`: BFS graph validator diagnosing broken nextNode targets (`MISSING_TARGET_NODE`), unreachable orphan conversation nodes (`UNREACHABLE_NODE`), dead-end options, and duplicate IDs.

## [2.1.277] - 2026-08-16
### Added
- **Shared Entity Runtime Factory (Bible 20 §20 E4):** Created `buildRuntimeEntities()` extracting simulation actors, warp gates, harvestable nodes, spawners, and wild encounter zones from `EntityInstanceV1` records.
- **Context-Sensitive Interaction Engine (Bible 34 §4):** Implemented `queryInteractions()` evaluating dynamic entity capabilities, distance, and player skills; strictly enforced constitutional creature capture rules (capture disabled in overworld exploring, enabled in Turn-Based Buddy Battles).
- **Pluggable Movement Controller System (Bible 34 §7-8):** Built `GridMovementController` and `FreeMovementController` supporting traversal capabilities (`walk`, `swim`, `fly`, `climb`) and terrain movement cost scaling.
- **Shared Gameplay Domain Event Bus (Bible 34 §16):** Built typed, error-contained `gameEvents` singleton connecting creature capture, resource gathering, combat completion, crafting, and quest progress.
- **Dual-Write WorldMap Entities (Bible 20 §20 E2):** Added `entitiesData` column to `WorldMap` in `prisma/schema.prisma` and updated map persistence pipeline.

## [2.1.276] - 2026-08-16
### Added
- **Bible 35 Asset Pipeline & Ingestion System**:
  - Implemented `SourceAsset` and `UsableAsset` models in `prisma/schema.prisma` with SQLite database synchronization and Prisma client bindings.
  - Implemented `ingestAsset()` helper (`src/web/lib/assetUpload.ts`) and `POST /api/assets/upload` endpoint supporting file storage, automatic metadata extraction, and library registration.
  - Created `AssetUploadView.tsx` drag-and-drop ingestion interface in Studio with live preview, classification types, tag editing, and visibility controls.
  - Created interactive HTML5 canvas `SpritesheetSlicer.tsx` supporting auto-grid slicing, free rectangular bounding box selection, direction/facing assignment, and batch slicing endpoint `POST /api/assets/slice`.
  - Implemented Community Governance & Permissions (`src/shared/game/assetPermissions.ts`, `app/api/assets/moderate/route.ts`) supporting scoping (`PERSONAL`, `PROJECT`, `COMMUNITY`, `PUBLIC`), moderator review queues, and automatic creator attribution.
  - Added unit test suites `assetUpload.test.ts`, `assetSlice.test.ts`, and `assetModeration.test.ts`.

## [2.1.275] - 2026-08-16
### Fixed & Improved
- **Chat Socket Deduplication (`index.tsx`)**:
  - Added socket ID deduplication checks to `global_chat_msg` and `party_chat_msg` listeners to prevent the local client from duplicating optimistic chat messages.
- **Studio Coordinate Tracking & Gate Picking (`StudioStatusBar.tsx`, `PropertiesPanel.tsx`)**:
  - Switched Studio status bar coordinate display from `clickedTile` to `hoveredTile` for smooth real-time cursor tracking.
  - Added interactive "Pick on Map" mode in Properties Panel for gate target spawn point (`spawnPoint.x`, `spawnPoint.y`) configuration.
- **Architecture & Pipeline Audit (`001-world-entity-loading.md`, Bible 35)**:
  - Added Bible 35 (`35-asset-ingestion-community-management.md`) defining the full source-vs-derivative asset ingestion pipeline and community management.
  - Audited full-stack map/entity loading pipeline, verifying zero data-loss resilience, dimension resolution, and shard base ID normalization.

## [2.1.274] - 2026-08-16
### Fixed
- **Canonical Starter Map & Initial Spawn Restored (`index.tsx`)**:
  - Restored `DEMO_SANDBOX` as the canonical starter realm on character creation and load (spawning at walkable plaza `(14, 15)` in front of Professor Oakwood's Lab and starter shops).
  - Fixed an issue where new characters were being redirected to an unseeded placeholder map (`LOBBY`), which caused a 404 fallback to a small empty grid where players spawned on border wall collision and could not move.
  - Re-enabled support for character-saved maps so players who have progressed to other zones (e.g. `WILD_MEADOWS`, `QUARRY_MINE`) restore seamlessly into their saved locations.

## [2.1.273] - 2026-08-16
### Added & Improved
- **Starter Testing Realm Suite (`demoMapSeed.ts`, `DemoBootstrap.ts`, `starterMaps.test.ts`)**:
  - Implemented and seeded 5 canonical starter testing maps with full logic components, visual layers, and bidirectional World Atlas gates:
    - `SAINTS_HAVEN` (40×40): Central town plaza, Warden Vance, Professor Oakwood's Lab, General Store, Clinic, Equipment Forge, Base Hub, and 4 Cardinal Gates.
    - `WILD_MEADOWS` (36×36): 4 wildlife quadrants spanning 8 elements (`nutria`, `flowrunt`, `squidoodle`, `rockitten`), Woodcutting groves, and Fishing streams.
    - `QUARRY_MINE` (32×32): Copper and Iron ore veins, Smelting Forge, and aggressive Rock Spider monster spawners for Hero Battles.
    - `TRAINING_ARENA` (30×30): Colosseum sparring ring for Armor Class (AC) and d20 weapon strike testing.
    - `DUNGEON_CRYPTS` (32×32): Level 5 entry gate, shadow corridors, and high-tier Boss Spawner with elevated Willpower DC.
- **Floating Window System Polish (`FloatingWindow.tsx`)**:
  - Added dynamic z-index focus stacking so clicking any window immediately brings it to the top.
  - Added double-click title bar collapse/expand toggle.
  - Added window resize event listener to automatically clamp floating windows within screen viewport boundaries.
- **Inventory UX Quick Actions (`inventory-overlay.tsx`)**:
  - Added double-click fast action on inventory item slots to instantly equip armor/weapons or consume food.
- **D20 Engine Safeguards (`d20Engine.ts`, `heroCombatD20.ts`)**:
  - Added boundary clamping for `hpRatio` and non-negative defense input guards to prevent edge-case arithmetic anomalies.

## [2.1.272] - 2026-08-16
### Added & Improved
- **Pre-Game Gateway & Lobby Chat Sync (`GameTitleScreen.tsx`)**:
  - Subscribed `GameTitleScreen` to incoming global/lobby chat broadcasts (`game_chat_msg`), fixing the issue where pre-world lobby messages sent by other players were not displayed.
  - Implemented deduplication and auto-scroll retention for seamless multi-player chatter before entering world shards.
- **Tuxemon Open Source Attribution Scoping (`docs/TUXEMON_ATTRIBUTION.md`, `tuxemonElementMap.ts`)**:
  - Scoped open-source copyleft notice strictly to CC-BY-SA 4.0 visual monster sprites and LPC character assets.
  - Formally documented that 100% of game engine source code, Go MMO networking, 27-skill proficiency curves, d20 resolution math, and map architectures are proprietary Saints Gaming IP.
- **Tabletop D20 Resolution & Capture Engine (`d20Engine.ts`, `heroCombatD20.ts`)**:
  - Implemented a tabletop d20 resolution engine for creature captures (`d20 + Tamer Proficiency + Tool Tier vs Creature Willpower DC`), featuring Advantage/Disadvantage, Natural 20 Critical Resonance, and Natural 1 Fumble handling.
  - Preserved Pokemon/Tuxemon-style turn-based combat for creature battles (`TurnBattleOverlay.tsx`), enhanced with live d20 capture dice animations and DC check summaries.
  - Built D20 combat resolution for Player vs Monster Hero Battles (`heroCombatD20.ts`) with Armor Class (AC), weapon proficiency bonuses, and elemental saving throws.
- **Layered Floating Windows & Enhanced Inventory UI (`FloatingWindow.tsx`, `inventory-overlay.tsx`)**:
  - Created a reusable, draggable `FloatingWindow` shell with chamfered styling, z-index elevation, and boundary locking.
  - Overhauled Inventory Overlay with category filter tabs (All, Equipment, Consumables, Materials, Quest), multi-attribute sort options (Name, Rarity, Quantity), and full MMO paperdoll slot support (`head`, `chest`, `legs`, `weapon`, `offhand`, `gloves`, `boots`, `ring`, `amulet`, `cape`).
- **Version & Manifest Synchronization**:
  - Bumped project version to `v2.1.272` across `package.json`, `settings.ts`, admin settings, `layout.tsx`, `navbar.tsx`, and documentation badges.

## [2.1.271] - 2026-08-16
### Added & Improved
- **Tile Highlight & Cursor Raycast Alignment (`BabylonEngine.ts`, `tileBatchHelpers.ts`)**:
  - Fixed a diagonal half-tile offset bug in `renderBrushPreview()` and `setSelectionPreview()` by aligning preview quad centers with actual ground tile quads (`posX = (c - w/2)*s`, `posZ = (h/2 - r)*s`).
  - Unified coordinate snapping between cursor pointer, hover reticle, selection boxes, author overlays, and batched mesh tiles.
- **Studio Gateways & Realm Connections Overhaul (`WorldBuilderPanel.tsx`, `LogicTagPalette.tsx`)**:
  - Upgraded Gateways and Edge Connections into an integrated Realm Connections hub with quick gate presets (Cardinal Atlas N/E/S/W, Dungeon, Raid, Event, Mine), target spawn coordinates, map selector, and in-world pin toggles.
  - Enhanced `LogicTagPalette.tsx` with instant category filter tabs (Collision, Gateways, Gathering, Services), 1-click preset brushes, and live color badges matching in-world logic overlays.
- **Skills UI & Inspection Window Decoupling (`skills-overlay.tsx`)**:
  - Overhauled Saint Skills proficiency grid into a spacious 4-5 column responsive layout, eliminating text clipping (`A...1`, `S...1`) and category label squash.
  - Decoupled the Skill Quick-Inspect panel into an independent floating modal card, preserving the full grid view when inspecting skills.
  - Decoupled the Skill Guide into an independent top-level overlay that can be opened without tearing down the underlying skills panel.
- **Equipment Menu & Speed Tier Overhaul (`equipment-overlay.tsx`, `store.ts`)**:
  - Redesigned Combat Metrics header with dedicated Speed Tier pill badge (`⚡ Fast (1.25x)`, `🛡️ Normal (1.00x)`, `🐢 Slow (0.85x)`), fixing column overflow.
  - Expanded paperdoll layout to support full MMO equipment slots (Helmet, Amulet, Chest, Main Hand, Off-Hand, Gauntlets, Greaves, Boots, Ring, Cloak) with item inspect tooltips and weight load indicators.
- **Version & Manifest Synchronization**:
  - Bumped project version to `v2.1.271` across `package.json`, `settings.ts`, `layout.tsx`, `navbar.tsx`, and documentation badges.

## [2.1.270] - 2026-08-15
### Added & Improved
- **Visual Branding & Documentation Polish (`README.md`, `docs/README.md`)**:
  - Upgraded project `README.md` with stylized ASCII banner, custom Badges (`SaintsGaming.net`, `Release v2.1.270`, `Go MMO 3001`, `Babylon 2.5D`), and clear links to the live platform.
  - Prominently positioned [**SaintsGaming.net**](https://SaintsGaming.net) across all public documentation headers and indices.
  - Formatted a clean 3-column ecosystem layout connecting Web Platform, Game Client, and Saints Studio.
  - Bumped project version to `v2.1.270` across `package.json`, `settings.ts`, and admin pages.

## [2.1.269] - 2026-08-15
### Added & Improved
- **Comprehensive Systems Wiki & Documentation Architecture (`docs/`)**:
  - Structured documentation tree into two clear subdirectories: **`docs/game-systems/`** and **`docs/studio/`** indexed via **`docs/README.md`**.
  - **Game Systems Wiki**: Authored comprehensive architectural guides covering [Client Architecture & Loop](docs/game-systems/architecture-and-loop.md), [27-Skill Progression & Grandmaster Capstones](docs/game-systems/skills-and-progression.md), [Dual Combat & Encounters](docs/game-systems/combat-and-encounters.md), [Go MMO Networking & AOI Sharding](docs/game-systems/networking-and-multiplayer.md), [Item Schemas & Loot](docs/game-systems/items-and-economy.md), and [Mobile Touch Mode & UI Docks](docs/game-systems/mobile-and-ui.md).
  - **Studio Editor Wiki**: Authored detailed creator guides covering [Studio Architecture & Modes](docs/studio/studio-architecture.md), [Dual-Grid Tile Painting & Remeshing](docs/studio/tile-painting-and-maps.md), [Entities, Spawners & NPCs](docs/studio/entities-and-npcs.md), [Catalogs & Definition Editors](docs/studio/catalogs-and-definitions.md), and [Validation, Webhook Sync & PIE Playtesting](docs/studio/validation-sync-playtest.md).
  - Synchronized project version number across all manifests (`package.json`, `settings.ts`, admin settings, `README.md`).

## [2.1.268] - 2026-08-15
### Added & Improved
- **Project Vision & Documentation Audit (`README.md`, `.docs/public-docs/vision/`, `.docs/info/vision/`)**:
  - Re-calibrated public and private documentation to accurately reflect the project scope as an indie sandbox project by **GioGimic**.
  - Toned down marketing claims across public README and vision documents to present features simply, clearly, and honestly.
  - Documented recent completion of the 27-skill proficiency matrix, 270-tier Battlepass cosmetic tracks, Grandmaster capstone capes (Max Cape, Completionist Cape, Master Totem), and 29 Skill Cape Emotes with WebAudio soundscapes and visual FX.
  - Synchronized and verified version constants across `package.json`, `app/actions/settings.ts`, and admin configurations.

## [2.1.265] - 2026-08-15
### Added & Improved
- **Global Extras 2/7: Skill Cape Emotes & Visual FX System (`skillCapeEmotes.ts`, `SkillGuideModal.tsx`)**:
  - Created centralized Skill Cape Emotes & Visual FX Registry (`skillCapeEmotes.ts`) defining 29 unique cape emotes across all 27 skill proficiencies plus the Max Cape of the Grandmaster and Grandmaster Completionist Cape.
  - Added interactive Emote FX preview player to `SkillGuideModal.tsx` for tier rewards and header quick-preview with synthesized WebAudio feedback and pulsing visual FX banners.
  - Added comprehensive Vitest suite in `src/shared/game/skillCapeEmotes.test.ts` asserting all 29 cape emote definitions, slug lookups, and visual particle configurations.

## [2.1.264] - 2026-08-15
### Added & Improved
- **Global Extras 1/7: Max Cape of the Grandmaster & Master Totem System (`skillTypings.ts`, `items.ts`, `skills-overlay.tsx`)**:
  - Implemented `ALL_SKILL_SLUGS` constant uniting all 27 skill proficiencies across Combat (9), Gathering (5), Artisan (8), and Support (5).
  - Added mathematical Total Level & Total XP calculator helpers (`calculateTotalLevel`, `calculateTotalXp`, `isMaxCapeEligible`, `getMaxProgress`).
  - Added Grandmaster Capstones to `ITEM_DB`: `Max Cape of the Grandmaster`, `Max Hood of the Grandmaster`, `Sanctum Master Totem Relic` (+10% global XP across all 27 skills), and `Grandmaster Completionist Cape` (all 270 battlepass reward tiers).
  - Enhanced Lobby Skills Overlay with a live animated Max Cape & Master Totem progression bar, percentage gauge, maxed skill counter, and dynamic `👑 MAXED GRANDMASTER` crown badge.

## [2.1.263] - 2026-08-15
### Added & Improved
- **Skill 27/27: Necromancy Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete initiate necrotic bone wands, earthen soul urns, death guard plate-shrouds, spectral spirit lanterns, deathdealer heavy scythes, abyssal lich sovereign vestments, and celestial reaper death overlord scythes progression (Initiate Necrotic Bone Wands, Earthen Soul Urns, Death Guard Plate-Shrouds, Spectral Spirit Lanterns, Deathdealer Heavy Scythes, Abyssal Lich Sovereign Vestments, and Celestial Reaper Death Overlord Scythes) with explicit Necromancy level requirements (`reqSkill: 'Necromancy'`, `reqLevel: number`), soul harvesting rituals, lifesteal siphons, undead thrall summons (Skeleton Warriors, Putrid Zombies, Vengeful Ghosts), and execute thresholds.
  - Completed the full 27-skill proficiency matrix across all 4 categories (Combat: 9, Gathering: 5, Artisan: 8, Support: 5) with full dynamic equipment aggregation and level unlock lookups.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Necromancy spanning Lv 10 to Lv 99 (Novice Necromancer, Soul Harvester, Dread Lich titles, Spectral Soul Siphon emote, Necrotic Crypt Mists, Orbiting Soul Flame Wisp Halo, Abyssal Reaper Supernova Corona auras, Obsidian Skull Crown cosmetic, and Cape of Necromancy).

## [2.1.262] - 2026-08-15
### Added & Improved
- **Skill 26/27: Prayer Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete animal bones, blessed holy symbols, giant beast bones, sanctified monk vestments, ancient dragon bones, demonic infernal ashes, sanctified templar robes, and celestial hierophant halo crowns progression (Clean Animal Bones, Blessed Silver Holy Symbols, Giant Beast Bones, Sanctified Monk Vestments, Ancient Dragon Bones, Demonic Infernal Ashes, Sanctified Templar Robes, and Celestial Hierophant Halo Crowns) with explicit Prayer level requirements (`reqSkill: 'Prayer'`, `reqLevel: number`), prayer point drain reduction, overhead 100% protection wards (Magic, Missiles, Melee), Smite faith siphon, and Piety/Rigour/Augury divine seals.
  - Dynamically aggregated bone offerings, church altar consecrations, overhead protections, and holy knight seals for the Prayer handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Prayer spanning Lv 10 to Lv 99 (Novice Acolyte, Templar Crusader, High Inquisitor titles, Consecrate Altar emote, Seraphic Golden Shimmer, Orbiting Holy Light Halo, Solar Archangel Supernova Corona auras, Sanctified Monk Vestments cosmetic, and Cape of Prayer).

## [2.1.261] - 2026-08-15
### Added & Improved
- **Skill 25/27: Magic Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete apprentice wands, gale air battle staves, mystic indigo robes, pyromancer burning battle staves, ancient Zarosian grimoires, infinity prismatic silk robes, limitless 4-element catalysts, and celestial archmage singularity staves progression (Apprentice Carved Wands, Gale Air Battlestaves, Mystic Indigo Robe Tops, Pyromancer Battlestaves, Zarosian Ancient Grimoires, Infinity Prismatic Robes, Staff of Limitless Elements, and Celestial Archmage Singularity Staves) with explicit Magic level requirements (`reqSkill: 'Magic'`, `reqLevel: number`), elemental damage multipliers, magic accuracy buffs, and miniature black hole singularities.
  - Dynamically aggregated elemental strikes, high alchemy, continental teleports, and ancient barrages for the Magic handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Magic spanning Lv 10 to Lv 99 (Novice Mage, Elemental Sorcerer, Archmage Primus titles, Arcane Spellcast emote, Mystic Leyline Shimmer, Orbiting Arcane Rune Shimmer Halo, Celestial Hypernova Corona auras, Archmage Wizard Hat cosmetic, and Cape of Magic).

## [2.1.260] - 2026-08-15
### Added & Improved
- **Skill 24/27: Summoning Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete spirit shard currency, elemental soul charms (Gold, Green, Crimson, Blue), beast of burden familiars (Spirit Terrorbird 12-slot, War Tortoise 18-slot, Pack Yak 30-slot), combat healing familiars (Bunyip), war machine familiars (Steel Titan), and celestial apex chimera crowns progression (Resonant Spirit Shards, Gold Summoning Charms, Spirit Wolf Summoning Pouches, Green Summoning Charms, Desert Wyrm Summoning Pouches, Crimson Summoning Charms, Spirit Terrorbird Pouches, Blue Summoning Charms, War Tortoise Summoning Pouches, Bunyip Aquatic Pouches, Pack Yak Summoning Pouches, Steel Titan Summoning Pouches, and Celestial Apex Chimera Crowns) with explicit Summoning level requirements (`reqSkill: 'Summoning'`, `reqLevel: number`), beast of burden inventory capacities, combat passive health regen, and artillery strikes.
  - Dynamically aggregated soul charm binding, obelisk infusions, and familiar beasts for the Summoning handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Summoning spanning Lv 10 to Lv 99 (Novice Beastmaster, Spirit Whisperer, Titan Caller titles, Familiar Roar emote, Primal Beast Mists, Orbiting Spirit Shard Shimmer Halo, Astral Chimera Supernova Corona auras, Shaman Totem Staff cosmetic, and Cape of Summoning).

## [2.1.259] - 2026-08-15
### Added & Improved
- **Skill 23/27: Thieving Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete lockpick tension sets, black silk disguises, charcoal smoke bombs, flash powder, muffled rogue footwear, shadow vestments, master diamond vault keycards, ambient darkness cloaks, and celestial eclipse shadow stilettos progression (Tempered Steel Lockpicks, Black Silk Bandit Masks, Dense Charcoal Smoke Bombs, Nitrogen Flash Smoke Powder, Muffled Rogue Boots, Midnight Rogue Vestments, Royal Diamond Safe Keycards, Shadow Infiltration Cloaks, and Celestial Eclipse Shadow Stilettos) with explicit Thieving level requirements (`reqSkill: 'Thieving'`, `reqLevel: number`), pickpocket success rate buffs, stun recovery acceleration, and guaranteed critical backstabs.
  - Dynamically aggregated lockpicking, pocket picking, and fortress vault cracking for the Thieving handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Thieving spanning Lv 10 to Lv 99 (Novice Cutpurse, Shadow Infiltrator, Phantom Burglar titles, Coin Pouch Sleight emote, Nightfall Mist Shimmer, Orbiting Shadow Smoke Orb Halo, Eclipse Shadow Corona auras, Shadow Rogue Cowl cosmetic, and Cape of Thieving).

## [2.1.258] - 2026-08-15
### Added & Improved
- **Skill 22/27: Smithing Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete metal bar smelting, forging hammer tools, structural nails, heavy armor plates, blades, masterwork folded alloy ingots, and celestial forgemaster anvil warhammers progression (Smelted Bronze Ingots, Tempered Ball-Peen Hammers, Smelted Iron Ingots, High-Carbon Steel Ingots, Forged Steel Structural Nails, Azure Mithril Ingots, Adamantine Ingots, Cyan Runite Ingots, Masterwork Alloy Ingots, and Celestial Forgemaster Anvil Hammers) with explicit Smithing level requirements (`reqSkill: 'Smithing'`, `reqLevel: number`), faster anvil hammering speeds, extra double-bar smelting chances, and masterwork item stat amplifiers.
  - Dynamically aggregated metal smelting, anvil hammering, and masterwork alloy folding for the Smithing handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Smithing spanning Lv 10 to Lv 99 (Novice Blacksmith, Master Forgemaster, Colossus Smith titles, Anvil Heavy Strike emote, White-Hot Furnace Hearth, Orbiting Molten Ember Halo, Solar Forge Supernova Corona auras, Heavy Blacksmith Apron cosmetic, and Cape of Smithing).

## [2.1.257] - 2026-08-15
### Added & Improved
- **Skill 21/27: Runecrafting Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete dense pure rune essence, runic tiaras, essence storage pouches (Small, Medium, Large, Giant, Colossal), catalytic and elemental runes (Air, Mind, Water, Earth, Fire, Chaos, Nature, Law, Death, Blood, Soul), and celestial astral keystones progression (Dense Pure Rune Essence, Air Elemental Runes, Small Essence Pouches, Air Runic Tiaras, Mind Catalytic Runes, Water Elemental Runes, Earth Elemental Runes, Medium Essence Pouches, Fire Elemental Runes, Chaos Destruction Runes, Large Essence Pouches, Nature Alchemy Runes, Law Teleportation Runes, Giant Essence Pouches, Death Oblivion Runes, Blood Sanguine Runes, Soul Transcendence Runes, and Celestial Astral Keystone Crowns) with explicit Runecrafting level requirements (`reqSkill: 'Runecrafting'`, `reqLevel: number`), essence pouch capacities, and multi-rune elemental casting power.
  - Dynamically aggregated rune binding, essence extraction, and altar ruins infusion for the Runecrafting handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Runecrafting spanning Lv 10 to Lv 99 (Novice Runesmith, Glyph Crafter, Arch-Runemaster titles, Runic Glyph Scribe emote, Rift Warp Shimmer, Orbiting Tri-Element Rune Halo, Radiant Astral Glyph Corona auras, Runecrafter Satchel cosmetic, and Cape of Runecrafting).

## [2.1.256] - 2026-08-15
### Added & Improved
- **Skill 20/27: Herblore Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete vials of spring water, herb cleaning, secondary catalysts, combat boost potions (Attack, Strength, Defence), energy elixirs, vitality restoration brews, multi-stat overloads, and celestial philosopher ambrosia progression (Vials of Pure Spring Water, Apprentice Attack Draughts, Herbal Antipoison Tonics, Warrior Strength Infusions, Stat Restoration Draughts, Stamina Energy Tonics, Sacred Ranarr Prayer Brews, Super Attack Elixirs, Super Strength Elixirs, Super Defence Fortifications, Sacred Vitality Restorative Brews, Supreme Overload Concoctions, and Celestial Philosopher Ambrosia) with explicit Herblore level requirements (`reqSkill: 'Herblore'`, `reqLevel: number`), potion duration boosts, and combat overheal buffs.
  - Dynamically aggregated herb cleaning, potion brewing, and alchemical transmutation for the Herblore handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Herblore spanning Lv 10 to Lv 99 (Novice Apothecary, Master Alchemist, Grand Transmuter titles, Pestle & Mortar Grind emote, Emerald Cauldron Mists, Orbiting Potion Flask Halo, Philosopher Stone Corona auras, Apothecary Bandolier cosmetic, and Cape of Herblore).

## [2.1.255] - 2026-08-15
### Added & Improved
- **Skill 19/27: Fletching Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete arrow shafts, metal broadhead arrows (Bronze, Iron, Mithril, Rune), unstrung carved bows (Oak, Willow, Maple, Yew, Magic), crossbow bolts, throwing dart spikes, and celestial hyperion bows progression (Whittled Arrow Shafts, Bronze Broadhead Arrows, Unstrung Oak Shortbows, Iron Broadhead Arrows, Unstrung Willow Longbows, Steel Crossbow Bolts, Unstrung Maple Shortbows, Mithril Dart Spikes, Unstrung Yew Longbows, Rune Piercing Arrows, Unstrung Magic Shortbows, Dragonfire Tipped Bolts, and Celestial Hyperion Star Bows) with explicit Fletching level requirements (`reqSkill: 'Fletching'`, `reqLevel: number`), projectile speed bonuses, and armor-penetrating critical damage.
  - Dynamically aggregated bow carving, arrow fletching, and bolt tipping for the Fletching handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Fletching spanning Lv 10 to Lv 99 (Novice Fletcher, Master Bowyer, Hyperion Fletcher titles, Whittling Knife Flip emote, Fluttering Feather Drift, Orbiting Fletched Arrow Halo, Gale Wind Vortex Corona auras, Windfeather Quiver cosmetic, and Cape of Fletching).

## [2.1.254] - 2026-08-15
### Added & Improved
- **Skill 18/27: Firemaking Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete torches, bullseye/oil/obsidian lanterns, tinderboxes, timber log pyres (Regular, Oak, Willow, Maple, Yew, Magic, Redwood), and celestial sunfire beacon progression (Flint & Steel Tinderboxes, Pitch-Dipped Hand Torches, Brass Bullseye Lanterns, Oak Hearth Pyres, Willow Ember Fires, Refined Steel Oil Lanterns, Maple Bonfire Gatherings, Acetylene Pressure Torches, Yew Flame Spirit Pyres, Pyrelord Obsidian Lanterns, Magic Arcane Pyre Beacons, Sunfire Beacon Catalysts, Redwood Colossal Bonfires, and Celestial Sunfire Matrices) with explicit Firemaking level requirements (`reqSkill: 'Firemaking'`, `reqLevel: number`), party bonfire HP regeneration auras, dungeon darkness illumination, and thermal flame damage buffs.
  - Dynamically aggregated timber fires, lanterns, and regional sunfire beacons for the Firemaking handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Firemaking spanning Lv 10 to Lv 99 (Novice Igniter, Pyromancer, Firelord titles, Fire Juggle emote, Sizzling Ember Steps, Orbiting Will-o'-the-Wisp Halo, Radiant Sunfire Flare Corona auras, Gilded Flame Torch cosmetic, and Cape of Firemaking).

## [2.1.253] - 2026-08-15
### Added & Improved
- **Skill 17/27: Crafting Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete leathercraft, gemstone jewelry (Sapphire, Emerald, Ruby, Diamond, Onyx), soul capture film rolls (Standard, Fine Grain, Quantum Master), and celestial singularity prism matrices progression (Stitched Leather Gloves, Polished Sapphire Rings, Standard Film Rolls, Strung Emerald Amulets, Fine Grain Film Rolls, Ornate Ruby Necklaces, Green Dragonhide Tunics, Cut Diamond Bangles, Quantum Master Film Rolls, Onyx Amulet of Supreme Fury, and Celestial Singularity Prism Matrices) with explicit Crafting level requirements (`reqSkill: 'Crafting'`, `reqLevel: number`), catch-rate multipliers, and combat crit/defence bonuses.
  - Dynamically aggregated jewelcrafting, film manufacturing, and operative dragonhide tailoring for the Crafting handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Crafting spanning Lv 10 to Lv 99 (Novice Artisan, Master Gemologist, Matrix Artificer titles, Gem Chisel Spark emote, Orbiting Diamond Facets, Gilded Gemstone Ring Halo, Prismatic Laser Matrix Corona auras, Jeweler Magnifier Monocle cosmetic, and Cape of Crafting).

## [2.1.252] - 2026-08-15
### Added & Improved
- **Skill 16/27: Cooking Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete culinary dishes, baked pies, seafood feasts, chef attire, and celestial ambrosia progression (Cooked Coastal Shrimp, Fresh Oven Bread Loaves, Master Chef Toques & Aprons, Pan-Seared Rainbow Trout, Deep-Dish Venison Meat Pies, Grilled Salmon Fillets, Butter-Steamed Ocean Lobsters, Charbroiled Swordfish Steaks, Glazed Summer Berry Pies, Charred Apex Shark Cutlets, Royal Grand Banquet Roasts, and Celestial Ambrosia of the Saints) with explicit Cooking level requirements (`reqSkill: 'Cooking'`, `reqLevel: number`), food burning reductions, and massive health/stat restorations.
  - Dynamically aggregated kitchen ranges, campfire recipes, and banquet roasts for the Cooking handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Cooking spanning Lv 10 to Lv 99 (Novice Cook, Banquet Chef, Culinary Master titles, Flambé Frying Pan emote, Sizzling Ember Steam, Orbiting Roast Feast Halo, Saintly Golden Feast Corona auras, Golden Chef Hat & Cleaver cosmetic, and Cape of Cooking).

## [2.1.251] - 2026-08-15
### Added & Improved
- **Skill 15/27: Construction Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete Sanctuary estate deeds, planks, flatpacks, crystal portals, gilded prayer altars, demon thrones, and celestial citadel keystones progression (Sanctuary Estate Deeds, Sawmill Wood Planks, Cured Oak Planks, Oak Dining Table Flatpacks, Tropical Teak Planks, Teak Dining Bench Flatpacks, Crystal Portal Nexus Frames, Fine Mahogany Planks, Gilded Sanctuary Altars, Demonic Mahogany Thrones, and Celestial Palace Keystones) with explicit Construction level requirements (`reqSkill: 'Construction'`, `reqLevel: number`).
  - Dynamically aggregated estate fixtures, blueprints, and furniture flatpacks for the Construction handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Construction spanning Lv 10 to Lv 99 (Novice Builder, Master Carpenter, Grand Architect titles, Golden Hammer Tap emote, Blueprint Drafting Glyphs, Golden Chandelier Glow, Floating Celestial Citadel Halo auras, Architect Drafting Compass Belt cosmetic, and Cape of Construction).

## [2.1.250] - 2026-08-15
### Added & Improved
- **Skill 14/27: Woodcutting Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete forestry hatchets, timber logs, and starlight boughs progression (Bronze, Iron, Steel, Mithril, Adamant, Rune, Saintly Amberwood, and Celestial World-Tree Hatchets, Regular, Oak, Willow, Teak, Maple, Yew, Magic, Redwood Titan Logs, and Celestial World-Tree Boughs) with explicit Woodcutting level requirements (`reqSkill: 'Woodcutting'`, `reqLevel: number`) and tree chopping swing speed multipliers.
  - Dynamically aggregated hatchets, timber logs, and forestry harvesting for the Woodcutting handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Woodcutting spanning Lv 10 to Lv 99 (Novice Lumberjack, Master Forester, Timber Lord titles, Swirling Emerald Leaves, Forest Dryad Wisps, Sylvan Warden Canopy Halo auras, Flannel Lumberjack Beanie cosmetic, and Cape of Woodcutting).

## [2.1.249] - 2026-08-15
### Added & Improved
- **Skill 13/27: Mining Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete mining pickaxes, metal ore strata, coal fuel, and cosmic asteroid cores progression (Bronze, Iron, Steel, Mithril, Adamant, Rune, Saintly Lumite, and Celestial Starfall Pickaxes, Copper, Tin, Iron, Coal, Mithril, Adamantite, Runite Ores, and Celestial Asteroid Cores) with explicit Mining level requirements (`reqSkill: 'Mining'`, `reqLevel: number`) and mineral extraction speed multipliers.
  - Dynamically aggregated pickaxes, ores, and geological quarrying nodes for the Mining handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Mining spanning Lv 10 to Lv 99 (Novice Miner, Veteran Prospector, Earth Shaker titles, Ore Dust Sparks, Orbiting Geode Ring, Seismic Magma Corona auras, Hardhat Mining Lamp cosmetic, and Cape of Mining).

## [2.1.248] - 2026-08-15
### Added & Improved
- **Skill 12/27: Hunter Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete wildlife tracking traps, critters, pelts, and camouflage suits progression (Standard Bird Snares, Crimson Finch Plumes, Oak Deadfall Rigs, Spotted Kebbit Furs, Spring-Loaded Box Traps, Red Carnivorous Chinchompas, Woodland Ghillie Tunics, Sabretooth Kyatt Pelts, Black Abyssal Chinchompas, and Celestial Solar Phoenix Plumes) with explicit Hunter level requirements (`reqSkill: 'Hunter'`, `reqLevel: number`) and stealth concealment bonuses.
  - Dynamically aggregated wild critter traps, bird snares, and animal pelts for the Hunter handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Hunter spanning Lv 10 to Lv 99 (Novice Trapper, Wilderness Tracker, Apex Predator titles, Autumn Camo Leaves, Hunting Horn Call, Primal Spirit Beast Halo auras, Camo Ghillie Hood cosmetic, and Cape of Hunter).

## [2.1.247] - 2026-08-15
### Added & Improved
- **Skill 11/27: Fishing Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete raw seafood catches, tackle, and deep-ocean harpoon progression (Small Hand Fishing Nets, Raw Coastal Shrimp, Raw Rainbow Trout, Raw Crimson Salmon, Wicker Lobster Pots, Raw Ocean Lobsters, Raw Bladed Swordfish, Raw Great Apex Sharks, Raw Abyssal Manta Rays, and Celestial Leviathan Scales) with explicit Fishing level requirements (`reqSkill: 'Fishing'`, `reqLevel: number`) and double-catch multipliers.
  - Dynamically aggregated raw seafood, nets, and tackle for the Fishing handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Fishing spanning Lv 10 to Lv 99 (Novice Angler, River Trawler, Master of the Deep titles, Aqua Splash Rings, Bioluminescent School, Oceanic Whirlpool Halo auras, Sea Captain Bicorn Hat cosmetic, and Cape of Fishing).

## [2.1.246] - 2026-08-15
### Added & Improved
- **Skill 10/27: Farming Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete agricultural crop seeds, supercompost, enchanted watering cans, and botanical harvest trees progression (Potato Allotment Seeds, Guam Herb Seeds, Supercompost Soil Pails, Sweetcorn Allotment Seeds, Ranarr Herb Seeds, Watermelon Seeds, Enchanted Bottomless Cans, Magic Tree Saplings, Spirit Tree Acorns, and Celestial Starflower Bulbs) with explicit Farming level requirements (`reqSkill: 'Farming'`, `reqLevel: number`) and crop yield bonuses.
  - Dynamically aggregated farming seeds, composting items, and agricultural milestones for the Farming handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Farming spanning Lv 10 to Lv 99 (Novice Planter, Green Thumb, Master Botanist titles, Sprouting Seedling Steps, Enchanted Flora Swarm, Demeter Blossom Halo auras, Sunflower Straw Hat cosmetic, and Cape of Farming).

## [2.1.245] - 2026-08-15
### Added & Improved
- **Skill 9/27: Intelligence Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete spellcasting wands, arcane staves, and catalysts progression (Apprentice Ash Wands, Sparking Quartz Wands, Pyromancer Ash Staves, Glacial Cryo Orbs, Thunderstrike Grimoires, Voidwalker Arch-Staves, Saintly Sunfire Scepters, and Celestial Singularity Batons) with explicit Intelligence level requirements (`reqSkill: 'Intelligence'`, `reqLevel: number`) and spell attack power/haste stats.
  - Dynamically aggregated arcane wands, staves, and destructive elemental abilities for the Intelligence handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Intelligence (Novice Evoker, Pyromancer Adept, Grand Archmage titles, Magenta Rune Glyphs, Lightning Arc Storm, Cosmic Plasma Corona auras, Floating Grimoire Pet, and Cape of Intelligence).

## [2.1.244] - 2026-08-15
### Added & Improved
- **Skill 8/27: Wisdom Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete spiritual ward shields, mana restoring elixirs, sacred incense, and divine robes progression (Apprentice Spirit Talismans, Distilled Mana Draughts, Willow Prayer Scriptures, Sacred Cleansing Incense, Spirit Ward Bucklers, Grand Mana Elixirs, Archon Spirit Aegis, Sanctified Hierophant Robes, Saintly Seraph Vestments, and Celestial Sovereign Sanctuaries) with explicit Wisdom level requirements (`reqSkill: 'Wisdom'`, `reqLevel: number`) and MP restoration/healing power stats.
  - Dynamically aggregated spirit wards, mana elixirs, and restorative support abilities for the Wisdom handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Wisdom (Novice Acolyte, Enlightened Mystic, Hierophant titles, Indigo Halo, Sacred Lotus Mandala, Celestial Seraph Wings auras, and Cape of Wisdom).

## [2.1.243] - 2026-08-15
### Added & Improved
- **Skill 7/27: Perception Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete optical spyglasses, tactical monocles, radar lenses, and divination crowns progression (Brass Spyglasses, Hunter Tracking Charms, Scout Monocles, True-Sight Clarifying Elixirs, Hawkeye Sniper Goggles, Crystalline Prism Lenses, Shadow-Seer Night Visors, Oracle All-Seeing Oculus, Saintly Divination Circlets, and Celestial Omniscient Crowns) with explicit Perception level requirements (`reqSkill: 'Perception'`, `reqLevel: number`) and critical strike/radar vision stats.
  - Dynamically aggregated optical eyepieces, true-sight potions, and weak-point analysis skills for the Perception handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Perception (Novice Tracker, Keen Eye, Shadow Hunter titles, Violet Scanlines and Mystic Third Eye auras, Astral Monocle, and Cape of Perception).

## [2.1.242] - 2026-08-15
### Added & Improved
- **Skill 6/27: Agility Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete agility footwear, weight-reducing clothing, and stamina elixirs progression (Leather Hiking Boots, Nimble Track Runners, Graceful Wind Cloaks, Shadow Shinobi Tabi, Zephyr Windwalkers, Cyclone Striders, Saintly Winged Sandals, Celestial Starstrider Greaves, and Grand Stamina Elixirs) with explicit Agility level requirements (`reqSkill: 'Agility'`, `reqLevel: number`) and mobility/defense stats.
  - Dynamically aggregated agility footwear, stamina restore potions, and shortcut techniques for the Agility handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Agility (Novice Acrobat, Swift Shadow, Zephyr Ghost titles, Cyan Gust Streamers and Cyclone Dash Trails auras, Wind-Dancer Sash, and Cape of Agility).

## [2.1.241] - 2026-08-15
### Added & Improved
- **Skill 5/27: Ranged Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete bow, crossbow, and ranger armor tier progression (Starter Wood, Oak, Willow, Maple, Yew, Magic Shortbow, Darkveil Ballista, Celestial Sunstriker Greatbow, and Wyrmhide tunics) with explicit Ranged level requirements (`reqSkill: 'Ranged'`, `reqLevel: number`) and ranged attack power stats.
  - Dynamically aggregated shortbows, longbows, crossbows, and leather armors for the Ranged handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Ranged (Novice Marksman, Windstrider, Deadeye Sniper titles, Gale Wind and Phantom Arrow Trails auras, Feathered Quiver, and Cape of Ranged).

## [2.1.240] - 2026-08-15
### Added & Improved
- **MMO Gateway Hub & Pre-Game Entrance Redesign (`GameTitleScreen.tsx`, `character-selector.tsx`, `ServerSelect.tsx`, `GameLogin.tsx`, `index.tsx`)**:
  - Rebuilt `/lobby` initial entry screen into an authentic Diablo II and RuneScape style 3-column MMO Gateway Hub.
  - Infused the visual atmosphere and color palette from the Saints Landing Page (synthwave horizon grid floor, sunset glow, digital snow particles, palm canopy vignette, CRT scanlines) with zero modifications to the landing page or Skill UI.
  - **Operative Stage (Left)**: Active hero animated pedestal showcase with class badges, glowing runic aura, HP & gold counters, quick character carousel cycler, and primary `ENTER REALM` CTA.
  - **Global Lobby Chat (Center)**: Live in-lobby pre-game chat channel supporting global chat, broadcast announcements, system notifications, and realtime socket dispatch.
  - **Realm Gateway & Hall of Champions (Right)**: Live server telemetry (heartbeat, latency, population bar, dev controls) and Top 5 Operatives leaderboard ranking preview with live sync.
  - Re-themed `character-selector.tsx`, `ServerSelect.tsx`, and `GameLogin.tsx` to match the synthwave MMO command deck design.

## [2.1.239] - 2026-08-15
### Added & Improved
- **Skill 4/27: Hitpoints Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete vitality consumables and food progression (Fresh Loaf, Grilled Trout, Crimson Salmon, Butter Lobster, Apex Shark, Saintly Ambrosia, Phoenix Rebirth Heart) with explicit Hitpoints level requirements (`reqSkill: 'Hitpoints'`, `reqLevel: number`) and HP restore stats.
  - Dynamically aggregated vitality rations, recovery potions, and talisman accessories for the Hitpoints handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Hitpoints (Novice Vitalist, Resilient Soul, Living Phoenix titles, Emerald Heartbeat Pulse and Petal Swarm auras, and Cape of Hitpoints).

## [2.1.238] - 2026-08-15
### Added & Improved
- **Skill 3/27: Defence Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete protective armor & shield tier progression (Bronze, Iron, Steel, Mithril, Adamant, Rune full sets, Saintly Bastion Aegis, Celestial Cosmos Bulwark) with explicit Defence skill level requirements (`reqSkill: 'Defence'`, `reqLevel: number`) and defense mitigation stats.
  - Dynamically aggregated shields, full helms, platebodies, and platelegs for the Defence handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Defence (Shieldbearer, Iron Wall Sentinel, Immortal Bastion titles, Sapphire Barrier and Prismatic Ward dome auras, and Cape of Defence).

## [2.1.237] - 2026-08-15
### Added & Improved
- **Skill 2/27: Strength Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded full heavy & crushing weapon tier progression (Bronze, Iron, Steel, Mithril, Adamant, Rune Battleaxes/Warhammers, Colossus Mauls, Titan Crushers) with explicit Strength skill level requirements (`reqSkill: 'Strength'`, `reqLevel: number`) and crushing damage stats.
  - Dynamically aggregated equipment unlocks and heavy combat abilities for the Strength handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Strength (Novice Brawler, Colossus of Iron, Unstoppable Juggernaut titles, Earth Tremor and Molten Impact auras, and Cape of Strength).

## [2.1.236] - 2026-08-15
### Added & Improved
- **Skill 1/27: Attack Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded full weapon tier progression (Bronze, Iron, Steel, Mithril, Adamant, Rune, Saintly, Celestial) with explicit Attack skill level requirements (`reqSkill: 'Attack'`, `reqLevel: number`) and attack power stats.
  - Dynamically aggregated equipment unlocks and abilities for the Attack handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Attack (Novice Swordsman, Blademaster, Warmaster titles, Crimson particle auras, and Cape of Attack).

## [2.1.235] - 2026-08-15
### Added & Improved
- **27-Skill Progression Guide Data & Unlocks Registry (`skillGuideData.ts`)**:
  - Implemented the master 27-skill proficiency registry with per-level perk formulas, milestone level unlocks, dynamic item/recipe/ability aggregators, and battlepass-style cosmetic reward tracks.
- **Interactive Skill Guide Handbook Modal (`SkillGuideModal.tsx`)**:
  - Built a comprehensive handbook inspection modal with overview metrics, filterable level unlock tables, and multi-tier battlepass cosmetic progression tracks with audio cues.
- **Skills Matrix Overlay Integration (`skills-overlay.tsx`)**:
  - Upgraded all 27 skill cards with individual SVG vector icons, animated level progress bars, and click-to-open handbook triggers.

## [2.1.234] - 2026-08-15
### Added & Improved
- **World Atlas & Macro Region Connectivity Panel (`WorldAtlasPanel.tsx`)**:
  - Upgraded macro world atlas matrix with adjacency indicator pips, node inspector, spawn hub assigner, and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`, `soundSynth.playUiClick()`).
- **World Builder & Multi-Layer Map Creator Panel (`WorldBuilderPanel.tsx`)**:
  - Modernized map manager with slug creator, resize dimension controls, layer manager, and audio feedback.

## [2.1.233] - 2026-08-15
### Added & Improved
- **Studio Asset Pack & Resource Browser (`AssetEditor.tsx`)**:
  - Upgraded asset management suite with pack categorization filters, quick tags, gameplay flags, and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`, `soundSynth.playUiClick()`).
- **Sprite Browser & Animated Preview Modal (`SpriteBrowser.tsx`)**:
  - Modernized sprite selection grid with class filters, preview frame controls, and audio cues (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).

## [2.1.232] - 2026-08-15
### Added & Improved
- **Studio Omnisearch Fuzzy Command Palette (`StudioOmnisearch.tsx`)**:
  - Upgraded global search modal with cyber chamfered glass card, live search categories, keyboard shortcut badges, and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).
- **Visual Tileset Palette & Brush Picker (`TilesetPicker.tsx`)**:
  - Modernized layer manager, brush selector, and tileset switcher with chamfered geometry and audio feedback (`soundSynth.playSelectSound()`, `soundSynth.playUiClick()`).

## [2.1.231] - 2026-08-15
### Added & Improved
- **Studio Paint & Tool HUD Controller (`StudioPaintHud.tsx`)**:
  - Upgraded paint tool pill with cyber chamfered badges, glowing active indicators, and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playUiClick()`).
- **Studio Favorites Quick Strip (`StudioFavoritesStrip.tsx`)**:
  - Modernized bookmark strip with sound synthesis on pin opening and removal.

## [2.1.230] - 2026-08-15
### Added & Improved
- **Studio Menu Bar & Tool Controller (`StudioMenuBar.tsx`)**:
  - Upgraded top-level menus, mode switcher (Edit/Playtest), and hotkeys with cyber chamfered badges and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).
- **Studio Status Bar & Realtime Telemetry (`StudioStatusBar.tsx`)**:
  - Modernized telemetry chips with latency metrics, FPS counter, brush size displays, and sound cues.

## [2.1.229] - 2026-08-15
### Added & Improved
- **Interactive HUD Docking Architecture & Drop Zones (`DockZone.tsx`)**:
  - Upgraded dock zones with cyber chamfered badges, glowing border animations, and audio drop feedback (`soundSynth.playActionSound()`).
- **Dockable Widget Drag Handles & Controls (`DockableWidget.tsx`)**:
  - Modernized drag header, size cycling (compact/standard/expanded), visibility toggle, and collapse buttons with sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playUiClick()`).
- **Viewfinder Calibration Overlay (`ViewfinderOverlay.tsx`)**:
  - Modernized camera calibration grid with cyber reticles and chamfered corner brackets.

## [2.1.228] - 2026-08-15
### Added & Improved
- **Game Options & Settings Matrix (`GameOptionsMenu.tsx`)**:
  - Upgraded settings tabs (Game, Graphics, Audio, Controls, Interface, Gameplay) with cyber chamfered badges and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).
- **Operative Vitals & Stat Gauge HUD (`PlayerVitalsHud.tsx`)**:
  - Modernized operative avatar badge, segmented HP/MP/EXP gauges, and low-HP critical alert pulse state.

## [2.1.227] - 2026-08-15
### Added & Improved
- **Realm & World Select Gateway (`ServerSelect.tsx`)**:
  - Upgraded realm selector to cyber chamfered cards with real-time ping indicator, population capacity meters, and audio synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).
- **Touch Edition Mobile Game Launcher (`MobileGameLauncher.tsx`)**:
  - Modernized mobile touch entrance with operative status badge, landscape orientation advisory, fullscreen launch button, and WebAudio feedback.

## [2.1.226] - 2026-08-15
### Added & Improved
- **In-Game Comms & Transmissions Channel (`GameChat.tsx`)**:
  - Upgraded channel tabs (Local, Global, Party, Friends) to cyber chamfered badges with WebAudio sound synthesis on whispers, broadcasts, and channel selection (`soundSynth.playActionSound()`, `soundSynth.playSelectSound()`).
- **Game Login & Authentication Gateway (`GameLogin.tsx`)**:
  - Elevate game login with cyber chamfered glass card, subtle backdrop blur, and interactive sound synthesis.
- **Cinematic Title Screen & Credits Showcase (`GameTitleScreen.tsx`)**:
  - Elevate action buttons and credits showcase with chamfered geometry, responsive hover sweeps, and sound cues.

## [2.1.225] - 2026-08-15
### Added & Improved
- **Staff & Admin Floating Controller (`StaffFloatingMenu.tsx`)**:
  - Upgraded to modern `HudPanelShell` cyber layout with gold/amber staff badge, map broadcast announcements, nearby operative controls (Teleport, Kick, Inspect), and audio feedback.
- **Virtual Touch Controller & Action Pad (`MobileControls.tsx`)**:
  - Modernized static DPad, floating joystick, and tactile action cluster with chamfered cyber geometry and audio click synthesis (`soundSynth.playUiClick()`).
- **Cyber Toast Notification Stack (`GameToastStack.tsx`)**:
  - Upgraded in-game toast notifications to chamfered cyber pills with distinct status styling (Success/Emerald, Alert/Rose, Warning/Amber, Info/Cyan) and backdrop blur.

## [2.1.224] - 2026-08-15
### Added & Improved
- **Real-time Combat Action Hotbar (`Hotbar.tsx`)**:
  - Upgraded to modern `HudPanelShell` cyber slot layout with typing color themes (Damage, Heal, Buff, Utility).
  - Added smooth SVG cooldown sweeps, numeric countdowns, and WebAudio action synthesis (`soundSynth.playActionSound()`).
- **On-Screen Campaign Objective Tracker (`quest-tracker-overlay.tsx`)**:
  - Pinned cyber HUD objective card with multi-stage progress meters, checkmarks, sound-synthesized collapse/expand toggles.
- **Multiplayer Shard & Operative Presence HUD (`PeerPresenceHud.tsx`)**:
  - Real-time shard channel telemetry with low-latency live ping indicator and interactive nearby operative target chips.

## [2.1.223] - 2026-08-15
### Added & Improved
- **Community Achievements & Platform Badges (`achievements-overlay.tsx`)**:
  - Upgraded to modern `HudPanelShell` cyber layout with reward preview chips (+Coins & Platform XP) and WebAudio fanfare synthesis on claim.
- **27-Skill Progression Matrix (`skills-overlay.tsx`)**:
  - Elevated Skills Matrix to unified cyber HUD standard categorized into Combat, Gathering, Artisan, and Support with XP gauges, hover inspect tooltips, and total level telemetry.
- **Saints Dex & Animist Codex (`SaintsDexOverlay.tsx`)**:
  - Implemented elemental affinity filtering, discovered/undiscovered species states, and full combat stat inspect drawer with Pin-to-Profile and Feed Share triggers.

## [2.1.222] - 2026-08-15
### Added & Improved
- **Party & Co-Op Management Suite (`party-overlay.tsx`)**:
  - Upgraded to modern `HudPanelShell` cyber layout with Beast Squad companion switching and active creature summoning.
  - Added Co-Op Party roster, +25% Shared XP bonus badge, nearby operative quick invites, and WebAudio sound cues.
- **Campaign Quest Journal (`quest-log-overlay.tsx`)**:
  - Elevated Quest Log to unified cyber HUD standard with multi-stage objective trackers, reward summaries (XP & Credits), and tab sound synthesis.
- **Global Operative Leaderboards (`leaderboard-overlay.tsx`)**:
  - Implemented gold, silver, and bronze podium cards with user badge verification (Founder, VIP, Trusted) and live refresh triggers.

## [2.1.221] - 2026-08-15
### Added & Improved
- **Professor Oakwood's Research Sanctuary (`ProfessorLabOverlay.tsx`)**:
  - Upgraded starter companion showcase to modern cyber chamfered cards with elemental glowing borders.
  - Added base stat comparison meters (HP, Power, Defense, Tempo) and bonding audio synthesis (`soundSynth.playLevelUpSound()`).
- **Dynamic Overworld Target Frame (`target-frame.tsx`)**:
  - Integrated `HudPanelShell` with responsive styling and distinct cyber neon color themes for Players (cyan), Wild Monsters (magenta/rose), and NPCs (amber).
  - Added interactive quick-action buttons (Party Invite, Buddy Battle Duel Challenge, Whisper) with sound synthesis.
- **MiniMap Radar & Navigation Compass (`MiniMapRadar.tsx`)**:
  - Added cardinal direction markers (N, S, E, W) overlay on radar bezel and synthesized audio feedback on navigation actions.

## [2.1.220] - 2026-08-15
### Added & Improved
- **Village Merchant & Trade Post System (`shop-overlay.tsx`)**:
  - Replaced legacy yellow shop panels with modern cyber chamfered glass containers, inventory count chips, and real-time fund tracking.
  - Added synthesized audio feedback on purchasing, selling, and crafting (`soundSynth.playActionSound()`, `soundSynth.playSelectSound()`).
- **Equipment Paperdoll Matrix (`equipment-overlay.tsx`)**:
  - Implemented glowing chamfered gear pedestals with dedicated slot iconography (Helmet, Weapon, Armor, Off-Hand, Greaves).
  - Added live total combat stat cards (Attack Power, Defense Rating, Crit Chance, Speed Tier) and unequip sound cues.
- **Cinematic NPC Dialogue Engine (`dialog-overlay.tsx`)**:
  - Elevated the bottom-third dialogue modal to unified cyber HUD specifications with glowing NPC speaker pedestal and transmission badge.
  - Added typewriter sound effect ticks (`soundSynth.playUiClick()`) and keyboard choice indicators ([1-4], [SPACE], [ESC]).

## [2.1.219] - 2026-08-15
### Added & Improved
- **Base Sanctuary Automation & Facility Assignment (`base-overlay.tsx`)**:
  - Upgraded Base Sanctuary into modern chamfered cyber aesthetic with facility cards (Lumber Mill, Sanctuary Quarry, Smelting Furnace, Medicinal Herb Farm, Sanctuary Pier).
  - Added element affinity yield bonuses (Fire, Water, Grass, Ground, Metal, Wood) and companion assignment slot controls with audio synthesis (`soundSynth.playActionSound()`, `soundSynth.playSelectSound()`).
  - Added Live Sanctuary Telemetry viewport with animated roaming companions and custom pasture rendering.
- **Crafting Station & Recipe Forging (`crafting-overlay.tsx`)**:
  - Elevated Crafting Station to `HudPanelShell` chamfered HUD with trade skill filter tabs (All, Smithing, Crafting, Fletching, Alchemy).
  - Integrated real-time forging progression with periodic synthesized anvil clinks and level-up completion tones (`soundSynth.playMiningSound()`, `soundSynth.playLevelUpSound()`).
- **Grand Trade Center (GTC Marketplace & Player Exchange) (`gtc-overlay.tsx`)**:
  - Modernized GTC Marketplace with cyber chamfered styling, category chips, and live exchange tax calculator (5% fee preview).
  - Integrated synthesized audio feedback for browsing, purchasing, and listing items.

## [2.1.218] - 2026-08-15
### Added & Improved
- **Saints Buddy Battles Encounter UI & Type Badging (`TurnBattleOverlay.tsx`)**:
  - Elevated turn-based creature battle overlay to the unified cyber chamfered HUD standard (`HudPanelShell`).
  - Added elemental typing badges (Fire, Water, Grass, Electric, Ice, Ground, Wood, Metal) with color-coded power chips and icons.
  - Implemented creature binding crystal pulse animation with audio feedback (`soundSynth.playCrystalCapture()`).
  - Added full keyboard shortcut accessibility ([1] FIGHT, [2] BIND CRYSTAL, [3] SWITCH, [4] FLEE, [ESC] BACK).
- **Hero Battles Overworld ARPG Combat Feedback (`BabylonEngine.ts`, `GameCanvasBabylon.tsx`)**:
  - Implemented dynamic sprite hit-flash emissive color feedback on damaged monster meshes.
  - Formatted floating combat text with bold critical strike tags (`! 245 !`), miss notifications (`MISS`), and floating upward alpha fades.
  - Integrated combat sound synthesis (`soundSynth.playCombatHit()`, `soundSynth.playCriticalHit()`) into real-time attack results.
- **Audio Synthesizer Expansion (`sound-synth.ts`)**:
  - Added synthesized WebAudio sound generation for standard combat hits, critical strikes, and creature crystal capture pulses.

## [2.1.217] - 2026-08-15
### Added & Improved
- **Macro World Atlas & 4-Way Adjacency Transitions (`WorldAtlasPanel.tsx`, `route.ts`, `WorldSimulation.ts`)**:
  - Implemented automatic 4-way adjacent neighbor connection computation (`north`, `south`, `east`, `west`) in the World Builder Atlas canvas.
  - Added visual directional neighbor connection indicator pips (cyan bars) and adjacency status info bar.
  - Synchronized and persisted map boundary transitions to `gatesData` on each `WorldMap` record during Atlas save.
  - Verified and tested boundary edge warping in `WorldSimulation.ts` and `GameCanvasBabylon.tsx`.
- **Multiplayer Entity Replication Normalization (`protocol.go`, `manager.go`, `index.tsx`)**:
  - Normalized Go MMO `CreatureSpawn` JSON tags to symmetrically supply `entityId`, `templateId`, `spriteKey`, and `entityType`.
  - Normalized client-side entity event listeners (`creature_spawned`, `creature_despawned`, `creature_hp_update`) in `the-lobby/index.tsx` to accept both key variants seamlessly.
  - Eliminated conflicting subsystems and ensured Go MMO authority remains primary for live multiplayer entity streaming.
- **Unified Chamfered UIX Suite & SVG Iconography (`rpg-panel.tsx`, `SaintsDexOverlay.tsx`, `quest-log-overlay.tsx`, `leaderboard-overlay.tsx`, `achievements-overlay.tsx`, `skills-overlay.tsx`)**:
  - Re-architected `RpgPanel` to wrap `HudPanelShell` with chamfered cyber polygon borders, dark backdrop blur, and SVG iconography (`lucide-react`).
  - Standardized in-game feature modals to the unified design language.
- **Cinematic Character Select & Character Forge Flow (`character-selector.tsx`, `character-creator.tsx`, `GameTitleScreen.tsx`, `ServerSelect.tsx`)**:
  - Replaced basic selector cards with high-end Hero Pedestals featuring animated auras, level crests, stats summary (HP, pouch credits, class perk), and glowing "Enter Realm" triggers.
  - Elevated Character Creator into a PC MMO Character Forge with sound synthesis integration (`soundSynth.playActionSound()`, `soundSynth.playSelectSound()`), responsive layout, and archetype statistics.
  - Added interactive audio feedback and refined transitions on Title and Server Select screens.

## [2.1.216] - 2026-08-14
### Fixed & Improved
- **Menu Overlay Mounting & Gameplay HUD State (`index.tsx`, `Hotbar.tsx`, `quest-tracker-overlay.tsx`)**:
  - Fixed a critical bug where opening the Backpack (Inventory), Skills, Equipment, Quest Log, or GTC caused `LobbyHudDockLayout` to unmount because it was strictly gating on `gameMode === 'EXPLORING'`.
  - Expanded the HUD mount gate to all playable exploration states (`EXPLORING`, `INVENTORY`, `SKILLS`, `EQUIPMENT`, `QUESTS`, `GTC`, `DIALOG`), allowing the utility dock to open and switch tabs seamlessly.
  - Kept the action hotbar and quest tracker toast active during inventory/skill management.
- **Native Saints Gaming Layout Preset Names (`default-presets.ts`)**:
  - Replaced third-party game references with custom Saints Gaming preset identities: **Command Center (Default)**, **Sidebar Focus**, **Action Combat**, and **Minimalist**.
  - Maintained backward-compatible aliases and legacy preset ID resolution.

## [2.1.215] - 2026-08-14

### Added & Improved
- **Unified Chamfered HUD Visual System & Panel Consolidation (`HudPanelShell.tsx`, `MiniMapRadar.tsx`, `Hotbar.tsx`, `ClassicPanel.tsx`, `GameChat.tsx`, `quest-tracker-overlay.tsx`, `PlayerVitalsHud.tsx`, `index.tsx`)**:
  - **Unified Visual Language**: Built `HudPanelShell` with 8px chamfered corners (cut top-left & bottom-right), near-black 95% opacity teal-tinted fill, 1px consistent bright teal border at rest, and fluid 150-200ms ease transitions. Reserved neon accents for active and alert states only.
  - **Consolidated Top-Right Command Panel**: Merged the 5 separate floating elements (Options button, Studio button, Radar canvas, Location label, and Coordinates readout) into ONE structured chamfered panel with quick action header, canvas thumbnail, and location footer.
  - **Horizontal Bottom-Center Hotbar**: Converted vertical right-edge action strip into a horizontal 1-5 action bar anchored bottom-center with clear hotkey numbers, cooldown sweep overlays, and countdown timers.
  - **Dedicated Bottom-Right Utility Dock**: Sized the bottom-right dock strictly to its utility icons (Bag, Skills, Equipment, Quests, GTC), opening into an expanded chamfered tabbed panel in place.
  - **Integrated Staff Tag & Comms Panel**: Grouped the loose `[STAFF]` badge directly inside the `GameChat` header as an attached drawer, eliminating free-floating badges.
  - **Dismissible Quest Tracker Toast**: Converted the quest tracker into a collapsible chamfered toast anchored near the top-right command panel with a 1-click dismiss button and quick re-open pill.
  - **Single-Panel Player Vitals**: Merged camera/avatar plate, player name/level, and HP/MP/EXP stat bars into ONE grouped top-left panel with strict typographic hierarchy.

## [2.1.214] - 2026-08-14

### Added
- **Modular HUD Dock Zone Architecture (RuneScape 3 & WoW Edit Mode Style) (`dock-types.ts`, `default-presets.ts`, `DockZone.tsx`, `DockableWidget.tsx`, `LobbyHudDockLayout.tsx`, `UiEditToolbar.tsx`, `store.ts`, `index.tsx`)**:
  - Replaced unconstrained pixel dragging with a fixed 8-zone screen dock matrix (`top-left`, `top-center`, `top-right`, `mid-left`, `mid-right`, `bottom-left`, `bottom-center`, `bottom-right`) for resolution-independent HUD layouts.
  - Implemented 4 standard built-in layout presets: **Modern MMO (Default)**, **Classic RuneScape (Right Dock)**, **WoW Action Combat (Centered)**, and **Minimalist Streamer**.
  - Built a compact Base64 layout encoder/decoder codec (`SG-HUD:v1:...`) enabling 1-click preset exporting, importing, and instant sharing to the social feed.
  - Upgraded Viewfinder Edit Mode with live drop-zone highlights, widget size variant tokens (`compact`, `standard`, `expanded`), visibility toggles, and custom layout saving/deleting.
  - Unified lobby overlay mounting under `LobbyHudDockLayout` with full pointer-events canvas protection.

## [2.1.213] - 2026-08-14

### Fixed
- **Multiplayer Movement Input & Walkability Boundary Desynchronization (`manager.go`, `demo.go`, `handler.go`, `LobbySocketHandler.ts`, `GameCanvasBabylon.tsx`)**:
  - Fixed map grid boundary check in Go MMO `IsWalkable` and dynamic `JoinMap` registration so maps larger than 30x30 (such as the 64x64 `LOBBY` / `DEMO_SANDBOX` at `X 31, Y 32`) do not incorrectly drop player movement inputs as out-of-bounds wall collisions.
  - Implemented `LoadAllMaps` in Go MMO startup bootstrap to register all world definitions directly from SQLite `WorldMap`.
  - Added dual event synchronization (`input` + `player_move`) across both Go MMO and Next.js Socket fallback handlers for instantaneous cross-client position and direction replication.

## [2.1.212] - 2026-08-14
### Fixed
- **Multiplayer Movement & Walking Animation Synchronization (`BabylonEngine.ts`, `engine.go`)**: Restored smooth continuous position interpolation and walking animation cycling for online players, ensuring other players do not snap or appear frozen in place. Expanded Go MMO `EvPlayerMoved` broadcast directly to map instances.
- **Continuous Map Edge Transitions & Warp Gates (`GameCanvasBabylon.tsx`)**: Removed restrictive map-locking checks on edge connections (North, South, East, West) and warp gates, enabling seamless transition across world maps with normalized and clamped destination spawn coordinates.
- **Studio Warp Gate Placement Tool & Manager (`StudioPaintHud.tsx`, `WorldBuilderPanel.tsx`, `editor-store.ts`)**: Added dedicated `Gate` tool button (`DoorOpen` icon) in Studio quick tools and a comprehensive Warp Gates & Edge Connections manager in World Builder with 1-click tile placement, coordinate jumping, and gate editing.

## [2.1.211] - 2026-08-14
### Fixed
- **MMO Turn-Based Battle Payload Normalization (`index.tsx`)**: Normalized `battle_started` and `battle_update` socket payloads to ensure `TurnBattleOverlay` always receives valid creature instances (`wildCreature`, `playerCreature`), phase transitions, combat logging, and HP synchronizations across wild encounters, trainer battles, and player PvP duels.

## [2.1.210] - 2026-08-14
### Added
- **Go MMO Real-Time Party & PvP Challenge Synchronization (`handler.go`, `party.go`, `party_test.go`)**: Implemented full lifecycle multiplayer party invitations (`party_invite_send`, `EvPartyInvite`), acceptance (`party_invite_accept`), leaving (`party_leave`), and real-time PvP duel challenges (`battle_invite_send`, `accept_battle`) in the Go MMO backend with synchronized party toasts, member updates, and comprehensive test suite coverage.

## [2.1.209] - 2026-08-14
### Added
- **MMO Target Frame Direct PvP Duel Action (`target-frame.tsx`)**: Added interactive PvP Duel Challenge trigger to TargetFrame when targeting online players, allowing instant dispatch of `battle_invite_send` challenges.

## [2.1.208] - 2026-08-14
### Fixed
- **MMO 3D Player Mesh Target Resolution (`GameCanvasBabylon.tsx`)**: Fixed targeting when clicking other online tamers in the 3D viewport by stripping the internal `multiplayer_` mesh prefix, ensuring instantaneous target frame initialization and whisper/invite readiness.

## [2.1.207] - 2026-08-14
### Fixed
- **MMO Defeat Respawn Coordinates & Map Sync (`gameplay.go`, `index.tsx`)**: Aligned Go MMO `EvPlayerDefeated` payload with client expectation by sending `mapId`, `instanceId`, and spawn coordinates `(x, y)` on combat blackout. Hardened client handler with fallback bounds and default safe maps.

## [2.1.206] - 2026-08-14
### Added
- **MMO Real-Time Multiplayer PvP & Monster Combat Calculations (`combat.ts`, `combat.test.ts`)**: Added `calculateCombatHitDamage` featuring critical strikes, diminishing mitigation curves, damage variance, and full dynamic equipment scanning.

## [2.1.205] - 2026-08-14
### Added
- **MMO Minimap Radar Co-Op Party Highlighting (`MiniMapRadar.tsx`)**: Added distinctive cyan double-ring highlights for party teammates on the radar screen and resolved active Studio map names during map editing/playtest sessions.

## [2.1.204] - 2026-08-14
### Added
- **MMO Multi-Entity Target Picking & Resolution (`GameCanvasBabylon.tsx`)**: Unified target identification across `creature_`, `mob_`, `wild_`, and online multiplayer peer sockets, providing accurate HP initialization and behavior states on mesh click.

## [2.1.203] - 2026-08-14
### Added
- **MMO Game Options Graphics, Audio & Gameplay Expansion (`GameOptionsMenu.tsx`)**: Replaced placeholder panels with interactive settings for Master/SFX/Music volume sliders, Mute toggle, Graphics Quality presets, Framerate targeting, Damage numbers, and Multiplayer shard player visibility settings.

## [2.1.202] - 2026-08-14
### Added
- **MMO Peer Presence Targeting & Quick Action Bar (`PeerPresenceHud.tsx`, `target-frame.tsx`)**: Made peer presence hud tamer name tags interactive to rapidly target nearby players, integrated ping latency metrics, and equipped `TargetFrame` with one-click party invite and whisper triggers when targeting players.

## [2.1.201] - 2026-08-14
### Added
- **MMO Game Chat Slash Commands & Teleportation (`GameChat.tsx`)**: Expanded game chat command processing to include `/invite [player]`, `/p invite`, `/help`, `/commands`, and `/tp [player]` moderator navigation directly within the chat console.

## [2.1.200] - 2026-08-14
### Added
- **MMO Staff Floating Menu Multiplayer Teleportation (`StaffFloatingMenu.tsx`)**: Added `tpToPlayer` capability and navigation icons allowing staff/moderators/developers to instantly teleport directly to visible tamers across active map instances.

## [2.1.199] - 2026-08-14
### Added
- **MMO Target Frame Classification & Party Co-Op Enhancements (`target-frame.tsx`, `party-overlay.tsx`)**: Added entity classification badges (`PLAYER`, `WILD`, `NPC`) and target dismiss button to `TargetFrame`. Enhanced `PartyOverlay` with live backend socket invitation dispatch (`party_invite_send`), quick nearby peer invite chips, and clean party leave workflows.

## [2.1.198] - 2026-08-14
### Added
- **Studio Entity & NPC Mutex Dirty State Sync (`EntityEditorPanel.tsx`)**: Synchronized `markMapDirty()` across NPC updates, level placements, and deletions, guaranteeing consistent state tracking between the UI dock and persistent world documents.

## [2.1.197] - 2026-08-14
### Added
- **Studio World Atlas Dirty State Sync (`WorldAtlasPanel.tsx`)**: Integrated `markMapDirty()` and `clearMapDirty()` across macro grid placement, spawn hub assignment, node deletion, and atlas save workflows.

## [2.1.196] - 2026-08-14
### Added
- **Studio Tile Layer Addition Dirty State Sync (`WorldBuilderPanel.tsx`)**: Wired `markMapDirty()` to `handleAddLayer`, ensuring that adding a new visual/logic tile layer marks the workspace dirty and lights up the save indicators.

## [2.1.195] - 2026-08-14
### Added
- **MMO Grand Trade Center (GTC) Reliability & Empty State Validation (`gtc-overlay.tsx`)**: Added manual market listing refresh polling via `RefreshCw`, reactive inventory item auto-selection for trade listings, empty backpack validation notices, and informative confirmation toasts on trade post.

## [2.1.194] - 2026-08-14
### Added
- **MMO Quest Journal & Objectives Presentation (`quest-log-overlay.tsx`)**: Upgraded Quest Log Overlay to support custom campaign tasks and dynamic Studio quests without omission, rendering granular objective checkpoints with target counters and flexible rewards calculation.

## [2.1.193] - 2026-08-14
### Added
- **Studio Map Diagnostics & Spawner Validator (`StudioProblemsPanel.tsx`)**: Extended map problem scanning to include encounter & monster spawner collision checks (flagging solid tile overlap and out-of-bounds placements), styled `SPAWN` badge category tags, and introduced a manual "Scan Map" button with animation state.

## [2.1.192] - 2026-08-14
### Added
- **Studio Monster Spawner Dirty State Sync (`MonsterSpawnerPanel.tsx`)**: Integrated mapDirty synchronization on spawner placement, mutation, and deletion, ensuring the editor workspace and global level persistence pipeline reflect pending encounter changes.

## [2.1.191] - 2026-08-14
### Added
- **MMO Hotbar Consumable & Potion Action Pipeline (`hotbar.tsx`)**: Wired slot action handling for item slots (slot 5), automatically scanning player inventory for usable potions/consumables, applying health modifications, consuming inventory units, and initiating item cooldowns.

## [2.1.190] - 2026-08-14
### Fixed
- **MMO Skills Overlay Tooltip Clipping (`skills-overlay.tsx`)**: Removed parent overflow clipping and attached `pointer-events-none` on hover tooltips, allowing skill XP breakdown cards to cleanly display level curves without border clipping.

## [2.1.189] - 2026-08-14
### Fixed
- **MMO Inventory Equip/Unequip Toggle Reliability (`inventory-overlay.tsx`)**: Fixed equipment action handling so inspecting an already equipped item correctly issues slot unequip rather than redundant re-equips.

## [2.1.188] - 2026-08-14
### Added
- **Studio Quick Dock Panel Complete Matrix (`StudioEditorShell.tsx`)**: Added dedicated `spawner` (Monster Spawner) and `problems` (Map Diagnostics) dock buttons to the bottom Studio launch strip, with intelligent left/right dock column target routing.

## [2.1.187] - 2026-08-14
### Added
- **Studio Status Bar Save Dispatch (`StudioStatusBar.tsx`)**: Bound the bottom status bar Save action directly to `STUDIO_TRIGGER_SAVE_MAP_EVENT`, enabling one-click map saves and Go MMO live reloading from the status bar.

## [2.1.186] - 2026-08-14
### Added
- **Dynamic Touch/Mobile Viewport Lifecycle (`MobileControls.tsx`)**: Added window resize listeners to `isTouchDevice` detection, ensuring mobile controls and floating joystick overlays reactively mount/unmount across viewport transitions without page reload.

## [2.1.185] - 2026-08-14
### Added
- **Studio Drag-and-Drop Palette Tile Painting (`TilesetPicker.tsx`, `GameCanvasBabylon.tsx`)**: Made tileset picker sheets draggable with `STUDIO_TILE_DROP` payloads, allowing creators to drag specific tiles from the palette directly onto 2.5D map coordinates to paint terrain seamlessly.

## [2.1.184] - 2026-08-14
### Added
- **Studio Drag-and-Drop Viewport Sprite Placement (`SpriteBrowser.tsx`, `GameCanvasBabylon.tsx`, `BabylonEngine.ts`)**: Made sprite browser thumbnails draggable with structured metadata payloads, projection coordinates via `pickTileAtScreenCoord`, and canvas drop listeners targeting live map coordinates.

## [2.1.183] - 2026-08-14
### Added
- **NPC Dialogue Portrait Visualizer (`dialog-overlay.tsx`)**: Replaced generic placeholder icons with dynamically resolved NPC pixelated sprite portraits extracted from active dialog metadata and live map entities.

## [2.1.182] - 2026-08-14
### Added
- **Resilient Map Diagnostics & Ground Zero Detection (`StudioProblemsPanel.tsx`)**: Replaced raw gates array assumption with `normalizeGatesToArray` for robust array/record payload validation. Added automated warnings for uninitialized Ground tile layers filled with all zero tiles.

## [2.1.181] - 2026-08-14
### Added
- **Starter Hero Configured Starting Inventory Integration (`character-creator.tsx`)**: The character creation pipeline now merges custom starting inventory payloads defined on Starter Hero records into new MMO player state profiles upon creation.

## [2.1.180] - 2026-08-14
### Added
- **Global Map Save Event Dispatch (`studioEvents.ts`, `StudioEditorShell.tsx`, `WorldBuilderPanel.tsx`, `StudioMenuBar.tsx`)**: Wired `STUDIO_TRIGGER_SAVE_MAP_EVENT` globally to `Ctrl+S` shortcuts and top menu actions, ensuring level edits are persistently synced to the Go MMO backend from any active Studio dock.

## [2.1.179] - 2026-08-14
### Added
- **Real-Time Tileset Sheet Hover Previews (`TilesetPicker.tsx`)**: Hovering tiles across the tileset palette now draws a live highlight rectangle and displays the computed tile GID before clicking, providing precise visual feedback during level design.

## [2.1.178] - 2026-08-14
### Added
- **Global Studio Sprite Picker Dispatch (`EntityEditorPanel.tsx`, `StarterHeroEditorPanel.tsx`)**: Wired `studio_sprite_picked` event listeners to Entity Editor and Starter Hero Editor panels, enabling one-click sprite assignment directly from Sprite Browser into active entity or hero forms.

## [2.1.177] - 2026-08-14
### Added
- **Macro Atlas Interactive Context Toolbar (`WorldAtlasPanel.tsx`)**: Selected atlas nodes now present an in-place action bar with `Open in Viewport`, `Set as Spawn Hub`, and safe node deletion. Added double-click to immediately warp to any placed map.

## [2.1.176] - 2026-08-14
### Fixed
- **Full-Screen Viewport Edge-to-Edge (`app/(main)/lobby/page.tsx`, `app/(main)/studio/page.tsx`)**: Upgraded Lobby and Studio viewport containers to `fixed inset-0 w-screen h-screen z-50`, eliminating empty bottom space, navbar padding offsets, and parent layout constraints for an immersive desktop MMO presentation.
- **World Atlas Bi-Directional Synchronization (`app/api/world/atlas/route.ts`)**: Enhanced World Atlas GET/POST handlers to prioritize newest saved layouts across `WorldAtlas` table and `SiteSetting` storage with dev-mode creator persistence.

## [2.1.175] - 2026-08-14
### Changed
- **WebGL Chunk Mesh Initialization (`BabylonEngine.ts`)**: Cleaned up empty array vertex buffer initialization on chunk mesh creation to eliminate Babylon.js 9+ console vertex warnings.

## [2.1.174] - 2026-08-13
### Fixed
- **World Atlas Persistence Fallback (`app/api/world/atlas/route.ts`, `WorldAtlasPanel.tsx`)**: Hardened World Atlas endpoints against un-migrated tables with automatic `SiteSetting` key-value mirror fallback, preventing 500 errors on remote production hosts.

## [2.1.173] - 2026-08-13
### Added
- **Diagnostic Navigation Jump (`GameCanvasBabylon.tsx`, `StudioProblemsPanel.tsx`)**: Wired `studio_center_camera` event handling to `panEditorCameraToTile`, allowing one-click spatial teleportation to problem coordinates directly from the Diagnostics & Problems panel.

## [2.1.172] - 2026-08-13
### Added
- **NPC & Entity Inspection in Inspector (`PropertiesPanel.tsx`)**: Clicking any tile in Studio Viewport now displays comprehensive metadata for all entities located at that coordinate, including NPC name, sprite, dialog binding, logic triggers, and warp gates.

## [2.1.171] - 2026-08-13
### Changed
- **Studio Command Center Header (`StudioMenuBar.tsx`)**: Transformed Studio top bar into a 3-zone command center with active map indicator, unsaved dirty state, prominent Mode Transition Switcher (`[ ✏️ EDIT ]` ⇄ `[ ▶ PLAY TEST ]`), and quick global actions.
- **Dock & Window Manager Resiliency (`StudioEditorShell.tsx`, `editor-store.ts`)**: Fixed closed window reopen bug by wiring dynamic `studio_open_dock` event dispatching and FlexLayout tab node selection.
- **World Atlas Flexbox Layout (`WorldAtlasPanel.tsx`)**: Expanded World Atlas panel into a full-height, responsive dock layout with zero dead space and responsive map palette.
- **Deterministic Studio Test Character (`index.tsx`)**: Hydrates a dedicated `Dev Explorer` test character (Lv 50, full stats) upon entering Playtest mode without requiring character selection.

## [2.1.170] - 2026-08-13
### Added
- **Skills Overlay Polish & Progress Bars (`skills-overlay.tsx`)**: Added Total Level and Total XP summary strip at the top of the skills panel, along with gold progress bars indicating percentage to next level under each skill tile.

## [2.1.169] - 2026-08-13
### Added
- **NPC Dialogue Full Keyboard Integration (`dialog-overlay.tsx`)**: Added keyboard controls to dialogue interaction (`Space`, `Enter`, `E` to skip typewriter or advance, `Escape` to close, and numeric keys `1-9` with visual `[N]` badges to select branch options).

## [2.1.168] - 2026-08-13
### Fixed
- **Multiplayer Socket Automatic Fallback (`index.tsx`)**: Added intelligent connection fallback when the remote Go MMO backend encounters CORS errors or 502 Bad Gateway responses, automatically connecting directly to the same-origin Next.js / Socket.io server without client freeze.
- **Studio Asset Omnisearch (`StudioOmnisearch.tsx`)**: Fixed Studio search opening website forum threads by migrating the search engine to index game maps, items, creatures, quests, logic tags, and editor actions.
- **World Atlas Persistence API (`app/api/world/atlas/route.ts`)**: Implemented the missing `/api/world/atlas` GET & POST endpoints to load and save macro connected map layouts to Prisma `WorldAtlas`.

## [2.1.167] - 2026-08-13
### Added
- **Turn-Based Battle Keyboard Controls (`TurnBattleOverlay.tsx`)**: Added keyboard shortcuts for creature battle actions (`1` for Fight / Ability 1, `2` for Expose Film / Item, `3` for Switch Creatures, `4` for Run / Flee, and `Escape` for Back).

## [2.1.166] - 2026-08-13
### Added
- **Studio Pro Hotkeys & Quick Docks (`StudioEditorShell.tsx`)**: Wired `Ctrl+Shift+P` for World Atlas, `Ctrl+Shift+O` for Map Diagnostics & Problems, and `Ctrl+Shift+D` for Dev Tools directly into the key event dispatcher.

## [2.1.165] - 2026-08-13
### Added
- **Modal Key Toggling & Escape Target Deselection (`index.tsx`)**: Upgraded global keyboard shortcuts so Inventory (`I`), Skills (`K`), Party (`P`), Dex (`X`), and Achievements (`B`) can be toggled on/off with the same key, and pressing `Escape` intuitively deselects active combat targets before opening the options menu.

## [2.1.164] - 2026-08-13
### Added
- **Studio Quick Map Switcher in Omnisearch (`StudioOmnisearch.tsx`)**: Integrated all registered world maps directly into the Ctrl+K search index with real-time tileset hydration and instant zero-reload map warping.
- **Wired Studio Top Menu Actions (`StudioMenuBar.tsx`)**: Enabled File -> New Map, Open Map / Quick Search (Ctrl+K), and Map Diagnostics & Problems actions.
- **Combat Hotbar Cooldown Countdown & Individual Timers (`Hotbar.tsx`)**: Added independent ability cooldown timers from `cooldowns` store with numeric second countdown displays and dark vertical sweep animations.

## [2.1.163] - 2026-08-13
### Added
- **Studio Problems & Validation Panel (`StudioProblemsPanel.tsx`)**: Created live map diagnostics dock (Bible 30 §8) checking gate target destinations, entity-solid tile collision intersections, map dimension bounds, and layer health, complete with 1-click camera coordinate navigation (`[Y, X]`).
- **28-Slot RuneScape-Style Inventory (`inventory-overlay.tsx`)**: Redesigned player inventory into a standard 4x7 grid with recessed empty slots, item rarity border glows (Common, Uncommon, Rare, Epic, Legendary), item abbreviations (`10k`, `1M`), and full action toolbars (Equip, Use, Drop).
- **Live Minimap Radar Active Map Fallback (`MiniMapRadar.tsx`)**: Wired `activeMapData` store fallback into the radar drawing loop so dynamically created or edited Studio maps render real-time geometry accurately.

## [2.1.162] - 2026-08-13
### Added
- **Centralized Realtime Protocol Specification (`src/shared/net/protocol.ts`)**: Established single source of truth for protocol versioning (`2.1.0`), typed command/event contracts, reliability tiers (`CRITICAL`, `STATE`, `TRANSIENT`, `CHAT`, `PRESENCE`), and payload interfaces for lobby multiplayer and Studio collaboration.
- **Modular Realtime Server Services**: Extracted business logic from network transport into dedicated services (`SessionManager.ts`, `ShardManager.ts`, `StudioCollaborationService.ts`, `ChatService.ts`) with `LobbySocketHandler.ts` acting as the authoritative dispatcher.
- **Automated Vitest Realtime Regression Suite (`src/server/net/LobbySocketHandler.test.ts`)**: Added 9 comprehensive integration and unit tests covering 1-account-1-seat eviction, dynamic shard instance routing, peer replication, position syncing, chat rate limits, Studio soft locks, revision increments, and disconnect lifecycle.
- **Realtime Connection Health & Diagnostics**: Integrated live realtime connection badges (`Online`, `Connecting`, `Reconnecting`, `Offline`), RTT latency measurement via ping/pong, active shard readouts, and connected peer counts into `StudioStatusBar.tsx` and `PeerPresenceHud.tsx`.
- **Direct Whisper & Social Chat Improvements**: Added `/w [player]` and `/whisper [player]` commands, clickable player names in chat to auto-target whispers, and distinct magenta formatting for private transmissions.

## [2.1.161] - 2026-08-13
### Fixed
- **Multiplayer Shard & Player Replication Restore**: Restored authoritative Socket.IO lobby and Studio handler (`LobbySocketHandler.ts`) in `server.ts` to manage shard assignments (`join_map`), player visibility (`map_players`, `player_joined`, `player_left`), movement synchronization (`move`, `player_moved`, `move_ack`), and Studio collaboration soft locks.
- **In-Game Chat Box & Transmission Sync**: Resolved in-game chat broadcasts for Local (`player_chat`), Global (`global_chat_msg`), Party (`party_chat_msg`), and Staff Announcements (`staff_announce`).
- **Global Enter Key Chat Focus & Escape Handling**: Added global keyboard event listening in `GameChat.tsx` so pressing `Enter` during exploration automatically expands the comms link and focuses the transmission input for instant typing, and `Escape` blurs and collapses it.

## [2.1.160] - 2026-08-13
### Added
- **Interactive Tool Modes in Studio Paint HUD**: Added quick-switch buttons for Paint (`Brush`), Erase (`Eraser`), Eyedropper / Sample (`Pipette`), Pan (`Hand`), Box Select (`SquareDashed`), and Prefab Stamp (`Box`).
- **Undo / Redo Quick Triggers & Menu Integration**: Integrated undo/redo buttons in `StudioPaintHud`, fully wired `Edit -> Undo` and `Edit -> Redo` in `StudioMenuBar`, and unified keyboard shortcuts with automatic remesh event dispatching.
- **Enhanced Camera View Controls**: Added Zoom In / Out / Fit Map (`Home`) controls in `StudioPaintHud`, `StudioMenuBar`, and mouse wheel / drag zooming.
- **3D In-World Hover Reticle**: Babylon engine now renders crisp 3D tile reticle indicators on hover for 1x1 brushes as well as multi-cell radius previews with proper height offsetting to eliminate Z-fighting.
- **Dynamic Cursor & Mouse Pan Navigation**: Added smooth MMB (middle mouse button), RMB (right mouse button), Spacebar+drag, and Pan tool dragging with dynamic cursor states (`cursor-grab`, `cursor-grabbing`, `cursor-crosshair`).
- **Tile Deduplication in Paint Strokes**: Added `deduplicatePaintedCells` to merge redundant writes during drag painting so single-click and drag undo operations cleanly restore historical state without data corruption.

## [2.1.159] - 2026-08-13
### Removed
- **TS GameEngine fully removed** — deleted `GameEngine.ts`, `SocketHandler.ts`, `PlayerManager.ts`, `WorldManager.ts`, `InventoryManager.ts`, `CombatManager.ts`, `EncounterManager.ts`, `DialogueManager.ts`, `CraftingManager.ts`, `CreatureManager.ts`, `QuestManager.ts`, `PartyManager.ts`, `GuildManager.ts`, `ShopManager.ts`, `SkillManager.ts`, `EconomyManager.ts`, `PersistenceManager.ts`, `BaseManager.ts`, `AchievementListener.ts`, `StatsListener.ts`, and associated tests. Go MMO is now the sole real-time game backend.
- Removed `SaintsHudOrbs.tsx` (replaced by `PlayerVitalsHud.tsx`).
- Removed `NpcEditorPanel.tsx` (replaced by `EntityEditorPanel.tsx`).

### Added
- **Studio Editor expansion**: `EntityEditorPanel`, `WorldAtlasPanel`, `CatalogEditorShell`, `StudioMenuBar`, `StudioStatusBar`, `StudioFavoritesStrip`, `StudioOmnisearch`, `useStudioBookmarks` hook.
- **World Atlas API** (`app/api/world/atlas/`) for world map data.
- **PlayerVitalsHud** — new split HP/MP/XP vitals display replacing the monolithic `SaintsHudOrbs`.
- **GamePanelShell** (hud variant) — shared dark-glass panel wrapper for lobby HUD elements.
- New `MapPrefab` support in `app/actions/prefabs.ts` and Prisma schema additions.
- Expanded `demoMapSeed.ts` and `DemoBootstrap.ts` for richer demo content.
- Logic tag additions in `LogicTagPalette.tsx`.

### Changed
- `server.ts` slimmed to Go-only path — Socket.io kept for forum `RealtimeProvider` only.
- `WorldBuilderPanel` significantly expanded (+237 lines) with atlas and prefab workflows.
- `ItemEditorPanel` and `LootManagerPanel` fully restyled with dark-glass/neon aesthetics.
- `DialogueEditorPanel`, `MonsterSpawnerPanel`, `PropertiesPanel`, `QuestEditorPanel`, `PrefabBuilderPanel` updated for new editor store shape.
- `StudioEditorShell` refactored for new menu bar / status bar / omnisearch architecture.
- `editor-store.ts` expanded with new Studio modes, bookmarks, and catalog state.
- `studioModes.ts`, `studioPermissions.ts`, `studioMapCreate.ts` updated for new Studio capabilities.
- Lobby HUD restyled: `Hotbar`, `ClassicPanel`, `DraggablePanel`, `PeerPresenceHud`, `FloatingHealthBar`, `GameChat`, `TurnBattleOverlay`, `GameOptionsMenu`, `inventory-overlay`, `party-overlay`, `quest-tracker-overlay`, `target-frame`, `GamePanelShell`.
- Go MMO protocol and gameplay handler updates for map sync.
- `goMmoSocket.ts` updated for new protocol shape.
- `BabylonEngine.ts` and `WorldSimulation.ts` refined rendering and simulation logic.

### Fixed
- `starter-heroes.ts` data corrections.
- Map slug route handling improvements.

## [2.1.158-5] - 2026-08-12
### Added
- Toast Queue Stack (`GameToastStack.tsx`) for queuing UI notifications instead of immediately overwriting.
- Slim Game Chat mode with translucent mask and expand/collapse logic for the primary chat interface.

### Changed
- Updated `MiniMapRadar.tsx` sizing and applied neon borders to fit the cyber/Miami aesthetic.
- Restyled `crafting-overlay`, `equipment-overlay`, `quest-tracker-overlay`, and `PeerPresenceHud` using `GamePanelShell` and dark-glass/neon aesthetics.

### Fixed
- Fixed trailing TS syntax errors in `GameChat.tsx` and `SaintsHudOrbs.tsx`.

## [2.1.158-4] - 2026-08-09
### Fixed
- Fixed Studio Viewport occlusion where the FlexLayout DOM container rendered a solid background and intercepted pointer events over the underlying WebGL canvas.

### Changed
- Development knowledge base (`info/`, developer `docs/`, agent `logs/*.md`) moved to local-only `.docs/` (gitignored). Public repo keeps README, CHANGELOG, and `docs/TUXEMON_ATTRIBUTION.md`.

## [2.1.158-3] - 2026-08-09
### Fixed
- Fixed unlit sprites and tiles rendering pitch black by explicitly setting their `emissiveColor` to white when `disableLighting` is true.
- Fixed Studio view failing to render entirely by resolving a React `ReferenceError` during hydration and ensuring empty map shells correctly accept the fetched DB document.

## [2.1.158-2] - 2026-08-09
### Fixed
- Fixed Studio hydration regression where the map document would fail to render after fetching because the engine effect did not watch the `mapData` object correctly.
- Re-established pixel-art 'Unlit' material consistency across all terrain, players, NPCs, projectiles, and damage texts to fix shading imbalances.

## [2.1.158-1] - 2026-08-09
### Fixed
- Fixed pitch black Studio viewport map tiles by changing tileset triangle index winding order to clockwise so normals correctly point upwards and receive scene lighting.
- Removed conflicting disableLighting and receiveShadows flags that caused silent shader compilation failures on WebGL2 tileset materials.

## [2.1.144] - 2026-08-08
- `.docs/` added to `.gitignore`.
- Studio Upgrades: Advanced logic painting undo batching.
- Studio Upgrades: Monster Spawner UI enhancements and visual overlays.
- Performance: Large Map mesh chunking (32x32 tiles) implemented for buttery smooth rendering and editing.

## [2.1.143] - 2026-08-08
### Fixed
- Fixed `/api/admin/system/update` endpoint to look for update scripts inside the `scripts/` directory.
- Created `scripts/update.bat` to support automated Git pulling and updating on Windows environments.

## [2.1.142] - 2026-08-08
### Fixed
- Fixed Studio tile picking precision by bypassing batched visual tile meshes and raycasting directly against a mathematical `Z=0.001` ground plane.
- Fixed inability to navigate large maps in Studio mode by properly mounting and unmounting the WASD/Arrow key `startEditorKeyboardPan` loop.

## [2.1.141] - 2026-08-08
### Added
- Added Database Setup for `MapPrefab` in `schema.prisma`.
- Created `PrefabBuilderPanel` for the Studio to manage map prefabs.
- Added `setSelectionPreview` in `BabylonEngine` to render multi-tile bounding boxes on the map.
- Implemented Prefab ghosting and preview overlay rendering based on bounding size.
- Implemented `pastePrefab` stamping algorithm to inject multi-tile visual data and logic tags seamlessly onto the map grid.
- Implemented `brushMode` system ('paint', 'select', 'prefab') to `editor-store.ts`.

## [2.1.140] - 2026-08-08
### Added
- Added `monster_spawner` to `LogicComponentKind` to support placing spawners via Studio mode.
- Created `MonsterSpawnerPanel` for managing wild spawners, wander radius, population density, and level in Real World maps.
- Implemented adjustable logic paint brush radius via the new size stepper in `StudioPaintHud`.
- Added support for enum fields in `PropertiesPanel` to configure new spawner types and attributes.
- Wired spawner extraction directly into `WorldManager.ts`, placing dynamic monsters onto the grid upon map initialization.
- Refactored `GameCanvasBabylon.ts` tile picking raycasts to paint across the entire brush radius.
- Standardized game terminology in AGENTS.md (Saints Buddy Battles, Hero Battles, Player Battles).

## [2.1.139] - 2026-08-08
### Added
- Expanded `WorldMap` model in `schema.prisma` with rich metadata fields (`musicTrack`, `weatherType`, `recommendedLevel`, `lightingPreset`, `biome`, `description`, `entryRequirements`).
- Added map grid builders for `TRAINING_GROUNDS` and `CRYSTAL_CAVERNS` in `demoMapSeed.ts` and automated DB seeding in `DemoBootstrap.ts`.

## [2.1.136] - 2026-08-07
### Added
- Created data-driven expansion quest definitions (`src/server/expansionQuests.ts`) including Q005 ("Soul Binding") and Q006 ("Market Forces").
- Registered expansion quest seeding in `DemoBootstrap.ts`.

## [2.1.135] - 2026-08-07
### Added
- Added `PlayerStats` aggregate model to `schema.prisma` with indexed O(1) leaderboard columns.
- Created `StatsListener` (`src/server/StatsListener.ts`) updating `PlayerStats` via `GameEventBus` triggers.
- Created `GET /api/leaderboards/game` endpoint supporting creatures, quests, crafts, combat, and wealth boards.

## [2.1.134] - 2026-08-07
### Added
- Added `AchievementListener` (`src/server/AchievementListener.ts`) subscribing to `GameEventBus` topics for decoupled achievement awards.
- Added 7 new game achievement definitions to `achievements-catalog.ts` and automated evaluation in `achievements.ts`.

## [2.1.133] - 2026-08-07
### Removed
- Safely deleted 5 verified orphan files: `WorldMapNavigator.tsx`, `rpg-stats-overlay.tsx`, `generated-assets.ts`, `dpad.tsx`, and `demoQuests.ts`.

## [2.1.132] - 2026-08-07
### Changed
- Replaced legacy `src/engine/map-loader.js` with modular TS map architecture: `src/shared/game/types/map.ts` (DTOs), `mapLoader.ts` (persistence), `mapCache.ts` (cache & invalidation), and `mapQueries.ts` (isWalkable & tile queries).
- Updated `WorldManager`, `InventoryManager`, and `DemoBootstrap` to consume the unified map system.

## [2.1.131] - 2026-08-07
### Added
- Created isomorphic `GameEventBus` (`src/shared/events/gameEventBus.ts`) with typed event bus schemas and unit tests.
- Wired event emitters across `EncounterManager`, `CraftingManager`, `InventoryManager`, `QuestManager`, `EconomyManager`, `PartyManager`, and `DialogueManager`.

## [2.1.130] - 2026-08-07
### Added
- Added `InventoryTransaction`, `InventoryReason`, `executeTransaction()`, `repairItemDurability()`, and `InventoryLog` model to `inventoryService.ts` and `schema.prisma`.
### Fixed
- Replaced raw `playerInventoryItem.update()` in `InventoryManager.ts` with `repairItemDurability()`.
- Removed dead `addCredits` / `removeCredits` stubs from `PlayerManager.ts`.

## [2.1.129] - 2026-08-07
### Fixed
- Updated `app/api/game/server-status/route.ts` probes to respect `GO_MMO_INTERNAL_URL` / `NEXT_PUBLIC_GO_MMO_URL` when present instead of querying legacy hardcoded 3001 ports.
- Removed unused `renderHealthBar` canvas method in `BabylonEngine.ts`.

## [2.1.128] - 2026-08-07
### Added
- Created `info/game/SUBSYSTEM_OWNERSHIP.md` establishing Phase 0 subsystem boundaries and architectural isolation rules.

## [2.1.127] - 2026-08-06
### Fixed
- Fixed Socket.io CORS origin handling (Access-Control-Allow-Origin) when withCredentials is enabled, resolving socket connection blocks when requests cross domains/subdomains (e.g. saintsgaming.net -> online.saintsgaming.net).
- Fixed /api/maps/DEMO_SANDBOX 404 error when DB foundation seed is unpopulated; ensured seedDemoMap is always executed in ensureStudioMapFoundation even if logic tile seed is skipped.

## [2.1.126] - 2026-08-06
### Fixed
- Fixed Next.js App Router aggressively caching API responses for /api/maps and /api/maps/[slug], which caused stale map data (with empty NPCs arrays) to be served to the client and broke entity rendering.

## [2.1.125] - 2026-08-06
### Fixed
- Fixed Socket.io authentication fallback to support NextAuth secure cookies in local development environments with HTTPS (NEXT_PUBLIC_SITE_URL=https://localhost). This resolves the issue where players and entities failed to load due to a rejected socket connection.
- Updated update.sh to extract the MARIADB_ROOT_PASSWORD from the Docker container environment when auto-fixing credentials, preventing setup failures when the root password differs from the database user password.

## [2.1.122] - 2026-08-06
- Implemented Phase 4 Turn-Based Engine Math (ARPG formulas, STAB, Element matches)
- Updated TurnBattleOverlay to render a 2x2 grid of creature abilities

## [2.1.121] - 2026-08-06

### Added
- **Phase 3 Item Creator Dock**: Implemented the UI and backend logic for the Item Creator panel in the Studio.
  - Features a searchable sidebar and dynamic form to edit item properties (`ItemTemplate`).
  - Added a read-only Dependency Viewer that scans `LootTable` and `CraftingRecipe` entries to show where items are used.
  - Successfully integrated the dock into the `StudioEditorShell` under "Catalog Mode".

## [2.1.120] - 2026-08-06

### Added
- **Hybrid Go MMO**: Fully wired Go MMO backend for real-time game simulation.
- **Persistence**: Player position, inventory, quests, and skill XP are now natively persisted in the SQLite DB via Go MMO.
- **Map Synchronization**: Next.js automatically notifies Go MMO (`notifyGoMapSynced`) whenever a map is saved in Studio.
- **Incremental Rendering**: Babylon game client now processes `map_reloaded` events incrementally to avoid wiping player peers and meshes on map updates.
- **Combat Formulas**: Brought turn-based combat and skill grants into alignment with the gameplay bible on the Go MMO side.

## [2.1.119] - 2026-08-02

### Fixed
- **tile_changed** updates map cache, canvas grid, and Babylon props (Q4 bramble clear walks/looks clear).
- **creature_moved** client listener so Rockitten RT positions stay in sync.
- Lobby character load forces **DEMO_SANDBOX** when saved map is not playable; awaits `loadMap` before join.
- Duplicate Professor Lab overlay removed; claim hydrates `creatureParty` and waits for `starter_claimed`.
- Vance **Report progress** is state-aware; Q1 gather order hints when mining before wood.

### Added
- Visible shop stall + bramble thicket meshes; logic-tile ground color for tile 11.

## [2.1.118] - 2026-08-02

### Added
- **DEMO_SANDBOX canonical seed** on boot (`demoMapSeed`): walkable plaza, tall grass (2), trees/ore (5/6), shop (7), craft (9), bramble (11).
- Formal **Q1–Q4** QuestTemplates (`demoQuests`) with event hooks: GATHER / CRAFT / CLAIM / CLEAR / TALK.
- **CLEAR_BRAMBLE** interact (axe + party companion); live tile clear + `tile_changed`.
- Quest tracker empty-state guide (“Talk to Warden Vance”); creature snapshot on `map_joined`.

### Fixed
- Logic-tile API/store contract (keyed `data`); map-loader DEMO fallback no longer paints solid walls as ground.
- Gather: `RESOURCE_NODE_MAP` 5/6, `getMapDataSync`, instance resolve via player shard / base mapId.
- QuestManager User.id resolution; E-key NPC → `npc_interact`; Vance/entity `mapId` base-map match.
- Bootstrap runs before map-loader init so seeded tiles/maps are cached correctly.

## [2.1.117] - 2026-08-02

### Added
- **Demo bootstrap** on server start: CreatureDefs, Warden Vance dialogue, film craft recipes.
- **Warden Vance** spawn + dialogue grants (tools, film pack, open Lab).
- **Soul Film** capture path (`film_standard` / fine / soul); TB button **EXPOSE FILM**; shop sells/crafts film.
- Demo smoke checklist: `info/game/DEMO_SMOKE.md`.

### Fixed
- Clicking NPCs starts dialogue (`npc_interact`); wild creatures targetable for RT combat.
- Gather syncs inventory + emits `itemGathered` for quest hooks.

## [2.1.116] - 2026-08-02

### Added
- **Creature Catalog** (`CreatureDef`) — Studio-editable like Starter Heroes: asset picker, type combo, full stats, default + potential passives, world skills.
- Shared seed `FALLBACK_CREATURE_DEFS` (Agnite / Budaye / Dollfin starters + Rockitten wild).
- Studio dock **Creatures** panel; Professor Lab loads catalog starters; claim/encounters resolve via catalog.

## [2.1.115] - 2026-08-02

### Added
- **NPC shop** server authority (`ShopManager`): buy/sell Binding Crystal materials; **CRAFT** tab for Binding Crystals.
- Shared shop catalog + `craft_binding_crystal` recipe (`shopCatalog.ts`); seed script updated.
- **Rockitten** as the single MPV test creature for TB encounters + RT overworld spawns (`testCreature.ts`).
- `claim_starter` → real `PlayerCreature` (Rockitten); Party/Lab UI to claim.
- Client sync for `sync_credits`, `inventory_sync`, `creature_spawned` / despawn / HP.

### Fixed
- Gathering no longer demo-grants tools — require real inventory (quest/shop/craft later).
- Encounters require a real party creature (no fake Starter).
- Crafting resolves player by accountId; Binding Crystal craft works with in-code recipe fallback.

## [2.1.114] - 2026-08-02

### Added
- Shared RT ability catalog + capture math helpers (`src/shared/game/combatAbilities.ts`) with tests.
- Server-authoritative RT combat: ability catalog, capture rejection, cooldowns, range, LoS, miss/crit (`CombatManager`).
- Loot bag auto-despawn after 60s.

### Fixed
- Binding Crystal capture requires a **real inventory stack** (no demo grant); missing item keeps the turn open.
- Hotbar is **EXPLORING-only** (hidden in turn-based battles); capture abilities forbidden on RT path.
- Encounter battles use **directMessage** (no longer force every player on the shard into BATTLE).
- Capture uses bible 11 math; persists `PlayerCreature` with resolved `userId`; consumes Binding Crystal.
- `battle_ended` client handles CAPTURE / WIN / LOSE / FLEE (not only PvP winner socket id).
- Turn-battle sprites load from `/game-assets/` (legacy `/assets/sprites/` paths removed).
- `combat_cast` / `combat_action` pass `abilityId` correctly to the combat manager.

### Changed
- ALIGNMENT slices A→B→C marked implemented for combat/capture constitution path.

## [2.1.113] - 2026-08-02

### Added
- **Ecosystem vision** doc: `info/vision/ECOSYSTEM.md` (unified website + MMO + Studio north star).
- Shared `toBaseMapId` / `isSameBaseMap` (`src/shared/net/mapIds.ts`) + tests.
- Lobby manual verify checklist: `info/game/LOBBY_VERIFY.md`.

### Fixed
- Persist **base map** ids (strip `_chN` shards) so reloads don’t reintroduce multiplayer room splits.
- Mobile enter launcher restyled to Saints gold atmosphere (single fullscreen CTA).

### Changed
- Staff/system chat lines styled distinctly in GameChat.

## [2.1.112] - 2026-08-02

### Added
- **`/studio`**: Developer-only Studio client (server-gated); `/lobby` is the player client.
- **Staff floating menu** on lobby for Moderator+ (map announce, nearby players, admin link; Admin+ map kick; Dev open Studio).
- **Mobile controls**: single surface with floating joystick (default) or static D-Pad via Options → Controls.
- Socket events `staff_announce` / `staff_kick`; chat `/announce` for staff.

### Fixed
- Multiplayer room desync: join no longer overwrites live instance id with a stale saved base map id.
- Map warps re-emit `join_map` so peers/chat stay on the same shard.
- Duplicate touch pads removed; left pad path-queue was never drained — movement now uses the canvas input pipeline.
- NPC sprite path `/assets/sprites/` → `/game-assets/npc/`.

## [2.1.111] - 2026-08-02

### Fixed
- **Social actions barrel**: removed file-level `"use server"` so Next.js accepts re-exports (domain modules remain `"use server"`).
- **Client/server split for achievements**: catalog lives in `achievements-catalog.ts`; award + realtime emit stay server-only (`server-only` + `serverExternalPackages` for redis/socket.io).

### Added
- **Staging smoke**: `scripts/smoke-staging.sh` (`npm run smoke`) + `info/ops/STAGING_SMOKE.md` for forum/lobby/realtime readiness.

## [2.1.110] - 2026-08-02

### Added
- **Vitest coverage** for permissions matrix, forum restricted-board access, shared slug helper, forum Zod validators / hashtags / mentions, and messenger E2EE crypto round-trip.
- Shared helpers: `src/web/lib/forum-access.ts`, `src/web/lib/slug.ts` (wired into forum/news/modpack create paths).

### Fixed
- Lobby store unit test now expects default `TITLE_SCREEN` game mode.

## [2.1.109] - 2026-08-01

### Changed
- **Social server actions split**: `app/actions/social.ts` is now a barrel; implementations live in `app/actions/social/{posts,feed,engagement,history,moderation,analytics}.ts`. Export names and `@/app/actions/social` import path unchanged.

## [2.1.108] - 2026-08-01

### Added
- **`info/frontend/ROUTES.md`**: App Router route map (main nav, forum, profile, admin, writer, UCP back-line).

## [2.1.107] - 2026-08-01

### Added
- **`info/social/ACTIONS.md`**: feed + messenger + folder action inventory and realtime hooks.
- **`info/game/SOCKETS.md`**: server managers, inbound socket events, coarse website-bus rules.

## [2.1.106] - 2026-08-01

### Added
- **`info/backend/API_CATALOG.md`**: route + server-actions inventory with live-emit checklist.
- **`info/admin/PERMISSIONS.md`**: nav gates by level, admin APIs, new-page checklist.

## [2.1.105] - 2026-08-01

### Added
- **`/info` system overviews**: `frontend`, `backend`, `auth`, `social`, `admin`, `game`, and `forum/OVERVIEW.md`.
- Index updated; Discord/FiveM/S3/AI marked back-line in handoff docs.
- `docs/TODO.md` now redirects readers to `/info/`.

## [2.1.104] - 2026-08-01

### Added
- **Forum Settings** (`/admin/forum/settings`): text-enhance provider menu (Gemini cloud / Ollama local / off).
- Curated Ollama model catalog with estimated RAM + download size; download/pull from admin UI.
- `GET /api/ai/config`, `GET|POST /api/ai/local`; enhance route respects SiteSetting provider.
- Markdown editor hides Grammar/Polish when enhancement is disabled.
- Docs: `info/forum/TEXT_ENHANCE.md`.

## [2.1.103] - 2026-08-01

### Added
- **AOI InterestManager vitest soak**: zone math, neighborhood keys, synthetic multi-entity fanout (far entities isolated; fanout ≪ full-map broadcast).
- **WorldMap ops docs**: `info/database/WORLDMAP.md` (migrate/verify, loaders, GameMap mirror rules).
- **Legacy uploads migrate script**: `scripts/migrate-local-uploads-to-s3.ts` (`--dry-run`, `--skip-existing`).

## [2.1.102] - 2026-08-01

### Added
- **Optional S3/CDN uploads**:
  - Env-gated PutObject/DeleteObject via `@aws-sdk/client-s3` (`s3-storage.ts`).
  - Requires `S3_BUCKET` + credentials + `CDN_BASE_URL`; otherwise local `public/uploads` unchanged.
  - MinIO/R2 via `S3_ENDPOINT` / `S3_FORCE_PATH_STYLE`.
  - `next.config.ts` adds CDN host to `images.remotePatterns` when configured.
  - Docs: `info/uploads/STORAGE.md`; env vars in `.env.example`.
  - Vitest coverage for S3 enablement + URL/key helpers.

### Fixed
- `deleteUploadedFile` no longer breaks on `/uploads/...` paths (`path.join` absolute-segment bug).

## [2.1.101] - 2026-08-01

### Added
- **FiveM character/stats bridge**:
  - `POST /api/fivem/events` with actions `player_joined`, `player_left`, `sync_character`, `bank_transaction`, `link_license`.
  - Realtime events: `fivem.player.online`, `fivem.player.offline`, `fivem.character.updated`, `fivem.bank.updated`.
  - Friend-fanout `presence.updated` (`playing` / `online`) on join/leave.
  - UCP `RealtimeProvider` + `UcpLiveRefresh` for live dashboard/banking refresh.
  - Contract docs: `info/fivem/BRIDGE.md`.
  - Vitest coverage for license normalize, bank deltas, and payload schemas.

### Changed
- `/api/fivem/characters` emits `fivem.character.updated` after drugs/inventory sync (coords remain silent).
- Auth accepts `Bearer` + legacy raw secret; prefers `FIVEM_API_KEY`.

## [2.1.100] - 2026-08-01

### Changed
- **Campaign maps → WorldMap DB (complete)**:
  - Moved the ~12MB dump out of the app bundle to `scripts/data/campaign-maps.generated.ts` (seed source only).
  - Stubbed `src/web/components/the-lobby/data/campaign-maps.ts` so accidental imports cannot pull map payloads.
  - Fixed `scripts/migrate-campaign-maps-to-db.ts` to upsert `WorldMap` + `GameMap` collision mirror (235 maps, `gameId=tuxemon`).
  - `/api/maps` and `/api/maps/[slug]` are DB-only; POST requires Developer permission.
  - Server `map-loader.js` prefers `WorldMap`, then `GameMap`.
  - `WorldMapNavigator` + `listMaps()` load the map index from `/api/maps`.
  - Regenerators (`import-full-tuxemon-campaign`, `reimport-rich-tuxemon-maps`, `import-tuxemon.mjs`) write to `scripts/data/`.

## [2.1.99] - 2026-08-01

### Added
- **Discord Bot Bridge**:
  - `POST /api/discord/events` with actions `member_joined`, `role_sync`, `community_announce`, `link_account`.
  - Role sync via `DISCORD_ROLE_MAP` (never auto-demotes staff unless `forceDemote`).
  - Realtime events: `discord.member.linked`, `discord.role.synced`, `discord.community.announce`.
  - Discord OAuth `signIn` / `linkAccount` writes `User.discordId`.
  - Bot contract documented in `info/discord/BRIDGE.md`.
- **Achievement unlock automation**:
  - New badges: `first_reply`, `social_starter`, `tipper`.
  - `checkAndAwardAchievements` now creates SYSTEM notifications + realtime push on unlock.
  - Wired after forum replies, social posts, and tips (threads/friends/login already covered).

### Changed
- `/api/internal/events` forwards envelope `source` and broadcasts globally when no `userId` target.

## [2.1.98] - 2026-08-01

### Added
- **MMO Scaling Milestone 4**:
  - **AOI interest management**: Players join `aoi:{map}:{zx}:{zy}` rooms; `player_moved` / `creature_moved` broadcast only to the 3×3 zone neighborhood (`InterestManager`, `MMO_AOI_ZONE_SIZE`).
  - **Binary movement packing**: Compact ArrayBuffer codec in `src/shared/net/movementCodec.ts` (toggle with `MMO_BINARY_MOVEMENT=0` for JSON fallback). Client `player_moved` handler decodes binary with JSON fallback.
  - **Optional Redis Socket.io adapter**: `attachRedisAdapter()` enables multi-instance fan-out when `REDIS_URL` or `REDIS_HOST` is set (`@socket.io/redis-adapter` + `redis`).
  - Vitest coverage for movement codec round-trips.

## [2.1.97] - 2026-08-01

### Added
- **Realtime Milestone 3 — coarse MMO → website bridge**:
  - `PlayerManager` emits `ecosystemBroadcast` on join/leave; `SocketHandler` bridges to `RealtimeService.emitGlobal(..., { source: "mmo" })`.
  - Registered `game.player.online` / `game.player.offline` (optional `playerCount`); never includes movement or combat ticks.
  - Client roster in `useRealtimeStore`; live player counts in `ServerSelect`, Lobby admin, and new `ServerStatusCard`.
  - Smoke-verified custom server boot + `/api/game/server-status` + event registry validation.

## [2.1.96] - 2026-08-01

### Added
- **Realtime Milestone 2 — live site ↔ game wiring**:
  - Shared emit helpers in `src/web/lib/realtime-emit.ts` for server actions and API routes.
  - Instant `notification.created` push for social likes/replies/tips, forum reply + subscriber notifications, reply likes, support ticket replies, and @mentions.
  - `presence.updated` friend fan-out on socket connect/disconnect with online indicators in Friends List.
  - `chat.message.created` delivery for DMs and group chats; Chat Window refetches immediately on signal.
  - Admin Realtime Dashboard at `/admin/realtime` with live metrics, circuit breaker controls, force-disconnect, and recent CRITICAL event list.
  - Live forum thread updates via `forum.reply.created` room broadcasts (`thread:{id}`) and `LiveThreadReplies` auto-refresh.

## [2.1.94] - 2026-08-01

### Fixed
- **Mobile Game Launcher & Fullscreen Device Mode**:
  - Added `MobileGameLauncher.tsx` overlay for mobile screens presenting a prominent **"ENTER GAME (FULLSCREEN)"** trigger button instead of rendering a cramped inline canvas under site header bars.
  - Automatically triggers device `requestFullscreen()` and landscape orientation lock when entering mobile game mode.
  - Updated `app/(main)/lobby/page.tsx` height container to `h-[100dvh]` on mobile viewports.
- **Mobile Touch Controls & Action Pad**:
  - Positioned directional D-Pad on the **bottom-left** with continuous hold support for fluid character movement.
  - Built a dedicated **Mobile Touch Action Pad** on the **bottom-right** featuring `[⚡ INTERACT]` (z-action for talking to NPCs, entering doors, harvesting), `[🎒 BAG]`, `[⚔️ SKILLS]`, `[💬 CHAT]`, `[⚙️ MENU]`, and `[⛶ FULLSCREEN]` buttons.

## [2.1.93] - 2026-08-01

### Fixed
- **Character Selection Sprite Hydration**:
  - Updated `hydratePlayer` in `store.ts` to set `name`, `spriteId`, and `accountId` when loading character data, restoring selected character sprites on the 2.5D Babylon game canvas.
- **Multiplayer Visibility & Duplicate Entities**:
  - Guarded initial socket `join_map` request to only emit once character selection is complete, preventing pre-join orphaned player entities.
  - Added cleanup logic in `PlayerManager.ts` to automatically remove stale entities for the same socket/account upon re-joining.
  - Filtered local client `socket.id` out of `otherPlayers` in `index.tsx` to eliminate local phantom mesh duplicate overlays.
- **Real-Time Local & Global Chat Broadcast**:
  - Implemented server-side handler for `"globalChat"` in `SocketHandler.ts` to broadcast `global_chat_msg` to all connected clients.
  - Enriched local `player_chat` payload with sender name and room targeting, eliminating local chat log duplication and missing sender labels.

## [2.1.92] - 2026-08-01

### Fixed
- **In-Game Character Appearance & Sprite Alignment**:
  - Corrected texture `vOffset` mapping and sprite sheet row directions in `BabylonEngine.ts` to match standard 96x128px Tuxemon/RPG Maker sprite sheet layouts (Row 0: Down, Row 1: Left, Row 2: Right, Row 3: Up).
  - Eliminates vertical inverted row sampling in the 2.5D engine so player characters always display their exact chosen appearance and face the proper direction in-game.
- **Multiplayer Player Visibility & Socket Sync**:
  - Added immediate `join_map` socket re-emit in `index.tsx` as soon as character selection loads, ensuring the server registers the player's loaded character specs (`name`, `spriteId`) and broadcasts `player_joined` to other clients.
  - Enriched movement delta packets in `PlayerManager.ts` (`player_moved` event) with `name` and `spriteId` properties.
  - Added `player_left` socket listener in `index.tsx` and mesh cleanup tracking in `GameCanvasBabylon.tsx` to automatically dispose disconnected player avatars.

## [2.1.90] - 2026-08-01

### Fixed
- **Character Sprite Appearance Connection**:
  - Corrected broken `/game-assets/characters/` image URL paths in `character-selector.tsx` and `character-creator.tsx` to point to `/game-assets/npc/${spriteId}.png`.
  - Ensures preview card appearance in Character Creator & Selector matches the actual 2.5D player sprite rendered in `GameCanvasBabylon.tsx`.
- **Lobby Realm Server Connection & Offline Enforcement**:
  - Updated `ServerSelect.tsx` to strictly disable the "Connect" button when the selected server is `offline`.
  - Added an in-lobby server status alert with a 1-click **"Start Realm (Dev)"** trigger when offline.
  - Enhanced `/api/game/server-status` to automatically detect Next.js dev server mode and handle POST requests to start/stop dev server override.
- **Active Studio Server Controls**:
  - Built `ServerControl.tsx` and added the **Server Controls** tab (`<Server />`) to Dev Tools Panel in Studio.
  - Added active, non-greyed-out **Start Server**, **Stop Server**, and **Real-Time Metrics** controls so admins can power the game server directly from Studio.

## [2.1.89] - 2026-08-01

### Added
- **Studio Starter Hero Management**: Fully integrated Character Creation management into Saints Studio via `StarterHeroEditorPanel.tsx` and the `Heroes` tab on the Studio dock toolbar.
- **Database Model & Server Actions**:
  - Added `StarterHero` model to Prisma schema (`prisma/schema.prisma`) and pushed to SQLite database.
  - Built `app/actions/starter-heroes.ts` with public fetch, admin CRUD, active toggling, JSON batch importing, and idempotent seeding.
- **Studio Hero Archetype Generator & Requirements**:
  - **Requirements & Guidelines Guide**: Interactive overlay inside Studio detailing exact field specifications (slug format, class IDs, sprite key validation, JSON inventory specs).
  - **1-Click Archetype Generator Presets**: Built-in archetype templates (Tuxemon Beast Master, Arcane Elementalist, Spyder Operative, Grand Knight Lord, Nature Druid, Cyber Savant).
  - **Random Hero Generator**: 1-click randomizer that picks from Tuxemon/GAME_SPRITES with harmonious tags, colors, and class assignments.
  - **JSON Import / Export Modal**: Allows creators to copy or paste JSON hero definitions directly.
  - **Live Validation Status**: Real-time validation checks for slug syntax, sprite registry existence, and inventory JSON format.
- **Dynamic Character Creator Sync**: Updated `character-creator.tsx` to dynamically query active `StarterHero` archetypes from the database (with robust offline fallback), reflecting Studio edits in real time.

## [2.1.88] - 2026-08-01

### Changed
- **Pre-Game Flow Restyle**: Completely rebuilt all 4 pre-game screens to match the dark Saints Gaming aesthetic (deep violet/runic palette, glass cards, glow effects) — replacing the mismatched bright white UI.
  - `GameTitleScreen.tsx`: Animated canvas background with drifting runic particles, star field, scan-line effect, SAINTS logo with drop shadow glow, functional Credits modal, and Options button wired to `GameOptionsMenu`.
  - `GameLogin.tsx`: Dark glass card with violet glow, password reveal toggle, styled focus states, and "Forgot password?" link.
  - `ServerSelect.tsx`: Dark glass panel, animated ping dots (live/pulsing), color-coded population bar, auto-refresh indicator, connecting animation.
  - `character-selector.tsx`: Per-class color palettes with glow cards, hover animations, sprite previews, and dark glass "New Hero" creation card.
- **Character Creator Restyle**: Complete dark-aesthetic rewrite of `character-creator.tsx`:
  - New **HERO_PICK** step: 6 curated starter hero archetypes (Warrior, Paladin, Mystic, Shadow, Ranger, Monk) with live sprite previews, flavor text, and difficulty tags. No new assets required — all sprites already in `GAME_SPRITES`.
  - **NAME** step: Shows selected hero preview + compact class switcher.
  - **APPEARANCE** step: Lazy-loads full sprite grid, dark-styled pagination.
  - **GIFT** step: Color-coded perk cards with per-perk glow colors.
  - **REVIEW/FINALIZE** step: Summary with large sprite, class/perk badges, and stat preview.
- **Version**: Bumped all version fallback strings to `2.1.88`.

## [2.1.87] - 2026-07-31

### Changed
- **Lobby Redesign**: Re-styled `GameLogin.tsx`, `ServerSelect.tsx`, and `character-selector.tsx` to a lighter Nintendo aesthetic.
- **Character Creator**: Redesigned `character-creator.tsx` to a multi-step "Dark Souls" style wizard where users directly select `GAME_SPRITES` models.
- **HUD Redesign**: Decoupled the dark UI box into clean, separate pill-shaped floating indicators in `SaintsHudOrbs.tsx`.
- **Options Menu**: Updated `GameOptionsMenu.tsx` to match the new lighter aesthetic.

## [2.1.86] - 2026-07-31

### Changed
- **Map Editor UI Refactor (Phase A)**: Transitioned the monolithic `IntegratedDevEditor.tsx` into a system of highly modular, draggable floating panels that align with the vision: *"Building a game should feel like playing the game."*
- **Centralized Panel State Management**: Built a robust Zustand store (`editor-store.ts`) to globally manage the `isCreationMode` toggle, active editor tools, and floating panel states (position, size, z-index, visibility).
- **Draggable UI Architecture**: Created `DraggablePanel.tsx`—a reusable floating window container with bounds clamping and z-index sorting.
- **Decomposition**: Extracted the old editor into separate components: `WorldBuilderPanel.tsx`, `PropertiesPanel.tsx`, `AssetBrowserPanel.tsx`, `NpcEditorPanel.tsx`, and `DevToolsPanel.tsx`.
- **Global Studio Shell**: Implemented `StudioEditorShell.tsx` overlay featuring a centralized bottom-dock Toolbar.
- **Engine Canvas Bridging**: Updated `GameCanvasBabylon.tsx` to read directly from `useEditorStore` to seamlessly coordinate map clicks and tile painting across detached panels.

## [2.1.77] - 2026-07-30

### Changed
- Reorganized codebase to strictly separate Engine vs Game domains following standard game engine architectures.
- Migrated all React components, utility libraries, hooks, and types out of root folders into `src/engine/`, `src/game/`, `src/editor/`, `src/shared/`, `src/server/`, and `src/web/`.
- Updated `tsconfig.json` paths and automated the refactoring of 1,500+ import statements across the Next.js `app/` router.
- Consolidated documentation into a dedicated `docs/` hierarchy (architecture, editor, gameplay, getting-started, reference) serving as a single source of truth.
- Moved root deployment scripts to `scripts/` and cleaned up the project root.

## [2.1.76] - 2026-07-30

### Added
- Completed the Saints Gaming Master Development Blueprint, fully documenting 23 major engine, MMO, and gameplay architecture systems.
- Executed Phase 2, Step 1: Built the Generic Creature Engine architecture.

### Changed
- Decoupled hard-coded Tuxemon database tables into a generic framework (CreatureTemplate, AbilityDictionary, PlayerCreature, EncounterTable).
- Migrated Zustand store.ts client state to generic creatureParty / creatureInventory structures.
- Updated all API routes and the Admin Dashboard to fetch the normalized Creature schema.
- Resolved 35+ TypeScript build errors to ensure strict type compliance with the new generic schema.

# Changelog

## [2.1.81] - 2026-07-30
- Documentation Cleanup: Removed the raw `docs/gameplay-bible` notes and various empty legacy documentation stubs from the public repository to prevent confusion. The official source of truth is now firmly established in `docs/architecture` and `docs/developer-guide`.

## [2.1.80] - 2026-07-30
- Documentation Synthesis: Extracted the complete Saints Gaming MMO Architecture and Editor Rules from the private `.tools/Gameplay Bible` into professional public markdown documentation in `docs/architecture` and `docs/developer-guide`.

## [2.1.79] - 2026-07-30
- **Demo Sandbox Environment**: Created `DEMO_SANDBOX` map for live multiplayer and world interaction testing.
- **Editor Pipeline Fix**: Corrected the `MapEditor` API POST route to accurately save structural map changes to the database.
- **Seamless Spawning**: Defaulted new character spawns to the `DEMO_SANDBOX` for rapid testing iteration.
- **Interaction Testing**: Added a Guide NPC, Interactive Trees (`HARVEST_WOOD`), and Ore Rocks (`HARVEST_ORE`) into the sandbox.
### v2.1.64
- **Drift-Compensating Game Loop**: Replaced Node's setInterval with a recursive setTimeout loop that calculates and compensates for execution drift in game-server.js for a solid 15 TPS.
- **O(1) Spatial Hash Grid Collision**: Built SpatialGrid class in spatial-grid.js and wired it into game-server.js. Map NPCs and players are dynamically loaded into the grid, making collision checks an instant dictionary lookup instead of O(N) array scans.
- **Input Buffering Optimization**: Limited the moveQueue queue depth to exactly 2 items, balancing jitter-tolerance while preventing the ice skating bug during lag spikes.
- **Rapid Rubber-Banding Interpolation**: Modified the client's updateEntity loop in BabylonEngine.ts. The client now dynamically adjusts its lerp speed based on the discrepancy distance. If the server heavily corrects a misprediction (dist > 1.5 tiles), the player mesh will smoothly zip back into place at 3x speed.


### v2.1.60 — Server-Authoritative Physics & Collision (Phase 2)
- **Server-Side Collision Detection**: Created `lib/game/map-loader.js` — a Prisma-backed utility that loads map collision grids and logic tiles from the database, caches them in memory, and provides `isWalkable()` / `isWalkableSync()` for O(1) tile lookups during physics ticks.
- **Authoritative Game Server Rewrite**: Rewrote `game-server.js` to process `move_intent` events (direction + sequence number) instead of trusting raw client coordinates. Added a 15 TPS server tick loop that validates movement against collision grids, NPC positions, and map bounds. Sends `move_ack` for valid moves and `position_correction` for rubber-banding invalid ones.
- **Client-Side Prediction & Reconciliation**: Updated `store.ts` with `moveSequence`, `pendingMoves` buffer, and `applyServerCorrection()`. The client predicts movement locally for zero-latency feel while the server validates asynchronously.
- **Move Intent Protocol**: `GameCanvasBabylon.tsx` now sends `move_intent { direction, seq }` instead of `move { x, y }`. Tracks pending moves with sequence numbers for server reconciliation.
- **Entity Interpolation**: Added 100ms smooth-step interpolation buffer for rendering other players in the Babylon render loop. Remote player movement now appears buttery smooth regardless of network jitter.
- **Socket Reconciliation Handlers**: Added `move_ack` and `position_correction` listeners in `index.tsx` for server-authoritative movement feedback.
- **Anti-Cheat**: Server rejects teleport attempts (>1 tile distance), wall-walking, and NPC clipping. Legacy `move` handler kept for backwards compatibility but now validates all coordinates.

### v2.1.57
- **Classic RPG Interface Overhaul**: Replaced the floating Game Menu Bar with a static `ClassicPanel.tsx` in the bottom right corner, bringing an immersive classic RPG layout (Inventory, Skills, Equipment, Quests, GTC).
- **Classic Inventory & Skill Trees**: Scaled down `inventory-overlay.tsx` to a 4-column item grid, and redesigned `skills-overlay.tsx` into a classic 3-column stats list with hover tooltips to fit inside the new Classic Panel.
- **Classic Chat Interface**: Redesigned `GameChat.tsx` layout to resemble classic RPG brown opaque chat boxes with channel tabs at the bottom.
- **Immersive Chat Bubbles**: Overhauled BabylonJS 3D chat bubbles into retro yellow text with black outlines rendered directly above player models in world space.
- **Action Hotbar**: Added a 6-slot quick-access Hotbar overlay at the bottom-center of the UI during exploration mode.
- **Player Animation Fix**: Fixed a bug where WASD movement directions were mapped to the wrong Sprite Sheet rows (W mapped to left, D mapped to up, etc.). Corrected WebGL UV V-Offset row bindings.
### v2.0.3
- **Site Level Progression Engine**: Linked game progression to platform account progression. Unlocking game achievements now grants XP which automatically ranks up the user's site-wide `LevelTier` across the network.
- **Discord Webhook Broadcasting**: Fully integrated Saints Tamer server actions with the platform Discord Webhooks (`discord.ts`). Top achievements, earned coins, and platform Level Ups are now broadcasted live to community channels.
- **Map Editor WebGL Synchronization**: Fixed `MapEditorPanel.tsx` to properly extract live 2D grid tilemaps from the PixiJS `MapEditorWebGL.tsx` instance into the database `gridData`, enabling genuine, persistent world building for admins.

### v2.0.2
- **In-Game Achievements & Badges Overlay**: Created `achievements-overlay.tsx` allowing players to inspect community achievements (*First Beast Capture*, *Campaign Explorer*, *Master Crafter*, *Keeper Conqueror*, *Base Tycoon*) and claim site Coins (+50 Coins) & platform XP directly into their account DB via `unlockGameAchievement` server action.

### v2.0.1
- **Campaign Map Editor Integration**: Defaulted in-game Map Editor Panel (`MapEditorPanel.tsx`) and Menu Admin Map Editor (`app/(main)/admin/map-editor/page.tsx`) to `PLAYER_HOUSE_BEDROOM` with full editing, node placement, and DB persistence for all 38 Tuxemon campaign maps.

### v2.0.0
- **Site-Wide Operative Leaderboards Page**: Created public website leaderboard page `app/(main)/leaderboards/page.tsx` ranking community operatives by Character Level, Total 27-Skill XP, Economy Credits, and Caught Tuxemon species count.
- **Server Action Integration**: Created `getTopLobbyOperatives()` in `app/actions/game.ts` querying database characters and computing real-time rankings with user profile badges.
- **In-Game Leaderboard Overlay**: Created `leaderboard-overlay.tsx` accessible via top navbar button (`LEADERS`) in The Lobby.

### v1.9.5
- **In-Game Quest Journal & Task Tracker Overlay**: Created `quest-log-overlay.tsx` allowing players to inspect active campaign tasks, active objective stages, reward payouts (XP & Credits), and completed quest history from the top navigation bar (`QUESTS`).
- **HUD Mini-Map Radar & Compass Widget**: Created `MiniMapRadar.tsx` rendering real-time map grid preview, player position pulse, nearby NPC indicators, active warp gates, and tile coordinates (`X, Y`) on the top-right corner HUD.

### v1.9.0
- **Base Automation Passive Beast Resource Farming**: Updated `base-overlay.tsx` allowing caught Tuxemon beasts to be assigned to base facilities (*Lumber Mill*, *Quarry*, *Furnace*, *Farm*, *Fishing Hut*) to generate passive yields over time.
- **Co-Op Party Shared XP & Member Management**: Upgraded `party-overlay.tsx` with a 4-player online party lobby, username invitations, and +25% Shared XP status indicator.

### v1.8.5
- **Character RPG Sheet & Stats Overlay**: Created `rpg-stats-overlay.tsx` showing player level, combat style, equipped armor/weapon slots, active perk perks, carry weight capacity, and all 27 skill XP progression bars.
- **Phase 2 Keeper ARPG Combat**: Enhanced `battle-overlay.tsx` to handle direct Player vs Keeper ARPG combat when defeating trainer beasts.
### v2.0.5
- **Dynamic Wild Beast Map Encounters Engine**: Overhauled tall grass trigger mechanics to read map-specific `encounterPool` configurations from the `WorldMap` database model instead of hardcoded random spawns.
- **Encounter Zones UI in Map Editor**: Built "ENCOUNTERS" tab in `MapEditorPanel.tsx` allowing admins to dynamically assign beast species, minimum/maximum levels, and spawn rates (weights) per map zone.

### v1.8.0
- **Interactive Professor Lab Starter Choice Event**: Created `ProfessorLabOverlay.tsx` cutscene triggering upon entering `PROFESSOR_LAB`. Players choose between Fire (Ignisaur), Water (Aquaspout), and Wood (Verdantail) starter beasts.
- **Global Trade Center (GTC) P2P Marketplace**: Created `gtc-overlay.tsx` allowing players to list, browse, search, and buyout caught Tuxemon beasts, crafted equipment with ARPG affixes, and materials.
- **Dynamic Spatial Audio Engine**: Upgraded `audio.ts` with Howler.js integration (`playTownBgm`, `playBattleBgm`, `playVictorySfx`).
- **Authoritative Socket.IO Overworld Sync**: Enhanced real-time multiplayer rendering in `game-canvas.tsx` with player name tags and live chat speech bubbles.

### v1.7.7
- **Automatic Map State Sanitizer**: Upgraded `selectAndLoadCharacter` in `components/the-lobby/index.tsx` so existing character saves with obsolete placeholder map references automatically boot into campaign map `player_house_bedroom` (`{ x: 6, y: 2 }`).
- **User Profile Operative Showcase Overhaul**: Created `ProfileCharacterDetails.tsx` with expandable tabs for character **Inventory**, **Beast Party & Bank**, and **Global Trade Center (GTC)** trading previews.

### v1.7.6
- **Tuxemon Campaign Purge**: Removed placeholder test maps, leaving official campaign maps (`player_house_bedroom`, `spyder_paper_town`, `professor_lab`, etc.) as the primary playable world.
- **Unique Perk & Trait Selection System**: Integrated passive perks in character creation (`Swift Traveler`, `Acrobat Double Jump`, `Pack Mule`, `Master Tamer`, `Stamina Surge`).
- **Spacebar Tile Hopping & Double Jump Engine**: Enabled 1-tile hopping (and 2-tile Acrobat Double Jump) in `game-canvas.tsx` for crossing obstacles.
- **Inventory Carry Weight Limits**: Added `inventoryWeight` tracking and capacity limits (100 kg base, 150 kg with Pack Mule) in `inventory-overlay.tsx`.

### v1.7.5
- **ARPG Rarity & Affix Rolling in Crafting Station**: Integrated ARPG loot rarity rolls (Common, Uncommon, Rare, Epic, Legendary) and stat affixes (`+Damage`, `+XP`, `Lifesteal`) when crafting weapons and equipment in `crafting-overlay.tsx`.
- **Dialogue & Quest Payout Flow Optimizations**: Refined NPC quest acceptance and turn-in feedback loops in `dialog-overlay.tsx`.

### v1.7.4
- **Open Source Copyleft Compliance & Tuxemon Attribution**: Added [TUXEMON_ATTRIBUTION.md](file:///c:/Users/Matth/OneDrive/Desktop/Saints%20Web/TUXEMON_ATTRIBUTION.md) and License documentation giving explicit open-source credit to the Tuxemon Project (GPLv3 / CC BY-SA 4.0) and OpenGameArt LPC contributors.
- **Campaign Map Gate & Quest Flow Organization**: Optimized map warp connections, dialogue scripts, and quest triggers across campaign maps (`PLAYER_HOUSE_BEDROOM`, `PROFESSOR_LAB`, `SPYDER_PAPER_TOWN`).

### v1.7.3
- **World Map Navigator Component**: Built visual map browser (`WorldMapNavigator.tsx`) with search, campaign/custom category filters, and adjacent gate link indicators.
- **Linked Map Editors**: Unified the terminal in-game editor (`MapEditorPanel.tsx`) and admin page editor (`app/(main)/admin/map-editor/page.tsx`) with full campaign map loading and multi-map preview toggling.
- **Tuxemon Campaign Primary Focus**: Made all 38 Tuxemon campaign maps (`PLAYER_HOUSE_BEDROOM`, `PROFESSOR_LAB`, `SPYDER_PAPER_TOWN`, etc.) immediately selectable and editable in canvas editor.

### v1.7.2
- **Lobby Directory Refactoring**: Reorganized `components/cyber-terminal/` into `components/the-lobby/`, updating component paths and dynamic imports across all lobby routes.
- **Integration Status Documentation**: Audited and published `INTEGRATION_STATUS.md` detailing Phase 1-4 game state, tile registry, 411 Tuxemon creature database, mobile D-Pad controls, and development roadmap.
- **Battle System Party Switching & Status Effects**: Enhanced battle overlay with party member selection during combat, turn-based status condition processing (Poison, Burn, Sleep, Freeze, Paralysis), and in-battle item usage.

### v1.7.1
- **ESLint Compliance for WebGL Canvas Initializer**: Switched `require('pixi.js')` statements to standard `settings` imports in `MapEditorWebGL.tsx` and `TuxemonBattleScene.tsx`, satisfying Next.js ESLint build rules (`@typescript-eslint/no-require-imports`).
- **MariaDB Database Seed Truncation & Production Data Sync**: Resolved `P2000` MariaDB string column overflow error during seeding by safely truncating JSON string tags/types in `scripts/import-tuxemon-data.ts`, successfully populating all 411 Tuxemon beast species, movesets, techniques, and maps into the live database.
- **WebGL Shader & PixiJS Initialization Safeguards**: Resolved `checkMaxIfStatementsInShader` exception by disabling strict shader statement limit checks (`CHECK_MAX_IF_STATEMENTS_IN_SHADER = false`) and wrapping canvas Application instantiation in try-catch fallback blocks across `MapEditorWebGL.tsx` and `TuxemonBattleScene.tsx`.
- **Database Seeding & WebGL Tile Registry Fallbacks**: Added repo-relative `tuxemon-db` YAML database source, wired automatic DB seeding of all 411 Tuxemon species/techniques into `entrypoint.sh` upon production deployment, and built default tile palette fallbacks into `MapEditorWebGL.tsx`.
- **In-Site Collaborative Game Editor & Quest Interface Alignment**: Added NPC Dialogue Script Editor and Warp Portal Linker tabs to `MapEditorPanel.tsx`, exported `QUEST_DB` alias in `components/cyber-terminal/data/quests.ts` with complete type definitions (`GameQuest`), resolving all TypeScript build constraints.
- **Authentic Tuxemon Starter Story Flow**: Configured default player spawn point to `PLAYER_HOUSE_BEDROOM` (`{x: 6, y: 2}`), wiring initial stairs warp to `PLAYER_HOUSE_DOWNSTAIRS` (Mom dialogue), front door exit to `SPYDER_PAPER_TOWN` (Tamer Guide), and Lab warp to `PROFESSOR_LAB` (Prof. Oakwood starter beast selection).
- **Tuxemon Campaign Maps Integration & WebGL Engine Port**: Imported 38 primary campaign maps (`player_house_bedroom`, `player_house_downstairs`, `spyder_paper_town`, `professor_lab`, `spyder_route1`, etc.) into `components/cyber-terminal/data/campaign-maps.ts`, linking map portals, NPC spawn triggers, and wild encounter pools.
- **Lint Cleanliness Verification**: Cleaned up React hook dependencies and unused variables across `DialogueBox.tsx`, `TuxemonBattleScene.tsx`, `MapEditorWebGL.tsx`, and `TuxepediaOverlay.tsx`.
- **Permission Locked Map Editor & Tuxemon Tileset Integration**: Permission-locked the map `EDITOR` button to verified admin accounts (`checkAdminPermission`), updated `drawMap` canvas engine to query `tileRegistryCache` for official overworld Tuxemon tilesets, and fixed grey fallback rendering.
- **Strict Lint Cleanliness & Production Server Build Fix**: Removed unused imports (`Shield`, `Search`) in admin Tuxemon page and cleaned up catch error binding in `app/actions/achievements.ts`, resolving Next.js strict production docker compilation error.
- **Community Feed Integration**: Added "SHARE TO FEED" button to the Saints Dex overlay (`SaintsDexOverlay.tsx`), enabling players to broadcast rare species registrations directly to the community feed via `createSocialPost`.
- **SaintsDexOverlay Component Renaming**: Renamed component exports and overlay references from `TuxepediaOverlay` to `SaintsDexOverlay` across HUD navigation and terminal overlay imports, fully purging non-branded terms from frontend React components.
- **Server Action Pinned Beast Integration**: Connected `pinBeastToProfile` server action directly to the Saints Dex & Animist Codex overlay, persisting pinned companion beasts to the database and revalidating user profile pages.
- **Saints Gaming Lore Alignment**: Completed codebase audit of all user-facing UI text, updating remaining labels, tab titles (`Saints Dex & Animist Codex`), card headers (`PINNED SAINTS BEAST`), and empty states to strictly adhere to Saints Gaming lore and copyright guidelines.

### v1.5.6
- **Tuxemon Evolution API & Expanded Crafting Mechanics**: Implemented Tuxemon creature evolution API (`/api/tuxemon/evolve`) and expanded the crafting matrix (`data/items.ts`, `crafting-overlay.tsx`) with Tuxeballs, Grand Balls, Mega Balls, Mithril Weapons/Platebodies, and Cooking recipes.
- **Tuxemon Admin Suite**: Introduced Tuxemon Database manager (`/admin/game-dev/tuxemon`) under the Game Dev admin suite in `AdminOverlayShell`, enabling full administrative inspection of all 411 Tuxemon species, base stats, elements, and movesets.
- **5-Facility Base Automation Matrix**: Upgraded Base Overlay to render all 5 production facilities (Lumber Mill for Wood Logs, Quarry for Ores, Furnace for Metal Bars, Herb Farm for Grimy Herbs, Fishing Hut for Raw Fish), with passive resource loops and visual live sanctuary feeding canvas.
- **Pinned Tuxemon Beast Profile Showcase**: Integrated pinned beast companion display badges onto public user profile cards (`/user/[username]`), connected `pinnedBeastId` in `getPublicProfile` server actions, and enabled showcasing active Tuxemon companions on user profiles.
- **Tuxemon × Saints Tamer Complete Merger Phase**: Fully merged Tuxemon creature mechanics (411 species dataset, 274 movesets, catch rates, Tuxepedia encyclopedia overlay) with Saints Tamer OSRS-inspired 27-skill RPG matrix. Integrated in-panel WebGL `MapEditorPanel` with toolbar tabs for tile painting, collision boundaries, RPG resource node spawning (mining rocks, woodcutting trees, fishing spots), NPC placement, Tuxemon wild encounter zone definitions, and portal gates. Extended Socket.IO party management (`party-manager.ts` EventEmitter integration and multiplayer party invites via friends list).
- **Pixel Art Sprite Canvas Rendering Engine**: Replaced legacy HTML5 fallback 2D circle shapes (`#ef4444` red ball) with full pixel-art character sprites, class outfit palettes (Emerald Agent, Purple Cybermancer, Gold Wanderer, Cyan Phantom, Red Brawler), dynamic image asset rendering (`/uploads/...`), NPC quest mark indicators (`!`), and multi-player avatar rendering.

### v1.5.0
- **URL Slug Migration & /lobby Route**: Migrated primary game URL slug to `/lobby` (`app/(main)/lobby/page.tsx`), updated navbar and profile references, and added seamless redirect from legacy `/profile/terminal` to `/lobby`.

### v1.4.9
- **The Lobby Rebranding & Aesthetic Redesign**: Renamed game area from "Sub-Network Terminal" to **The Lobby**, replaced matrix green terminal styling with Saints Gaming modern glassmorphism design system, gradient titles, and automated remote server deployment.

### v1.4.8
- **Character Selection & Custom Sprite Overhaul**: Added `CharacterSelector` screen for existing character saves, custom uploaded `GameAsset` avatar support during registration, fixed profile card sprite rendering, and resolved character creation boot loop.

### v2.1.15
- **Indoor Procedural Textures**: Upgraded the `BabylonEngine` renderer! Indoor maps (Bedrooms, Houses, Labs, Dojos, etc) now dynamically generate and apply procedural wood floor and plaster wall textures to their map tiles, massively improving the visual aesthetics of the game.

### v2.1.14
- **Overlays Fixed**: The `IntegratedDevEditor` now automatically hides conflicting UI overlays (MiniMap, HUD Orbs, Chat Bar) when opened, resolving overlap issues.
- **Tuxemon NPCs Importer**: Integrated dynamic character sprite importing! The Dev Editor now maps and lists 208 available character sprites from `/tuxemon-assets/npc/` inside the `Heroes` and `NPCs` visual drop-down menus.

### v2.1.13
- **Excluded SQLite Migrations from Docker & MariaDB**: Added `prisma/migrations` to `.dockerignore` and purged legacy SQLite migration files. This ensures Docker production builds push clean Prisma schemas directly to MariaDB without migration conflicts.

### v2.1.12
- **Production MariaDB Schema Push Fix & Docker Auto-Deploy**: Resolved Docker container startup crash where legacy SQLite migration files caused `prisma db push` MariaDB table conflicts (`Table 'Account' already exists`). Added automatic clearing of `prisma/migrations` in `entrypoint.sh` for clean production deployment.

### v2.1.11
- **Critical Hotkey Conflict Resolution**: Fixed global keydown collision where pressing `D` (WASD right movement) intercepted input to trigger `setGameMode('DEX')`, locking overworld movement and opening Saints Dex. Re-mapped Dex hotkey to `X` (`DEX [X]`), restoring 100% unimpeded WASD movement.

### v2.1.10
- **Grid Shading, Smooth Camera & Sprite Spawn Fix**: Implemented alternating checkerboard tone shading across all 2.5D ground tiles (`BabylonEngine.ts`) so tile sliding during WASD movement is visually obvious. Eliminated sprite lerp teleporting on spawn by copying target vectors immediately upon mesh creation. Added live `Pos: (X, Y)` indicators in 2.5D HUD badge and canvas click-focus.

### v2.1.9
- **Tuxemon Map Data AST Extraction & 2.5D Movement Fix**: Extracted 70+ Tuxemon NPCs from desktop `.tmx` and `.yaml` source files into `campaign-maps.ts` and `IntegratedDevEditor`. Resolved 2.5D player render loop stale closures (minimap position was moving while overworld canvas was locked at spawn). Connected Spacebar interact key to launch full-screen RPG `DialogOverlay` with portrait text box, and enabled instant live-rendering of newly placed Dev Editor NPCs onto the 2.5D Babylon grid.

### v2.1.8
- **Saints MMO Standard HUD Orbs, WebAudio Sound Effects Engine & Interface Frame**: Added circular stat Orbs (HP, Spirit/Prayer, Run Energy, XP Tracker Bar), procedural WebAudio sound synthesizer (woodcutting chop, mining clink, level-up fanfare, wild encounter swoosh), and verified zero-error type safety.

### v2.1.7
- **Movement Engine Overhaul, Character Importer & Clean Overlay Layering**: Added Click-to-Move raycasting, on-screen D-Pad & Talk/Interact floating action button, added Character & Sprite Customizer Tab to Dev Editor, resolved modal overlay stacking, and verified zero-error type safety.

### v2.1.6
- **In-Engine Map Creator & JSON Exporter/Importer Suite**: Added `+ Create Map` modal to Dev Editor allowing instant in-game map generation (slug, dimensions, category), JSON map export & import utilities, and permanent database creation.

### v2.1.5
- **Senior UI/UX & Game Designer Polish Overhaul**: Added mouse wheel camera zoom (orthographic sizing 4 to 18) in `BabylonEngine.ts`, global keyboard shortcuts (`I` for Inventory, `K` for Skills, `P` for Party, `D` for Dex, `B` for Badges), enhanced 2.5D HUD profile badges, and verified zero-error type safety.

### v2.1.4
- **Dev Editor Common Sense Upgrade & Flood-Fill Utilities**: Added `Fill Entire Map` flood-fill shortcut button to terrain tab, enhanced UX brush feedback, improved active map header warp links, and verified zero-error type safety.

### v2.1.3
- **Overworld Interactive Triggers & Wild Encounter System**: Connected tall grass encounter triggers (tile 2) to launch wild Tuxemon battles, implemented warp gate map transitions (tile 3/4), overworld NPC dialogue triggers, and resource harvesting (Woodcutting & Mining) with skill XP gains.

### v2.1.2
- **Universal Map Index & All-Component Dev Editor Suite**: Added central `map-index.ts` registry indexing all campaign maps, added searchable map warp selector in `IntegratedDevEditor.tsx`, expanded 6 full editor tabs (Tiles, Spawns, Grass Encounters, NPCs/Dialogue, Battle Arenas, Quests), and added `POST /api/maps/[slug]` API for permanent MariaDB database persistence.

### v2.1.1
- **Full-Bleed 2.5D Viewport & Campaign Map Visual Overhaul**: Replaced hardcoded colored block rendering with full campaign map loading, 2.5D world props (trees, rocks, tall grass tufts, water planes), WASD/Arrow key movement, procedurally crisp player character pixel art sprites, and responsive full-screen viewport layout.

### v2.1.0
- **Multiplayer 2.5D Sync & Production MMO Release**: Integrated real-time Socket.IO overworld position tracking into the Babylon 2.5D billboard sprite engine, rendered multi-player avatar billboards, and verified zero-error production compilation.

### v2.0.9
- **RuneScape Skill Integration & Dual Combat System**: Enhanced 27-skill XP progression curve formula, added ARPG crafting item random affix rolls, implemented dual-combat mode (Tuxemon beast-vs-beast phase followed by direct player-vs-keeper combat), and integrated Spacebar action-command damage block math.

### v2.0.8
- **Tuxemon Engine Unification & Critical Mechanics**: Unified elemental types to Tuxemon 15-type chart, aligned 6-stat system (`hp`, `atk`, `def`, `spd`, `ratk`, `rdef`), implemented move PP consumption, level-up evolution trigger evaluation, and species catch rate math with Tuxeball multipliers.

### v2.0.7
- **Interactive 2.5D Dev Editor & Map Configurator**: Added live 2.5D raycast pointer tile painting, spawn/respawn drag markers, tall grass encounter brush tool, NPC trainer roster setup, and battle background/weather parameters to the Integrated Dev Editor suite.

### v2.0.6
### v2.1.24
- **Ultimate Game Engine Editors & Class System (Phase 4.3, 5 & 6)**:
  - **Integrated Asset Manager**: Mounted `AssetEditor.tsx` into Dev Editor (`Ctrl+E`), enabling tag filtering, reclassifying mislabeled assets, bulk tag operations, and asset search.
  - **Game Engine & Character Class Editors**: Created `CharacterClassSystem`, `GameConfigEditor`, and `ClassEditor` components for managing multi-game rules, max levels, stat growth formulas, and allowed sprite tag filters.
  - **Interactive Sprite Browser**: Created `SpriteBrowser.tsx` and `SpritePreview.tsx` components featuring class-filtered sprite selection, 4-direction view toggling, hover walk-cycle animation loop, and detailed metadata inspection.
  - **Dev Editor Navigation**: Added `Classes`, `Engine`, and `Sprites` tabs to the Integrated Dev Editor suite.

### v2.1.23
- **True Map Recreation & Directional Animated Entities (Phase 2 & Phase 3)**:
  - **Map Database Validation Audit**: Created `scripts/validate-maps.ts` map auditor script. Validated all 235 database maps (182 maps fully verified with multi-layer TMX tilesets).
  - **Map Chunk Loader**: Implemented `MapChunkLoader.ts` for camera viewport-driven chunk loading and distant chunk unloading.
  - **Directional Animated Billboards**: Upgraded `BabylonEngine.ts` entity rendering with 4-way direction (`down`, `up`, `left`, `right`) and 3-frame ping-pong walk cycle UV mapping for player, NPCs, and overworld entities.
  - **Character Creator Presets**: Updated `character-creator.tsx` preset choices to point to real Tuxemon NPC sprite sheet assets (`adventurer.png`, `heroine.png`, `warrior.png`, `dragonrider.png`, `alchemist.png`, `catgirl.png`, etc.).

### v2.1.22
- **Ultimate Game Engine Foundational Implementation (Phase 0 & Phase 1)**:
  - **Native Asset Slicing & Interpretation Layer**: Created `SpriteSheetSlicer`, `AssetPathResolver`, and `AssetManager` modules to natively slice 48x128 NPC sheets into 12 directional frames (4 directions x 3 walk cycle frames) and index assets into an expanded `GameAsset` database schema with tag & category management.
  - **Database Schema Expansion**: Added `GameConfig`, `CharacterClass`, `LootTable`, `MonsterSpritePool`, and `WorldMap` game extensions to Prisma schema.
  - **Campaign Map Migration & API**: Migrated 235 campaign maps into `WorldMap` database table, eliminated the 11.3 MB client bundle import, and added lazy-loading API endpoints `/api/maps/[id]` and `/api/maps` with client caching.
  - **System Unification & Cleanup**: Consolidated legacy rendering paths into Babylon.js engine and updated texture path resolution.

### v2.1.18
- **Integrated Game Chat & Site Friends Messenger**: Redesigned game chat window into a multi-channel terminal (`MAP`, `WORLD`, `PARTY`, `FRIENDS`). Integrated site-wide Friends List and E2EE private direct messaging. Connected `global_chat` and `party_chat` socket handlers in `game-server.js`. Rendered dynamic 3D speech bubbles over local and remote player characters in BabylonJS. Added quick emote popups and message history filters.

### v2.1.17
- **Dedicated Python Utilities Suite (`/tools/`)**: Created a clean `/tools/` directory containing python scripts for remote updates (`update_live.py`), restarts (`restart_live.py`), status monitoring (`check_status.py`), log checking (`check_logs.py`), and DB seeding (`seed_database.py`), along with complete usage documentation.

### v2.1.16
- **Rich Tuxemon Tileset & Layer Rendering Engine**: Imported 96 full Tuxemon tileset graphics into `public/assets/tilesets/`. Re-parsed all 235 campaign TMX maps to extract multi-layer GIDs (floors, walls, furniture, decorations) and exact collision boundaries. Upgraded `BabylonEngine.ts` to render rich multi-layered texture planes using UV coordinate mapping, restoring full visual fidelity to Tuxemon indoor rooms and outdoor locations.

### v1.4.7
- **Admin & Dev Console Immersion Overhaul**: Added Game Dev Suite quick links, real-time MMO metrics (Characters, Quests, Assets, Maps) to both main Admin Dashboard and Developer Console.

### v1.4.6
- **Custom Asset Picker in Map Editor**: Integrated `GameAsset` library into World Map Editor NPC Placement mode to allow admins to select uploaded custom pixel art sprites.

### v1.4.5
- **Dynamic Game Quest & NPC Integration**: Connected custom `GameQuest` DB records and Map Editor placed NPCs directly into the cyber terminal engine (`components/cyber-terminal/index.tsx`, `game-canvas.tsx`).

### v1.4.4
- **Game Dev Admin Suite**: Introduced dedicated Game Dev category in Admin Overlay Shell.
- **Quest Creator**: Built Quest Creator UI (`/admin/game-dev/quests`) and `GameQuest` DB model for quest dialogues, item requirements, and payouts.
- **Asset Studio & Mass Importer**: Created Asset Studio (`/admin/game-dev/assets`) and `GameAsset` DB model supporting batch uploading and categorization of 16x16 / 32x32 pixel art sprites.
- **Map Editor Quest NPC Placement**: Upgraded World Map Editor (`/admin/map-editor`) with NPC Placement mode linked directly to registered Quests.

### v1.4.3
- **Map Editor Canvas Scaling**: Fixed mouse cursor coordinate offset on the World Map Editor by taking into account scale factor between canvas internal dimensions and CSS bounding client rect.
- **Profile Server Component Crash Fix**: Fixed runtime crash when rendering user MMO characters by removing invalid `onError` handler from Server Component.

### v1.4.1
- **MMO Architecture Phase 17 (Part 1)**: Transitioned from `GameSave` to a multi-character `GameCharacter` Prisma SQLite model.
- **Authoritative Server**: Scaffolded `game-server.js` using `socket.io` for synchronized movement and 4v4 Agility/Speed turn-based combat.
- **Character Creator**: Implemented `character-creator.tsx` with dynamic classes (Brawler, Invoker, Ranger, Artisan) setting preset skill levels.
- **Profile Integration**: Displayed active MMO characters on the public profile (`app/(main)/user/[username]/page.tsx`) with a "Play Now" launcher.

---



