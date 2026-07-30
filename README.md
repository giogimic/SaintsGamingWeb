<div align="center">
  <h1>✨ Saints Gaming Engine ✨</h1>
  <p><em>A modern, full-stack community management system and 2.5D MMO game engine.</em></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-13+-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Prisma-MariaDB-white?style=flat-square&logo=prisma" alt="Prisma" />
  </p>
</div>

<br />

## What is Saints?
Saints Gaming is an ambitious project combining a full web platform (forums, administration, social features) with an embedded, real-time multiplayer 2.5D MMO engine. The project is strictly server-authoritative and features a powerful in-game object/map editor.

## Core Features
- **Authoritative MMO Server:** Secure, real-time socket communication utilizing dynamic sharding and instancing.
- **2.5D WebGL Renderer:** Powered by Babylon.js with an orthographic camera and classic sprite projection.
- **Dual Combat Engine:** Real-Time MMO combat in the overworld, seamlessly transitioning to Instanced Turn-Based Encounters for creature capturing.
- **Integrated Tooling:** Live map editing and configuration without leaving the game client.
- **Generic Entity Framework:** Extendable systems for creatures, items, and quests.

## Tech Stack
- **Framework:** Next.js 15+ (App Router) & React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS & shadcn/ui
- **Database:** Prisma ORM connected to MariaDB
- **Game Engine:** Custom Babylon.js 2.5D wrapper
- **Multiplayer:** Socket.io

## Deployment & Setup

**IMPORTANT**: To completely eliminate human error and manage the production server safely, **use the provided automation scripts**. They automatically handle Node.js environments, dependencies, database backups, and reverse proxies (Caddy) using Docker. Do not manually run `npm install` on your production server.

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

*(For manual local development without Docker, refer to [Installation Guide](docs/developer-guide/installation.md)).*

## Documentation
The `docs/` folder contains the ultimate source of truth for the engine's architecture:
- **[Game Vision & GDD](docs/vision/game-idea.md)**
- **[Architectural Overview](docs/architecture/overview.md)**
- **[Networking & Server Authority](docs/architecture/networking.md)**
- **[Database & Hot/Cold State](docs/architecture/database.md)**
- **[The Game Loop & Combat Engine](docs/architecture/game-loop.md)**
- **[World Building & Map Editor](docs/developer-guide/world-building.md)**
- **[Project Structure & Developer Guide](docs/developer-guide/project-structure.md)**

## License
- **Code:** Private / proprietary until stated otherwise.
- **Assets:** Tuxemon assets and LPC sprites are licensed under GPL-3.0 / CC BY-SA 4.0. See `docs/TUXEMON_ATTRIBUTION.md` for details.
