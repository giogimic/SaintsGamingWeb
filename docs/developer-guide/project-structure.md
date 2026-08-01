# Developer Handbook & Project Structure

Welcome to the Saints Gaming codebase. This project represents a complex "Vertical Slice" — a fully playable MMO world that proves out the core engine systems.

## Execution Protocol
To contribute effectively to this repository, developers must adhere to the following strict rules:

1. **No Placeholders:** If a system is being built (e.g., Projectiles, Inventories), build it correctly the first time. Do not use `setTimeout` hacks; use the actual engine render loop (`requestAnimationFrame`).
2. **Server Authority:** Do not trust the client. If the client clicks a monster to attack, the server must validate range, cooldowns, and line of sight. Never make security decisions in React or Babylon.js.
3. **Editor First:** If you need to place a tree on the map to test woodcutting, **do not hardcode it** in the source files (e.g., `GameCanvasBabylon.tsx`). Open the Dev Editor overlay, paint the logic tile on Layer -1, and save the map to the database.

## Project Structure Overview

The project is structured as a Next.js 15+ Application (App Router) with an integrated Socket.io backend and a custom 2.5D Babylon.js renderer frontend.

- `/app`: Next.js App Router containing web pages, admin tooling, user control panel (`(ucp)`), and the primary game route `/(main)/lobby`.
- `/src/web/components/the-lobby/`: The main lobby & web game UI system:
  - `index.tsx`: Main lobby orchestrator & Socket.io event connections.
  - `store.ts`: Zustand store for state management (`player`, `otherPlayers`, `activeBattle`, `logicTiles`).
  - `babylon/GameCanvasBabylon.tsx`: Babylon.js 2.5D WebGL canvas integration.
  - `MobileGameLauncher.tsx`: Dedicated mobile launcher overlay for device fullscreen mode.
  - `dpad.tsx`: Directional touch D-Pad (bottom-left) and Action Control Pad (bottom-right).
  - `character-selector.tsx` & `character-creator.tsx`: Hero selection and customization screens.
  - `ServerSelect.tsx`: Realm connection selector and dev server manager.
  - `editor/`: Saints Studio map & logic tile editor.
  - `chat/GameChat.tsx`: Multi-channel chat UI (Public, Global, Clan, Friends).
- `/src/server/`: The authoritative Socket.io game server layer:
  - `GameEngine.ts`: 20 TPS simulation and 10 TPS network broadcast clock.
  - `PlayerManager.ts`: Player state tracking, input queueing, pre-join cleanup, and position flushing.
  - `SocketHandler.ts`: Socket connection handling, JWT session auth, combat, and chat routing.
  - `WorldManager.ts`: Map definition loading, dynamic sharding, instance management, and collision checks.
  - `PartyManager.ts`: Party creation, invites, and clan chat routing.
- `/src/engine/`: Custom game client algorithms:
  - `BabylonEngine.ts`: 2.5D orthographic camera, sprite sheet rendering, damage numbers, and projectile FX.
  - `WorldSimulation.ts`: Client movement prediction and step tile trigger actions.
- `/prisma`: Database schema and migration files. Defines models for `User`, `GameCharacter`, `StarterHero`, `MapData`, and `GameServer`.
- `/scripts`: Deployment and automation scripts (`update.sh`, `setup.sh`, `release.mjs`).

## Current Development Roadmap

**Completed Features & Infrastructure:**
- Custom 2.5D Babylon.js WebGL orthographic rendering engine with 96x128px LPC/Tuxemon 4-directional sprite sheet mapping.
- Server-authoritative movement with sequence reconciliation (`move_ack` / `position_correction`).
- Mobile Touch Launcher (`MobileGameLauncher.tsx`) with device fullscreen API, continuous D-Pad, and Touch Action Pad.
- Multi-channel real-time chat (Local, Global, Party, System) with overhead speech bubbles.
- Saints Studio Starter Hero Editor with archetype presets and database persistence.
- Live Studio Realm Server Controls (Start, Stop, Real-Time Player Metrics).
- Dynamic sharding and instance management for public maps and private player bases.
