# Saints Gaming — World Building & Editor Architecture (8.txt)

Saints Gaming is fundamentally designed as an "Editor-First" MMO. If a developer can build it, a player with sufficient permissions (Creators) should be able to build it in the exact same way using the exact same tools.

> **See also:**  
> - [`16-studio-editor-philosophy.md`](./16-studio-editor-philosophy.md) — creator UX, modes, docks  
> - [`17-studio-world-builder-economy.md`](./17-studio-world-builder-economy.md) — Studio isolation, entity/loot/economy contracts  
> - [`18-studio-master-architecture.md`](./18-studio-master-architecture.md) — master audit, unification rules, every subsystem  
> - [`19-studio-ux-design.md`](./19-studio-ux-design.md) — complete UX contract (tools, inspector, shortcuts)  
> - [`20-studio-entity-system.md`](./20-studio-entity-system.md) — unified entity/component/prefab model  
> - [`21-studio-world-building-tools.md`](./21-studio-world-building-tools.md) — every paint/region/brush/layer tool + save workflows  
>  
> `08` covers the technical map data architecture (schemas, layers, DB sync).  
> `16` covers the human experience design (UI, roles, workflows, creator language).  
> `17` covers production Studio isolation and data-driven economy.  
> `18` is the master inventory — reuse existing systems; do not invent parallels.  
> `19` specifies every Studio interaction surface.  
> `20` specifies how every placed object is composed and serialized.  
> `21` specifies every world-building tool and placement→save workflow.  
> Read **08 + 16 + 17 + 18 + 19 + 20 + 21** together when implementing any part of the editor.

---

# 1. The "Editor-First" Philosophy

Every map, dungeon, town, and encounter zone in Saints Gaming is built using the in-game Map Editor. 
* There are no hard-coded Unity/Unreal scenes. 
* The world is stored entirely as JSON data in the database.
* The Editor is not a separate application; it is an overlay built directly into the game client (`isDevEditorOpen` state).

### Why Editor-First?
1. **Rapid Iteration**: Developers can paint tiles and immediately walk on them to test collision without recompiling.
2. **User-Generated Content (UGC)**: By standardizing the editor, we can eventually allow players to purchase "Base Claim" items to carve out a chunk of the world and build their own instanced housing or custom dungeon.
3. **Scalability**: New zones can be pushed to the database and streamed to clients dynamically without requiring a patch download.

---

# 2. Map Architecture & Data Structure

The world is divided into discrete **Maps** (e.g., `Tamer Grounds`, `Lobby`).

A single Map contains:
1. **Dimensions**: `mapWidth` and `mapHeight` (measured in 16x16 or 32x32 logic tiles).
2. **Visual Layers (The Grid)**: A multi-dimensional array representing the visual tiles (Grass, Water, Walls).
3. **Logic Grid**: An invisible array that maps specific coordinates to solid collisions, harvestable resources, or interactive scripts.
4. **Gates (Warps)**: Defined coordinates that instantly transport the player to a different Map or a different coordinate on the same Map.
5. **NPC/Spawns**: Arrays defining where static NPCs and dynamic enemies appear.
6. **Encounter Zones**: Polygons/rectangles defining areas where Turn-Based Encounters can trigger (e.g., Tall Grass).

---

# 3. The Layering System

To achieve rich 2.5D orthographic visuals while maintaining simple collision logic, the Editor uses a strict layering system:

1. **Layer 0 (Ground/Water)**: The base terrain. Never solid.
2. **Layer 1 (Fringes/Paths)**: Decals, paths, and transitions. Usually not solid.
3. **Layer 2 (Objects/Walls Base)**: The bottom of trees, fences, and walls. **Always Solid**.
4. **Layer 3 (Overhead/Canopy)**: The tops of trees, roofs, and tall walls. **Never Solid**. Renders *above* the player sprite to create depth.
5. **Layer -1 (Logic/Collision)**: An invisible overlay strictly for the server. Developers paint red blocks to dictate collision, green blocks for encounter zones, and yellow blocks for interactables.

> **Crucial Rule:** Visuals do not dictate physics. The Logic Layer (-1) is the absolute authority on collision. This prevents bugs where players get stuck on slightly misaligned pixel art.

---

# 4. Map Loading & Dynamic Streaming

Because Saints Gaming runs in the browser, downloading a 10,000 x 10,000 world map instantly is impossible.

### Dynamic Chunking (Future Scaling)
Currently, maps are loaded as single JSON files. As the game grows, the engine must support **Chunking**:
* The world is divided into chunks (e.g., 64x64 tiles).
* The client requests chunks based on the player's current coordinate and view radius.
* As the player moves, new chunks stream in via WebSockets or REST, and distant chunks are garbage collected from memory.

---

# 5. Creator Tools & UGC Flow

When a player earns or buys a "Creator Claim", they gain access to a localized version of the Map Editor.

1. **The Sandbox Instance**: The player is teleported to an isolated, blank Map instance on the server.
2. **Painting & Logic**: They can paint tiles, place pre-approved Logic Tiles (Doors, Signs), and spawn standard enemies.
3. **Validation**: The server validates the map layout (e.g., ensuring they didn't create a trapped spawn point or bypass economy rules).
4. **Publishing**: The map is saved to the database. The Creator receives a unique `Warp Code` (or physical Gateway object) they can share with others to allow entry into their realm.

---

# 6. Database Synchronization (Prisma)

The Editor directly modifies the game's source of truth.

* **Saving**: When a developer clicks "Save Map", the client serializes the JSON state and POSTs it to an admin-only API route.
* **Prisma Schema**: The `Map` model in `schema.prisma` stores the `grid`, `logicTiles`, and `npcs` as JSON objects.
* **Live Updates**: In the future, using WebSockets, if a developer saves a map while players are actively on it, the server will push a `map_update` event, and the players' clients will seamlessly refresh the tiles without disconnecting.

> **See also:** `16.txt` / `16-studio-editor-philosophy.md` — Studio & Editor philosophy (companion to this architecture).
