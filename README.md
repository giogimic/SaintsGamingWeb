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

## 📜 Changelog

### v1.6.2
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
