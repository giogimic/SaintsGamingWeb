# 🛠️ Studio Editor Documentation

The **Saints Studio** (`/studio`) is the built-in world creator and content management suite embedded within Saints Gaming.

---

## 📑 Contents

1. **[Studio Architecture & Modes](studio-architecture.md)**
   - Studio shell layout, FlexLayout dock panels, and Zustand editor state.
   - The 5 core modes: **Paint**, **Populate**, **Script**, **Catalog**, and **Playtest (PIE)**.
   - Studio Omnisearch, keyboard shortcuts (Ctrl+E, Ctrl+Z, Ctrl+S), and permission gating.

2. **[Dual-Grid Tile Painting & Map Building](tile-painting-and-maps.md)**
   - Visual GID layers vs Logic Tag layer (`-1`).
   - Brush tools: Stamp, Rect, Fill, Eraser, Eyedropper, and Brush Radius.
   - Tile Selector dock panel, GID bootstrap (GID 17 solid grass), and live remeshing.

3. **[Entities, Spawners & NPCs](entities-and-npcs.md)**
   - Placing and editing interactive NPCs, quest givers, and merchant shops.
   - Monster Spawners: spawn radii, respawn timers, level ranges, and encounter tables.
   - Logic components: Warps, Doors, Chests, Hazards, and Event Triggers.

4. **[Catalogs & Definition Editors](catalogs-and-definitions.md)**
   - **Creature Editor:** Base stats, element typings, evolution trees, and move pools.
   - **Item & Loot Editor:** Equipment bonuses, consumable effects, and drop weight tables.
   - **Class & Starter Hero Editor:** Starting gear loadouts, archetype previews, and level deltas.
   - **Quest & Dialogue Editor:** Branching dialogue trees, conditions, and quest completion triggers.

5. **[Map Validation, Sync & Playtesting](validation-sync-playtest.md)**
   - Realtime map validation (`mapSaveValidation.ts`) and Studio Problems panel.
   - Saving pipeline: Next.js Prisma persistence → Go MMO webhook sync.
   - Playtest mode (PIE): seamless switching between editor runtime and live player simulation.
