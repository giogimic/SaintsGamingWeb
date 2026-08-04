# Saints Gaming — Studio Editor Philosophy & Creator Experience (16.txt)

Saints Studio is not a secondary tool bolted onto the game. It is the product surface where worlds are born. The architectural layers of map data, logic tiles, and object placement are defined in [`08-world-building-editor-architecture.md`](./08-world-building-editor-architecture.md). Production Studio isolation, entity schemas, and loot/economy contracts live in [`17-studio-world-builder-economy.md`](./17-studio-world-builder-economy.md). The full system inventory lives in [`18-studio-master-architecture.md`](./18-studio-master-architecture.md). **Every window, tool, shortcut, and workflow** is specified in [`19-studio-ux-design.md`](./19-studio-ux-design.md). **Unified entities/components/prefabs** are specified in [`20-studio-entity-system.md`](./20-studio-entity-system.md). **Every world-building paint/region tool** is specified in [`21-studio-world-building-tools.md`](./21-studio-world-building-tools.md). This document defines how creating should *feel*.

---

# 1. Building Feels Like Playing

The golden rule of Saints Studio:

> **If creating feels like debugging an engine, we failed. If creating feels like playing the game with god powers, we succeeded.**

Creators enter the same world players inhabit. They walk, look, place, and immediately test. There is no separate "build scene," no compile step, and no desktop map tool. Press play and you are in the world. Press create and you are still in the world — only now you can change it.

---

# 2. Hide the Engine

Creators should never need to understand Babylon.js meshes, Socket.io rooms, Prisma JSON columns, or tick rates.

### What creators see
* Tiles, objects, NPCs, quests, dialogue, and spawn points
* Simple property panels: Name, Collision, Interact Action, Warp Target
* Immediate visual feedback when something is placed or painted

### What creators never see
* Raw grid arrays, shader settings, or network payloads
* Database migration warnings
* "Entity Component System" jargon unless they opt into Advanced Tier

The engine exists to serve the fantasy of world-building. It stays under the floorboards.

---

# 3. World-Based Editor — Five Modes

Studio is a single live world with five creator modes. Modes change tools, not the world.

### Mode 1 — Walk (Play Test)
Move as a player. Trigger encounters, talk to NPCs, harvest nodes, and verify warps. Creation tools are hidden. This is the instant feedback loop.

### Mode 2 — Paint (Terrain & Layers)
Brush visual layers 0–3 and the Logic Layer (−1). Paint ground, fringes, solids, canopies, collisions, encounter zones, and interactables. Visuals never dictate physics — Logic Layer remains authority.

### Mode 3 — Place (Objects & Props)
Drop trees, furnaces, signs, doors, furniture, and harvest nodes as gameplay objects (position, collision, interaction, ownership, state). Everything is an object, not a static picture.

### Mode 4 — Populate (NPCs, Creatures, Quests)
Spawn NPCs, assign dialogue trees, place roaming monsters, define encounter tables, and wire quest givers. Ollama may pre-generate dialogue drafts during authoring; production uses static JSON only.

### Mode 5 — Script (Logic & Gates)
Configure warps, triggers, step-actions, conditions, and event hooks. Attach components/tags to objects without writing server code.

---

# 4. Floating Docks (Not Modal Hell)

Studio UI uses **floating docks** — draggable, collapsible panels that never steal the world viewport.

Default docks:
* **World Builder** — brush, layer, tileset
* **Properties** — selected tile/object fields
* **Asset Manager** — sprites, tilesets, audio, prefabs
* **NPC Editor** — placement, personality, dialogue
* **Quest Editor** — stages, objectives, rewards
* **Creature Editor** — templates, spawn rules
* **Dev Tools** — server controls, diagnostics (permission-gated)

Rules:
* Docks float over the canvas; they never fullscreen-block the world.
* Closing a dock does not exit creation mode.
* Layout persists per user so creators rebuild their workspace.

---

# 5. Permission Roles

Studio access is role-gated. The same editor binary serves different power levels.

| Role | Access |
| :--- | :--- |
| **Player** | No Studio (`/lobby` only). Base decoration uses Mode 3 with a restricted asset whitelist. |
| **Creator** | `/studio` on owned claims / sandbox instances. Paint, Place, Populate within approved tilesets and logic tiles. |
| **Developer** | Full Studio on official maps. Logic Layer, quests, NPC AI, import tools. |
| **Admin** | Everything Developers have, plus publish-to-live, force-save, server controls, and asset registry writes. |

