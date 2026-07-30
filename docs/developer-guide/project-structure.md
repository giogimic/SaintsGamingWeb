# Developer Handbook & Project Structure

Welcome to the Saints Gaming codebase. This project represents a complex "Vertical Slice" — a fully playable MMO world that proves out the core engine systems.

## Execution Protocol
To contribute effectively to this repository, developers must adhere to the following strict rules:

1. **No Placeholders:** If a system is being built (e.g., Projectiles, Inventories), build it correctly the first time. Do not use `setTimeout` hacks; use the actual engine render loop (`requestAnimationFrame`).
2. **Server Authority:** Do not trust the client. If the client clicks a monster to attack, the server must validate range, cooldowns, and line of sight. Never make security decisions in React or Babylon.js.
3. **Editor First:** If you need to place a tree on the map to test woodcutting, **do not hardcode it** in the source files (e.g., `GameCanvasBabylon.tsx`). Open the Dev Editor overlay, paint the logic tile on Layer -1, and save the map to the database.

## Project Structure Overview

The project is structured as a Next.js 16 Application with a deeply embedded Node.js/Socket.io backend and a Babylon.js frontend.

- `/app`: The Next.js App Router containing standard web routes (Landing Page, Admin Panels) and the core `/(main)/game` route where the canvas lives.
- `/components`: React UI components.
  - `/components/game/ui`: The overlays that sit on top of the Babylon Canvas (Hotbars, Inventory, Target Frames, Turn-Based Battle Screen).
- `/game-engine`: The core game client logic.
  - `/game-engine/babylon`: The rendering pipeline (`BabylonEngine.ts`).
  - `/game-engine/state`: Zustand stores (`store.ts`) for managing UI state outside of the standard React render cycle to prevent performance bottlenecks.
- `/server`: The authoritative Node.js/Socket.io game server layer.
  - Handles the 20-tick-per-second physics simulation.
  - Validates all Socket intents (`combat_cast`, `move`).
- `/prisma`: Database schema and migration files. Contains the definitive data models for `User`, `GameCharacter`, `Map`, and `PlayerCreature`.
- `/scripts`: Deployment and automation scripts (e.g., `update.sh`, `setup.sh`). **Always use these for production deployments.**

## Current Development Roadmap (Demo World)

The current sprint is focused on achieving the complete "Demo World" vertical slice.

**Completed Phases:**
- Integration of Babylon.js 2.5D rendering pipeline.
- Zustand state management for hotbars and inventory.
- Server-authoritative WASD / Click-to-move interpolation.
- Strict logic grid and NPC collision.
- Real-Time Hotbar UI with Global Cooldowns.

**Active Development:**
- Server-Side Combat Math (Damage calculations, Miss/Crit rolls).
- Health Bars above dynamic map entities.
- Projectile FX flying across the 2.5D canvas.
- Turn-Based Creature Engine (State Machine, ARPG Damage formula, Capture Mechanics).
- Prisma Sync: Implementing periodic Hot-State to Cold-State database flushing.
