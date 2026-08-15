<div align="center">
  <h1>✨ Saints Gaming Engine ✨</h1>
  <url>https://SaintsGaming.net</url>
  <p><em>A modern, full-stack community management system and 2.5D MMO game engine.</em></p>
  <p>
    <img src="https://img.shields.io/badge/Version-v2.1.237-purple?style=flat-square" alt="Version" />



    <img src="https://img.shields.io/badge/Next.js-15+-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Babylon.js-2.5D-orange?style=flat-square&logo=babylonjs" alt="Babylon.js" />
    <img src="https://img.shields.io/badge/Prisma-SQLite%2FMariaDB-white?style=flat-square&logo=prisma" alt="Prisma" />
  </p>
</div>

<br />

## What is Saints?
Saints Gaming is an ambitious web platform combining community management (forums, user control panel, support desk) with an embedded, real-time multiplayer 2.5D MMO engine. The game features strict server authority, dynamic sharding, creature turn-based encounters, a real-time overworld combat engine, and an integrated in-game Studio Map & Hero Editor.

## Core Features
- **Authoritative MMO Server:** Real-time socket communication via Socket.io with dynamic sharding, player reconciliation, line-of-sight calculation, and automatic pre-join entity cleanup.
- **2.5D WebGL Renderer:** Custom Babylon.js orthographic renderer with standard 96x128px LPC/Tuxemon 4-directional sprite sheet projection, damage numbers, and floating health bars.
- **Mobile Touch Game Mode & Fullscreen Launcher:** Dedicated `MobileGameLauncher.tsx` overlay triggering device `requestFullscreen()` with continuous D-Pad movement (bottom-left) and a multi-action Touch Pad (`[⚡ INTERACT]`, `[🎒 BAG]`, `[⚔️ SKILLS]`, `[💬 CHAT]`, `[⚙️ MENU]`, `[⛶ FULLSCREEN]`).
- **Saints Studio Starter Hero Editor:** Live Studio dock panel for creating, previewing, generating archetypes, and managing starter hero configurations persisted directly to the database.
- **Real-Time Local & Global Chat:** Multi-channel chat UI (Public, Global, Clan/Party, Friends) with server-side broadcasting and overhead chat bubbles.
- **Active Studio Server Controls:** In-Studio dashboard tab for starting/stopping realm server processes and monitoring live player metrics.
- **Dual Combat System:** Real-Time overworld combat with skill progression, seamlessly transitioning to Instanced Turn-Based Creature Encounters.

## Tech Stack
- **Framework:** Next.js 15+ (App Router) & React 19
- **Language:** TypeScript (Next.js) & **Go** (Realtime MMO under `go-mmo/`)
- **Styling:** Tailwind CSS & Vanilla CSS Design Tokens
- **Database:** Prisma ORM (SQLite / MariaDB)
- **Game Engine:** Custom Babylon.js 2.5D Wrapper (`BabylonEngine.ts`)
- **Multiplayer:** Socket.io — **Go** on `:3001` (Required). Next `server.ts` is retained only as an emergency fallback (`ENABLE_TS_GAME_ENGINE=1`).

## Deployment & Setup

**IMPORTANT**: To manage the production environment safely, **use the provided automation scripts**. They handle Node.js environments, dependencies, database backups, and reverse proxies (Caddy) using Docker. Do not manually run `npm install` on your production server.

### 1. Initial Setup
Run the interactive setup script to configure credentials and launch the environment:
```bash
./scripts/setup.sh
```

### 2. Updating the Server
To pull the latest code, backup the database, rebuild containers, and restart gracefully:
```bash
./scripts/update.sh
```

### 3. Go MMO (Live Production Server)
`./scripts/setup.sh` automatically configures the Go MMO backend. This is required for realtime play. It sets `NEXT_PUBLIC_GO_MMO_URL`, starts the high-performance Go socket server on `:3001`, and optionally adds a `go.` Caddy subdomain.

```bash
# Standalone / re-run
./go-mmo/scripts/setup-go-mmo.sh --full
# Existing Caddy only: ./scripts/dev-proxy.sh add go.yourdomain 3001
```

**Note**: The Go MMO backend is now the fully featured, production-ready live server handling all character persistence (SQLite), socket networking, dynamic encounters, dialogue trees, combat formulas, and real-time multiplayer states. The Next.js API continues to serve as the Studio editor persistence layer (`/api/maps`), which automatically hot-reloads via internal webhooks to Go.

*(Local install notes and internal architecture docs live in the private `.docs/` tree on developer machines — not published to this repo.)*

## Documentation
- **[Changelog](CHANGELOG.md)** — release history  
- **[Asset attribution](docs/TUXEMON_ATTRIBUTION.md)** — Tuxemon / LPC licensing  
- Package READMEs (e.g. `go-mmo/README.md`) for optional subsystems  

Gameplay bibles, Studio contracts, and day-to-day handoff notes are **local-only** under `.docs/` (gitignored).

## License
- **Code:** Private / proprietary until stated otherwise.
- **Assets:** Tuxemon assets and LPC sprites are licensed under GPL-3.0 / CC BY-SA 4.0. See `docs/TUXEMON_ATTRIBUTION.md` for details.
