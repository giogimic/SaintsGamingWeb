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



