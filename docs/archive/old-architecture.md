# System Architecture

Saints Gaming Web is built using a modern full-stack ecosystem designed to support a robust web community alongside a real-time multiplayer 2.5D game engine.

## Core Technologies

- **Framework**: Next.js (App Router) & React
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS & shadcn/ui components
- **Database**: MariaDB accessed via Prisma ORM
- **Runtime**: Node.js or Bun

## MMO Game Server (Socket.io)

The real-time multiplayer engine is powered by an authoritative Node.js server running Socket.IO.
- Located in `game-server.js`.
- It handles synchronized movement, chat broadcasts (`MAP`, `WORLD`, `PARTY`, `FRIENDS`), and multi-player party state.
- Client-side connections are managed in the global React `useGameStore` utilizing Zustand.

## In-Game Development Tools

The project contains a built-in "Integrated Dev Editor" accessible to site administrators. 
- Allows real-time world-building inside the 2.5D BabylonJS engine.
- Supports instant tile painting, collision boundary setup, RPG node spawning, and NPC placement.
- Allows direct extraction and export of map grid data to the database.

## Web Community Hub

The website acts as a hub for the entire community:
- Fully featured, hierarchical forum system for discussions.
- Rich user profile pages displaying live stats, progression, inventory, and pinned game companions.
- Public leaderboards ranking characters by overall 27-skill XP, combat level, economy credits, and total species captured.
