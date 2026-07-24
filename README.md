<div align="center">
  <h1>✨ Saints Gaming Web ✨</h1>
  <p><em>A modern, full-stack community management system.</em></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-13+-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Prisma-MariaDB-white?style=flat-square&logo=prisma" alt="Prisma" />
  </p>
</div>

<br />

> **Note:** Many features are currently in active development. This project is a learning endeavor and is not yet meant for production use. 🚀

---

## 🛠 Tech Stack

We've chosen a cutting-edge stack to ensure performance, type safety, and an incredible developer experience:

- **Framework:** Next.js 13+ (App Router) & React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS & shadcn/ui
- **Database:** Prisma ORM connected to MariaDB
- **Authentication:** NextAuth.js
- **Runtime:** Bun

---

## ✨ Features

- 🌓 **Modern UI:** Sleek, responsive design with built-in dark mode support.
- ⚡ **Performance:** Server-side rendering for blazing-fast load times.
- 🔒 **Secure Auth:** Seamless authentication with multiple providers.
- 💬 **Community Forums:** A fully featured, hierarchical forum system.
- 📰 **News & Announcements:** Keep your community updated effortlessly.
- 📊 **Status Monitoring:** Real-time server status tracking.
- 👤 **Rich Profiles:** Detailed user profiles and progression.
- 🛡️ **Admin Dashboard:** Comprehensive tools for community management.

---

## 🚀 Getting Started

Ready to explore? Follow these steps to get your local environment running.

### Prerequisites

Ensure you have the following installed:
- Node.js 18+ or Bun
- MariaDB 10.6+
- pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/saints-gaming-web.git
   cd saints-gaming-web
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure the environment:**
   ```bash
   cp .env.example .env
   ```
   *Don't forget to edit `.env` with your local database credentials.*

4. **Run migrations:**
   ```bash
   pnpm run migrate
   ```

5. **Start the magic:**
   ```bash
   pnpm run dev
   ```

---

## 🗄️ Database

This application relies on **MariaDB**. Please ensure your database server is running and accessible before starting the application.

---

## 💻 Development Commands

Here are some handy commands for your development workflow:

- `pnpm run dev` — Start the development server
- `pnpm run build` — Build the optimized production bundle
- `pnpm run start` — Start the production server
- `pnpm run lint` — Run ESLint to check code quality
- `pnpm run migrate` — Apply database migrations
- `pnpm run backup` — Safely backup your database
- `pnpm run restore` — Restore your database from a backup

---

## 🤝 Contributing

We love contributions! If you'd like to help out:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m '✨ Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is open-source and available under the **MIT License**.

---

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
- **Babylon.js 2.5D Engine & Integrated Dev Editor Foundation**: Installed `@babylonjs/core` and `@babylonjs/gui`. Removed legacy `cyber-terminal` orphan directory (fixing TS compilation), rebranded exports to `TheLobby` and `SaintsDexOverlay`, and scaffolded Babylon.js 2.5D billboard sprite engine and Integrated Dev Editor suite.

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

## ⚖️ License & Open Source Attribution

This repository incorporates open-source game assets, creature data, and campaign map layouts under GPLv3 and CC BY-SA 4.0 copyleft terms.

- **Tuxemon Project:** Monster designs, sprites, movesets, and campaign map data derived from [Tuxemon](https://www.tuxemon.org) / [GitHub](https://github.com/Tuxemon/Tuxemon). Licensed under GPL-3.0 / CC BY-SA 4.0.
- **Liberated Pixel Cup (LPC):** Base character sprites from [OpenGameArt.org](https://opengameart.org) (CC BY-SA 3.0 / GPL 3.0).
- **Full License Notice:** See [TUXEMON_ATTRIBUTION.md](file:///c:/Users/Matth/OneDrive/Desktop/Saints%20Web/TUXEMON_ATTRIBUTION.md) for full attribution details.

