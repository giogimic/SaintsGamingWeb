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
