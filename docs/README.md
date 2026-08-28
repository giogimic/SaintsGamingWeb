<div align="center">

# 📖 Saints Gaming Documentation Wiki
### *Technical Specification, Game Architecture & Studio Manual*

🌐 **Official Site:** [**SaintsGaming.net**](https://SaintsGaming.net) &nbsp;•&nbsp; 🕹️ **Author:** **GioGimic** &nbsp;•&nbsp; 📦 **Release:** `v2.1.459-40`

---

</div>

Welcome to the **Saints Gaming Engine & Platform Documentation**! This is the deep technical handbook where all the inner mechanics, networking protocols, combat formulas, and live Studio editor pipelines live.

> [!TIP]
> **Browse the wiki in-app at [`/wiki`](/wiki)** — the full documentation is now available as a searchable, interactive web portal with category navigation, table of contents, and `Ctrl+K` instant search.

---

## 🗺️ Documentation Directory

### 📚 [Wiki Portal](/wiki) — Recommended
The unified wiki portal at `/wiki` provides the best reading experience with live search, categorized navigation, and interactive table of contents. All documentation below is also available there.

---

### 🎮 [Game Systems Documentation](game-systems/README.md)
Detailed architectural and gameplay guides for player-facing mechanics and runtime engine systems:
- **[Architecture & Core Loop](game-systems/architecture-and-loop.md)**: WebGL 2.5D Babylon.js renderer, tick rate, movement interpolation, and decoupled React UI.
- **[27-Skill Progression & Master Capstones](game-systems/skills-and-progression.md)**: Combat, Gathering, Artisan, and Support proficiencies, formulas, XP curves, and Grandmaster Max Capes.
- **[Combat & Encounter Systems](game-systems/combat-and-encounters.md)**: Overworld real-time monster combat, instanced turn-based creature battles, action hotbars, and status effects.
- **[Networking & Hybrid Go MMO Backend](game-systems/networking-and-multiplayer.md)**: Go `:3001` socket server, AOI interest management, sharding, and MariaDB/MySQL state persistence.
- **[Economy, Items & Loot](game-systems/items-and-economy.md)**: Equipment slots, crafting matrices, loot tables, and trade centers.
- **[Mobile Touch Mode & UI](game-systems/mobile-and-ui.md)**: Responsive mobile controls, HUD docking system, mini-map radar, and audio synthesis.

---

### 🛠️ [Studio Editor Documentation](studio/README.md)
Comprehensive technical manuals for the in-game creator toolset (`/studio`):
- **[Studio Architecture & Modes](studio/studio-architecture.md)**: Docking shell, state stores, Paint / Populate / Script / Catalog / Playtest modes.
- **[Dual-Grid Tile Painting & Map Building](studio/tile-painting-and-maps.md)**: Visual GID layers, logic collision tags, brush tools, and auto-remeshing.
- **[Entity & NPC Placers](studio/entities-and-npcs.md)**: Spawners, NPC interactions, sprite configs, and dialogue tree integration.
- **[Catalogs & Definition Editors](studio/catalogs-and-definitions.md)**: In-engine editors for Creatures, Items, Classes, Starter Heroes, Quests, and Loot Tables.
- **[Map Validation, Sync & Playtesting](studio/validation-sync-playtest.md)**: Internal sync webhooks to Go MMO, map validation, and playtest (PIE) runtime.

---

### 🌐 [Wiki Knowledge Base](wiki/)
Unified canonical documentation served via the `/wiki` web portal:
- **[Getting Started](wiki/getting-started/)**: Platform overview, installation guide, and architecture deep-dive.
- **[Game Systems](wiki/game-systems/)**: Core loop, skills, combat, economy, networking, and UI.
- **[World Studio](wiki/studio/)**: Studio architecture, tile painting, entities, catalogs, validation, and assets.
- **[Creator Guide](wiki/creator-guide/)**: Custom characters, creature design, quest authoring, and world building.
- **[API & Reference](wiki/api-and-reference/)**: Database schema, REST API, and glossary.

---

## 🎯 About the Platform
**Saints Gaming** ([SaintsGaming.net](https://SaintsGaming.net)) is an independent sandbox project created and maintained by **GioGimic**, combining a modern full-stack web community (Next.js 15+, React 19, Prisma) with an embedded 2.5D top-down sandbox RPG and live creator Studio.
