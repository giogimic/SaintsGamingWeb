# Saints Gaming

> **Time To Play** — Welcome to the Saints Gaming community platform & game project!

Hey everyone! Welcome to the repository for **Saints Gaming**. 

I'm building this for our community. This is a passion project I build for fun in my spare time, designed to serve as our community's home base. It's a completely open-source hybrid that fuses a web forum with an in-browser multiplayer MMO!

---

## 🎮 What is Saints Gaming?

Saints Gaming started way back in 2007 as a chill group of friends hanging out on TeamSpeak, playing sandbox builders, and whatever else sounded fun. Over the years, our motto has always been simple: *Time To Play* — just hang out, game together, and have a good time with zero drama.

This project brings our community hub together with an interactive multiplayer game:

- **The Community Hub**: Forums to chat, news updates, and game server status trackers (so you can see who's online on our servers).
- **The Lobby (The Game)**: A browser-based multiplayer world where you can explore, build a Saint from a playable Archetype and modular Classes, grow long-term skills, collect Creatures, and fight Monsters with friends.
- **World Studio**: A built-in creator suite for Tile Maps, Voxel Maps, infinite procedural Fractal Domains, Archetypes, Classes, abilities, quests, dialogue, creatures, monsters, assets, and live world releases.
- **Combat**: Creature Battles are turn-based and capture-focused. Monster Battles are real-time, open-world action combat.

---

## 🏗️ Architecture

The project is built on a modern, full-stack monorepo architecture:

- **Web Frontend & API (Next.js)**: The core website, Studio tools, and API routes are built with Next.js 15, React 19, and TailwindCSS.
- **Database (Prisma)**: We use Prisma ORM connected to either MySQL or SQLite to manage all persistence (users, forum posts, game releases, and world data).
- **Game Engine (Babylon.js)**: The browser game client is powered by Babylon.js for rendering both 2.5D and 3D worlds, alongside a robust Redux/Zustand state layer.
- **MMO Server (Go)**: The authoritative multiplayer game backend (`the-lobby`) is written in Go, featuring a high-performance TCP/WebSocket layer, deterministic map routing, and SQLite snapshots for seamless runtime syncing.
- **Desktop App (Electron)**: A desktop wrapper wrapper located in `saints-app/` allowing standalone play.

---

## 📂 Repository Structure

- `app/` - Next.js App Router (pages, API routes, layout, Server Actions).
- `src/web/` - React components, hooks, UI elements (shadcn/ui), and frontend logic.
- `src/server/` - Backend services, Prisma configuration, setup logic, and game loop controllers.
- `src/engine/` - Shared game logic, rendering abstractions, Babylon.js controllers, and physics.
- `src/shared/` - Isomorphic types, constants, and utilities shared between client and server.
- `the-lobby/` - Authoritative Go MMO backend source code.
- `saints-app/` - Electron desktop application wrapper.
- `public/` - Static web assets, game sprites, and UI images.
- `prisma/` - Database schema (`schema.prisma`) and seed scripts.
- `docker/` - Docker Compose configurations and environment definitions.

---

## 🛠️ How to Install & Run Locally

If you want to poke around the code, run it on your own machine, or test things out:

### Prerequisites
- **Node.js** (v22 or newer recommended)
- **Git**
- **Docker** (optional, but highly recommended for full-stack DB/Redis/Go running)
- **Go** (v1.22+ if running the MMO server manually)

### Setup & Installation

Linux is the primary deployment target, but Windows is fully supported for local development.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/giogimic/SaintsGamingWeb.git
   cd SaintsGamingWeb
   ```

2. **Automated Setup (Recommended for Linux/WSL):**
   Run the unified setup script which handles `.env` generation, database initialization, Docker builds, and starting the stack.
   ```bash
   bash saints.sh setup
   ```
   *To update in the future, simply run `bash saints.sh update`.*

3. **Manual Setup (Windows/Node):**
   ```bash
   # Copy environment variables
   cp .env.example .env
   
   # Install dependencies
   npm install
   
   # Setup database (ensure SQLite or MySQL is configured in .env)
   npx prisma generate
   npx prisma db push
   
   # Run the development server
   npm run dev
   ```

Once running, navigate to [http://localhost:24001](http://localhost:24001) in your browser. Upon your first visit, you will be redirected to the Setup Wizard to initialize the admin account and generate the starting world.

### Important Development Commands

- `npm run dev` - Starts the Next.js development server on port 24001.
- `npm run build` - Compiles the Next.js production build and worker scripts.
- `npm run start` - Starts the Next.js production server.
- `npm run lint` - Runs ESLint.
- `npm run test` - Runs Vitest unit tests.
- `npm run test:e2e` - Runs E2E integration tests.
- `npm run dev:app` - Runs the Electron desktop client locally.

---

## 🚢 Deployment

The project is designed to be deployed primarily via Docker on Linux environments.

1. **Production Build:**
   ```bash
   npm run build
   ```
2. **Docker Compose:**
   The `docker-compose.yml` file defines the standard stack (Next.js Web, Redis, Go MMO Server).
   ```bash
   docker-compose up -d --build
   ```
3. **Caddy Reverse Proxy:**
   If using the `saints.sh` automated deployer, Caddy will be configured automatically to provision Let's Encrypt SSL certificates for your domain.

For remote Server Administrators, a setup wizard is accessible out of the box to configure the database connection, Discord OAuth, and generate the procedural world map seamlessly from a browser.

---

## ⚖️ Licensing & Dependencies

This project is a hybrid open-source repository (BSL-1.1). 
For a complete breakdown of third-party software, SDKs, and open-source library licenses, please read the [LICENSES.md](./LICENSES.md) file. 

---

## 📖 Documentation

If you are looking for **deep technical breakdowns**, engine architecture, and creator guides, please check out our interactive **Wiki** directly on the website once you have the app running, or navigate to the `/wiki` page on saintsgaming.net!

---

## 💬 Community & Links
Visit us at [saintsgaming.net](https://saintsgaming.net)

## Changelog

### v2.2.014
- **Embedded Animations Mapping Fix**: Fixed a critical issue where selecting embedded animations (inside the same `.glb` model) in the Asset Studio did not correctly map them to engine action slots (like `idle`, `run_fwd`). The engine now properly renames embedded animation clips on load so the animation state machine can find and trigger them.

### v2.2.013
- **Adjustable Camera Target Height**: Added an explicitly configurable `Camera Target Height Offset` parameter to the Asset Studio, solving the issue where cameras snapped to the ground or feet. The Engine now smoothly tracks the provided offset height rather than blindly using bounding boxes.

### v2.1.986
- **Setup Wizard:** Fixed a critical parsing bug where Windows CRLF line endings corrupted `.env` secrets during `saints.sh` setup, preventing Admin account creation.
- **Studio Ability Workspace:** Upgraded the Animation Row string input field into an intuitive visual dropdown selector for standard 2D Sprite Actions and 3D Model Slots.

### v2.1.985
- **Studio Audit & Menus:** Added Audit Check to StudioMenuBar; officially deprecated the 2D Animation Studio and Spawn Editor in favor of 3D GLB capabilities.
- **UI Coherence:** The Navbar and Global Bottom Bar automatically hide when editing; integrated 3D empty Mesh placeholder rendering.
- **Cleanup:** Purged legacy SA-MP/FiveM/UCP references across project.

### v2.1.991
- **Settings Audit:** Cleaned up client settings schema to use correct camera profiles (dynamic, irstperson, ollow45, isometric).
- **Jargon Removal:** Removed military/sci-fi jargon ("Move Operative", "World Map Radar") from the keybinds menu, strictly adhering to the Saints Gaming laid-back MMO theme.
- **Procedural Generation Fix:** Fixed an issue where procedural/fractal maps would repeatedly request chunks on the client by correctly updating the `WorldStreamer` chunk residency state to `MESHED`.
- **Character Creator:** Improved asset studio sorting to automatically categorize modular clothing/hair based on filenames and updated character creator to display human-readable names for custom modular items.
- **Rendering & Viewport fixes:** Fixed mobile browser bottom cutoff by updating viewport scaling to `100dvh` and clamped max zoom out to 15 in dynamic/ortho modes.
