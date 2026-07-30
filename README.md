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

## Screenshot
*(Insert gameplay or engine screenshot here)*

## What is Saints?
Saints Gaming is an ambitious project combining a full web platform (forums, administration, social features) with an embedded, real-time multiplayer 2.5D ORPG engine. The project is split into a reusable core engine and game-specific implementations (e.g., Tuxemon integration).

## Core Features
- **Authoritative MMO Server:** Secure, real-time socket communication utilizing sharded instance channels.
- **2.5D WebGL Renderer:** Powered by Babylon.js with an orthographic camera and classic sprite projection.
- **Integrated Tooling:** Live map editing and configuration without leaving the game client.
- **Social Ecosystem:** Fully featured forum system, friend lists, and cross-platform presence.
- **Generic Entity Framework:** Extendable systems for creatures, items, and quests.

## Tech Stack
- **Framework:** Next.js 13+ (App Router) & React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS & shadcn/ui
- **Database:** Prisma ORM connected to MariaDB
- **Game Engine:** Custom Babylon.js 2.5D wrapper
- **Multiplayer:** Socket.io

## Project Structure
The repository is strictly divided to maintain a clean boundary between engine logic, shared components, and game content:
- `src/engine/` - Core engine logic (Networking, Renderer, Input, UI systems)
- `src/game/` - Saints Gaming content (Creatures, Maps, Quests)
- `src/editor/` - In-game map and database editor components
- `src/shared/` - Shared UI and utilities
- `src/server/` - Socket.io authoritative game server

## Getting Started
Please refer to the [Getting Started Guide](docs/getting-started/installation.md) for full instructions on setting up the database, Next.js environment, and Socket.io server.

## Documentation
The `docs/` folder contains the ultimate source of truth for this project:
- **[Architecture](docs/architecture/overview.md)**
- **[Gameplay](docs/gameplay/combat.md)**
- **[Editor Tools](docs/editor/maps.md)**
- **[Developer Reference](docs/reference/developer-handbook.md)**

## Roadmap
Check [Current Phase](docs/roadmap/current-phase.md) to see what we are currently building, or view the [Backlog](docs/roadmap/backlog.md) for planned features.

## Contributing
We welcome contributions! Before submitting PRs, please read the [Developer Handbook](docs/reference/developer-handbook.md) and adhere to our coding conventions.

## License
- **Code:** Private / proprietary until stated otherwise.
- **Assets:** Tuxemon assets and LPC sprites are licensed under GPL-3.0 / CC BY-SA 4.0. See [docs/TUXEMON_ATTRIBUTION.md](docs/TUXEMON_ATTRIBUTION.md) for details.
