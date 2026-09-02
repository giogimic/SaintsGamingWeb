# Saints Gaming Web (`saints-gaming-web`)
### Full-Stack Community Management System & Embedded 2.5D MMORPG Engine

Saints Gaming: Time To Play. The `saints-gaming-web` project is a full-stack community management system combined with an embedded 2.5D massively multiplayer online (MMO) game engine.

Originating as a laid-back gaming community on TeamSpeak and SAMP in 2007, this project solves the fragmentation of modern online gaming communities by unifying discussion forums, player support tools, content distribution, and real-time multiplayer browser gaming into a single integrated platform.

The core technology stack is built on Next.js 15, React 19, TypeScript, Prisma ORM, Socket.io, and Babylon.js WebGL, with an optional Go socket server for high-throughput spatial multiplayer networking.

---

- **Repository:** [giogimic/SaintsGamingWeb](https://github.com/giogimic/SaintsGamingWeb)
- **Live Platform:** [https://saintsgaming.net](https://saintsgaming.net)
- **AI & LLM Context:** [`llms.txt`](llms.txt)
- **License:** [Business Source License 1.1 (BSL-1.1)](LICENSE)
- **Release Version:** `v2.1.665`
- **Lead Developer:** **GioGimic**
- **Community Discord:** [discord.saintsgaming.net](https://discord.saintsgaming.net)

---

## 1. What This Project Does

Saints Gaming brings together web community management and live multiplayer gaming in a single codebase and server process:

1. **2.5D Browser MMORPG (`/lobby`)**: A top-down WebGL multiplayer game built with Babylon.js. Players explore open maps, level up across a 27-skill progression system, engage in real-time PvE monster battles and turn-based collection battles, complete quests, and trade items.
2. **In-Engine World Studio (`/studio`)**: A live in-browser level design suite for painting dual-grid visual and collision map layers, placing NPC spawners, writing dialogue trees, configuring loot tables, and playtesting maps in real time without restarting servers.
3. **The Nexus Operations Hub (`/hub`)**: A unified interface combining community news articles, downloadable modpacks and graphical enhancements, and live 24/7 dedicated server monitors with ping meters and one-click connection details.
4. **Social & Communication Layer**: An end-to-end encrypted floating messenger drawer, a short-form video feed with sound stem playback, and high-performance discussion forums.
5. **Unified Economy & FiveM Integration**: A global gold standard linked to physical in-game banks, alongside a FiveM User Control Panel (UCP) for GTA V roleplay character management and banking.

---

## 2. Technical Architecture & Component Roles

### Frontend Web Layer
- **Framework**: Next.js 15 App Router with React 19 and TypeScript.
- **Rendering Strategy**: React Server Components for fast initial data loading and SEO indexing; client-side React components for interactive interfaces.
- **Styling**: Tailwind CSS with custom glassmorphism design tokens (`sg-glass`) and consistent dark mode aesthetics.

### 2.5D Game Engine
- **Renderer**: Babylon.js rendering an orthographic 2.5D camera perspective on an HTML5 WebGL canvas.
- **Separation of Concerns**: Canvas rendering loops are decoupled from React UI components. Game state is stored in lightweight Zustand stores (`useGameStore`) to ensure consistent 60 FPS gameplay without unnecessary React re-renders.
- **Audio Engine**: Procedural WebAudio synthesizer (`SoundSynthEngine`) generating sound effects for gathering, combat, and UI interactions without external audio assets.

### Multiplayer Realtime Networking
- **Development Realtime**: Built-in Socket.io running alongside Next.js in a single process (`server.ts`) on port 3000.
- **Production Realtime**: Standalone Go MMO server (`the-lobby/`) on port 3001 featuring spatial Area of Interest (AOI) grid partitioning, binary movement delta compression, and client prediction with server reconciliation.

### Persistence & Data Access
- **ORM**: Prisma ORM with automated migrations and seed routines.
- **Database Engine**: MariaDB / MySQL (integrated Docker or external host).
- **Authentication & RBAC**: Auth.js (NextAuth v5) supporting credentials and session authentication with numeric role tiers from Lurker (0) to Developer (1000).

### Responsive-First Social Data Architecture & Traffic Control
- **In-Flight Request Coalescing (`coalesceAsync`)**: Concurrent identical requests (e.g. server status sweeps, GameDig UDP probes) share a single executing promise, converting 10 parallel queries into 1 operation.
- **Sliding-Window Rate Limiting**: Centralized per-user and per-IP rate limiters with HTTP 429 standard headers (`Retry-After`, `X-RateLimit-*`) protecting mutations and queries.
- **Zero-Refetch Mutation Lifecycle**: Social actions (post creation, poll voting, pinning, creator subscriptions, replies) update client state directly in 0ms, eliminating post-mutation full-feed database queries.
- **Client-Side SWR In-Memory Feed Cache (`useSocialFeedStore`)**: Global Zustand memory store caching social feeds, tabs, and filters for instant 0ms transitions and seamless background revalidation.
- **Real-Time State Synchronization**: Socket.io event-driven broadcasts (`social.post.reacted`, `social.reply.created`) deliver live like increments and incoming replies without full-page reloads.
- **Visibility-Aware Polling & In-Flight Abort**: Background polling automatically suspends when browser tabs are hidden, and stale search requests are cancelled immediately via `AbortController`.

---

## 3. Directory Layout

```text
saints-gaming-web/
├── app/                        # Next.js 15 App Router pages, layouts, and server actions
│   ├── (main)/                 # Main platform routes (Home, The Nexus, Forums, Streams, Lobby, Studio)
│   ├── (ucp)/                  # FiveM User Control Panel routes
│   ├── actions/                # Server Actions for authentication, game state, and forums
│   ├── api/                    # REST API endpoints and internal Go MMO sync webhooks
│   └── llms.txt/               # Plaintext route serving machine-readable context
├── src/
│   ├── engine/                 # Babylon.js WebGL game loop and WebAudio synthesizers
│   ├── server/                 # Socket.io realtime bridge and Node.js game loop
│   ├── shared/                 # Shared components (Navbar, GlobalBottomBar, AmbientBackground)
│   └── web/                    # Client components, Zustand stores, and in-game HUD overlays
├── the-lobby/                  # Standalone Go realtime MMO socket server
├── docs/                       # Comprehensive technical manuals and game systems documentation
├── prisma/                     # Database schema definitions and seed scripts
├── llms.txt                    # Plaintext project summary for AI crawlers and agents
└── scripts/                    # Automation scripts for setup, testing, and asset syncing
```

---

## 4. Local Installation & Development

### Prerequisites
- **Node.js**: Version 22.13.0 or higher
- **npm** or **pnpm**
- **Go** (optional, required only for running the standalone Go MMO server)

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/giogimic/SaintsGamingWeb.git
cd SaintsGamingWeb

# 2. Run automated setup (copies .env.example, generates Prisma client, initializes database)
npm run setup

# 3. Start the unified development server (Next.js + Socket.io + Game Engine on :3000)
npm run dev

# 4. (Optional) Start the Go MMO realtime server on :3001
./the-lobby/scripts/setup-the-lobby.sh --full

# 5. Run the automated test suite
npm test
```

Once started, open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 5. Technical Documentation & Guides

For deep technical specifications, mathematical formulas, and developer guides:

- **[Game Systems Architecture](docs/game-systems/architecture-and-loop.md)**: WebGL loop, movement interpolation, and decoupled HUD architecture.
- **[Skills & Progression](docs/game-systems/skills-and-progression.md)**: 27-skill proficiency formulas, gathering mechanics, and max capes.
- **[Networking & Multiplayer](docs/game-systems/networking-and-multiplayer.md)**: Go socket server, AOI interest management, and binary movement codecs.
- **[Studio Level Editor Guide](docs/studio/studio-architecture.md)**: Dual-grid painting, entity placers, and live catalog tooling.
- **[In-App Wiki Portal](https://saintsgaming.net/wiki)**: Searchable documentation browser built into the platform.

---

## 6. Community & Licensing

- **Live Website:** [SaintsGaming.net](https://SaintsGaming.net)
- **Discord:** [discord.saintsgaming.net](https://discord.saintsgaming.net)
- **Repository:** [giogimic/SaintsGamingWeb](https://github.com/giogimic/SaintsGamingWeb)
- **Author & Copyright Holder:** **GioGimic**
- **License:** Licensed under the [Business Source License 1.1 (BSL-1.1)](LICENSE). Free for personal, non-commercial, educational, and community self-hosting use. Commercial distribution or hosted commercial services require prior authorization from the author.
- **Copyright:** © 2007–2026 Saints Gaming Network. All rights reserved.
