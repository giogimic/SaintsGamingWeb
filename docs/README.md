<div align="center">

# 📖 Saints Gaming Documentation & Engine Wiki
### *Technical Specification, 2.5D Game Architecture & Studio Manual*

🌐 **Official Portal:** [**SaintsGaming.net**](https://SaintsGaming.net) &nbsp;•&nbsp; 🕹️ **Repository:** [**giogimic/SaintsGamingWeb**](https://github.com/giogimic/SaintsGamingWeb) &nbsp;•&nbsp; 📄 **AI Index:** [`llms.txt`](../llms.txt) &nbsp;•&nbsp; 👤 **Author:** **GioGimic** &nbsp;•&nbsp; 📦 **Release:** `v2.1.535`

---

</div>

Welcome to the **Saints Gaming Platform & Game Engine Technical Documentation** (`saints-gaming-web`). This comprehensive handbook details the internal mechanics, WebGL rendering pipeline, networking protocols, combat algorithms, database schemas, and live World Studio editor architecture powering the Saints Gaming web and MMO ecosystem.

> [!TIP]
> **Browse the Interactive Web Wiki at [`/wiki`](https://saintsgaming.net/wiki)** — The full documentation is integrated into the web application as a searchable, categorized knowledge portal with table of contents navigation, code snippets, and `Ctrl+K` instant search.

---

## 🗺️ Documentation Directory & Architecture Index

### 📚 [Wiki Portal (`/wiki`)](https://saintsgaming.net/wiki)
The unified interactive wiki portal provides real-time search, category browsing, and syntax-highlighted guides for developers and players alike.

---

### 🎮 [Game Systems Documentation](game-systems/README.md)
Deep-dive specifications for core gameplay mechanics, simulation loops, and runtime engine systems:
- **[Architecture & Core Loop](game-systems/architecture-and-loop.md)**: WebGL 2.5D Babylon.js orthographic renderer, tick rate, movement sub-frame interpolation, and decoupled React UI architecture.
- **[27-Skill Progression & Master Capstones](game-systems/skills-and-progression.md)**: Combat, Gathering, Artisan, and Support proficiencies, XP scaling curves, and Grandmaster Max Capes.
- **[Combat & Encounter Systems](game-systems/combat-and-encounters.md)**: Real-time overworld monster encounters, instanced turn-based creature battles, action hotbars, and status ailments.
- **[Networking & Hybrid Go MMO Backend](game-systems/networking-and-multiplayer.md)**: Go `:3001` socket server, Area of Interest (AOI) spatial management, shard orchestration, and MariaDB/MySQL state persistence.
- **[Economy, Items & Loot](game-systems/items-and-economy.md)**: Equipment slots, crafting matrices, procedural loot drop tables, and in-world bank exchange systems.
- **[Mobile Touch Mode & UI](game-systems/mobile-and-ui.md)**: Responsive mobile touch controls, HUD dock layout presets, mini-map radar, and WebAudio synthesizer.

---

### 🛠️ [Studio Editor Documentation](studio/README.md)
Comprehensive technical manuals for the in-engine creator toolset (`/studio`):
- **[Studio Architecture & Modes](studio/studio-architecture.md)**: Docking shell, Zustand state stores, Paint / Populate / Script / Catalog / Playtest modes.
- **[Dual-Grid Tile Painting & Map Building](studio/tile-painting-and-maps.md)**: Visual GID atlas layers, logic collision flags, brush tools, and auto-remeshing.
- **[Entity & NPC Placers](studio/entities-and-npcs.md)**: Spawners, NPC interactions, sprite configurations, and interactive dialogue trees.
- **[Catalogs & Definition Editors](studio/catalogs-and-definitions.md)**: In-engine visual management suites for Creatures, Items, Hero Classes, Quests, and Loot Tables.
- **[Map Validation, Sync & Playtesting](studio/validation-sync-playtest.md)**: Internal sync webhooks to Go MMO, map schema validators, and zero-downtime Play-In-Editor (PIE).

---

### 🌐 [Wiki Knowledge Base](wiki/)
Canonical documentation structure matching the live in-app wiki:
- **[Getting Started](wiki/getting-started/)**: Platform overview, local development setup, and technology stack breakdown.
- **[Game Systems](wiki/game-systems/)**: Game loop, skills, combat, economy, and networking.
- **[World Studio](wiki/studio/)**: Studio architecture, tile painting, entities, catalogs, and asset pipelines.
- **[Creator Guide](wiki/creator-guide/)**: Custom hero creation, monster balance, dialogue authoring, and world design.
- **[API & Reference](wiki/api-and-reference/)**: Prisma database schema, REST API endpoints, and technical glossary.

---

## 🎯 About the Platform & Technology

**Saints Gaming** ([SaintsGaming.net](https://SaintsGaming.net)) is an open gaming community and full-stack platform created by **GioGimic**, fusing modern web technologies (Next.js 15, React 19, TypeScript, Prisma ORM) with a high-performance 2.5D browser MMORPG engine (Babylon.js WebGL, Go realtime daemon).

For questions, contributions, or suggestions, join our community on [Discord](https://discord.saintsgaming.net) or submit pull requests on [GitHub](https://github.com/giogimic/SaintsGamingWeb).