Server validates every save. Clients never write maps or economy rules without permission checks.

---

# 6. Tags & Components

Creators compose behavior with tags and components instead of scripts.

Examples:
* Tags: `harvestable`, `solid`, `encounter`, `shop`, `heal_station`, `warp`
* Components: `HarvestNode { skill, xp, respawnMs }`, `WarpGate { targetMap, x, y }`, `DialogueRef { npcId }`, `QuestGiver { questSlug }`

Painting a yellow Logic Tile and attaching `HarvestNode` is enough to make a tree choppable. No code deploy required.

---

# 7. Assets

Assets are first-class citizens with dual data:

### Visual Data
Sprite / animation / appearance / tileset atlas

### Gameplay Data
Collision, interaction, permissions, crafting links, durability defaults

Asset Manager rules:
* Prefer curated packs (Tuxemon / LPC / Studio registry) over raw uploads for official maps.
* Creator Claims may use approved packs only until moderation unlocks custom uploads.
* Every placeable asset must declare whether it is solid, interactable, or decorative.

---

# 8. The Fun-First Loop

The Studio session loop must complete in seconds, not minutes:

1. **Enter** the live map (or blank sandbox claim).
2. **Place or paint** one thing.
3. **Walk** into it immediately (Mode 1).
4. **Feel** the result (collision, harvest, dialogue, warp).
5. **Tweak** properties in the floating dock.
6. **Save** — server validates and persists JSON to Prisma.

If a creator cannot place a tree and chop it within one minute of opening Studio, the UX is wrong.

---

# 9. Anti-Patterns (Do Not Ship These)

* **Separate build app** — Desktop editors and offline `.tmx` pipelines for new content break the Editor-First rule. Legacy import is allowed; live authoring is Studio.
* **Modal property wizards** that cover the whole screen and disconnect creators from the world.
* **Hardcoded props in React/Babylon source** ("just spawn the tree in `GameCanvasBabylon.tsx`").
* **Real-time LLM dialogue in production** — pre-generate with Ollama during authoring; ship static trees.
* **Engine exposure** — raw JSON editors as the default UI for Creators.
* **Save without validation** — trapped spawns, unreachable exits, and economy-breaking logic tiles must be rejected server-side.

---

# 10. Advanced Tier

Optional power tools for Developers/Admins who opt in:
* Raw JSON inspection of map `grid` / `logicTiles` / `npcs`
* Bulk import (Tuxemon `.tmx`, creature YAML, dialogue packs)
* Live `map_update` push to players currently on the map
* Custom component schemas and scripted event graphs

Advanced Tier is hidden behind an explicit toggle. Default Studio stays fun-first.

---

# 11. Studio Roadmap Checklist

Detailed interaction specs: [`19-studio-ux-design.md`](./19-studio-ux-design.md) §20.

- [x] **Walk Mode** as the default entry — create tools are opt-in, not forced.
- [ ] **Five Modes** switcher (Walk / Paint / Place / Populate / Script) with clear hotkeys — designed in **19**; labels/aliases next.
- [x] **Floating docks** with persisted layout (World Builder, Properties, Assets, NPC, Quest, Creature, Dev + Loot/Dialogue/…).
- [x] **Permission gates** for Admin+/Developer on `/studio` and save APIs (Creator tier deferred).
- [ ] **Tag & component** palette split from Inspector — **19** §6.4 / §8.1.
- [x] **Asset Manager** with visual + gameplay metadata and approved pack filters (DnD to world per **19**).
- [ ] **Fun-first loop** verified under 60s after UX-1/2.
- [x] **Server validation** on save (spawn safety, collision sanity, logic tile allowlists) — extend with status Validation popover.
- [ ] **Ollama authoring assist** for dialogue drafts (offline from production runtime).
- [ ] **Advanced Tier** toggle for raw JSON, bulk import, and live map push — **19** §19.
- [ ] **Publish flow** — private → friends → public → featured (Admin) — **19** §9.
- [x] Cross-check map layer rules against [`08`](./08-world-building-editor-architecture.md) + [`18`](./18-studio-master-architecture.md).
- [x] Complete UX contract — [`19`](./19-studio-ux-design.md).

---

# Final Studio Rule

**Building is gameplay.** The same tools that rebuild Tuxemon must delight Creators enough that they forget they are using an engine — and remember they are shaping a world.
