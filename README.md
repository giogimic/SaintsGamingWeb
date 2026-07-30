### 2.1.75
- **MMO Integration**: Successfully hooked up the internal `PlayerManager` inside `server.ts` to the `/api/game/server-status` endpoint. The Server Select UI now instantly reflects the true online status of the Next.js hosted engine without pinging legacy ports.
- **Map Editor Accessibility**: Restored the \` (Backtick) global hotkey allowing Developers to seamlessly toggle the Integrated Dev Editor directly in-game while live multiplayer syncing remains active.

### 2.1.74
- **Ultimate UI Hotfix**: Changed the inline style property from `minHeight` to `height: calc(100vh - 7rem)` on the Lobby wrapper to ensure percentage-based child heights (`h-full`) resolve correctly, fixing the persistent 0-height container collapse.

### 2.1.73
- **Critical UI Hotfix**: Switched the `min-h-[calc(100vh-7rem)]` class to an inline `style` property on the Lobby wrapper to guarantee the browser correctly renders the game container height immediately, bypassing potential Next.js Tailwind JIT compilation delays.
- **Canvas Duplicate Fix**: Removed a duplicate `GameCanvasBabylon` component that was rendering over the active canvas and potentially crashing the WebGL context.

### 2.1.72
- **UI Hotfix**: Reverted flexbox restructuring in the Next.js layouts and opted for a safer explicit `min-h-[calc(100vh-7rem)]` approach to prevent the game canvas from collapsing or hiding entirely behind the layout structure.

### 2.1.71
- **UI & Layout Fix**: Fixed a CSS Flexbox bug that caused the game canvas to collapse into a tiny sliver on the Lobby page. Ensured the Next.js `main` layout propagates 100% height to the absolute positioned canvas wrapper.
- **AI Rules Update**: Incorporated the Gameplay Bible's strict core philosophy into the AI instructions, mandating that future agent implementations enforce server authority and respect the game's social and creative identity.

### 2.1.70
- **MMO Sharding Integration:** Upgraded Game Server to dynamically spin up instance channels (Ch.1, Ch.2, etc.) based on population limits (max 50 players/shard).
- **Socket Grid Isolation:** Integrated `WorldManager` with `PlayerManager` so that server physics and broadcasts are perfectly isolated to specific instance channels.
- **MMO Player Defeat Flow:** Implemented player health and death logic. When a player's HP reaches 0, they are safely teleported to Saints Village, bypassing permanent death.
- **Aggressive Combat AI:** Creatures whose health falls below 50% now enter an `ENRAGED` state and will retaliate using Area of Effect (AoE) attacks against players in range.

### 2.1.69
- **MMO Combat & AI**: Transformed legacy combat into a real-time MMO system. Added generic CreatureManager, EncounterManager, server-authoritative wandering AI, real-time capture action logic in CombatManager, Babylon.js Selection Rings, and visual projectile arcs.

### 2.1.68
- **Babylon.js RPG Engine Audit**: Minor code review and preparatory refactoring for the Babylon.js engine (`GameCanvasBabylon.tsx`, `maps.ts`, `store.ts`, `BabylonEngine.ts`, and `WorldSimulation.ts`).

### 2.1.67
- **UI & Input Refinement**: Fixed WASD movement bug, added touch device detection to hide mobile controls on desktop, and introduced a unified Game Options menu (ESC) to replace scattered UI buttons.

### 2.1.66
- **Hotfix**: Fixed an invalid React hook declaration in the Inventory UI that was causing Next.js production builds to fail.

### 2.1.65
- **UI/UX Overhaul for The Lobby**: Implemented full cinema mode layout to bypass main site navbar/footer.
- **MMO Mechanics**: Unified keyboard WASD movement with Joystick pathfinding logic to prevent double-jumps.
- **UI Polish**: Fixed 'long-faced' classic panels by adopting a wider, dual-pane inventory system. Added strict viewport bounds to DraggablePanel.

<div align="center">
  <h1>✨ Saints Gaming Web ✨</h1>
  <p><em>A modern, full-stack community management system and 2.5D MMO game server.</em></p>
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
- **Game Engine:** Custom 2.5D Babylon.js implementation
- **Multiplayer:** Socket.io

---

## 📚 Documentation

For detailed technical guides and setup instructions, please refer to the `docs/` folder:

- [Setup & Deployment Guidelines](./docs/setup.md)
- [System Architecture](./docs/architecture.md)
- [Tuxemon MMO Integration](./docs/tuxemon-integration.md)

---

## ✨ Features

- 🌓 **Modern UI:** Sleek, responsive design with built-in dark mode support.
- ⚡ **Performance:** Server-side rendering for blazing-fast load times.
- 🔒 **Secure Auth:** Seamless authentication with multiple providers.
- 🎮 **2.5D MMO:** Integrated real-time multiplayer game world within the browser.
- 💬 **Community Forums:** A fully featured, hierarchical forum system.
- 🛡️ **Admin Dashboard:** Comprehensive tools for community and game management.

---

## 📝 Changelog

Please see [CHANGELOG.md](./CHANGELOG.md) for a detailed history of updates and releases.

---

## ⚖️ License & Open Source Attribution

This repository incorporates open-source game assets, creature data, and campaign map layouts under GPLv3 and CC BY-SA 4.0 copyleft terms.

- **Tuxemon Project:** Monster designs, sprites, movesets, and campaign map data derived from [Tuxemon](https://www.tuxemon.org) / [GitHub](https://github.com/Tuxemon/Tuxemon). Licensed under GPL-3.0 / CC BY-SA 4.0.
- **Liberated Pixel Cup (LPC):** Base character sprites from [OpenGameArt.org](https://opengameart.org) (CC BY-SA 3.0 / GPL 3.0).
- **Full License Notice:** See [TUXEMON_ATTRIBUTION.md](./TUXEMON_ATTRIBUTION.md) for full attribution details.
