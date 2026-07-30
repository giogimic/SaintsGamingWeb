# World Building & Editor Architecture

Saints Gaming is fundamentally designed as an "Editor-First" MMO. If a developer can build an environment, a player with sufficient permissions (Creators) should be able to build it in the exact same way using the exact same tools.

## The Editor-First Philosophy
Every map, dungeon, town, and encounter zone is built using the in-game Map Editor. 
- There are no hard-coded Unity/Unreal scenes. 
- The world is stored entirely as JSON data in the Prisma database.
- The Editor is not a separate desktop application; it is a React overlay built directly into the game client.

### Why Editor-First?
1. **Rapid Iteration**: Developers can paint tiles and immediately walk on them to test collision without recompiling or reloading the client.
2. **User-Generated Content (UGC)**: By standardizing the editor, we can allow players to purchase "Base Claims" to carve out chunks of the world and build their own instanced housing or custom dungeons.
3. **Scalability**: New zones can be pushed to the database and streamed to clients dynamically without requiring a patch download.

## Map Architecture
The world is divided into discrete Maps, defined by:
1. **Dimensions**: Width and Height (measured in 16x16 or 32x32 tiles).
2. **Visual Layers (The Grid)**: A multi-dimensional array representing the visual tiles.
3. **Logic Grid**: An invisible array mapping coordinates to solid collisions, harvestable resources, or interactive scripts.
4. **Gates (Warps)**: Coordinates that transport the player to a different Map.
5. **NPC/Spawns**: Arrays defining static NPCs and dynamic enemies.
6. **Encounter Zones**: Polygons defining areas where Turn-Based Encounters can trigger (e.g., Tall Grass).

## The Strict Layering System
To achieve rich 2.5D orthographic visuals while maintaining foolproof collision logic, the Editor relies on a strict layering system:

- **Layer 0 (Ground/Water)**: The base terrain. *Never Solid.*
- **Layer 1 (Fringes/Paths)**: Decals, paths, transitions. *Usually Not Solid.*
- **Layer 2 (Objects/Walls Base)**: The bottom of trees, fences, and walls. *Always Solid.*
- **Layer 3 (Overhead/Canopy)**: The tops of trees, roofs, and tall walls. *Never Solid.* Renders above the player sprite to create a 3D depth effect.
- **Layer -1 (Logic/Collision)**: An invisible overlay strictly for the server. Developers paint red blocks to dictate collision, green blocks for encounters, and yellow blocks for interactables.

> **Crucial Rule:** Visuals do not dictate physics. The Logic Layer (-1) is the absolute authority on collision. This prevents bugs where players get stuck on slightly misaligned pixel art.

## Everything is an Object
The biggest paradigm shift from older 2D tile engines is treating the world as objects. 
A tree is not just a static picture painted on the grid. A tree is a gameplay Object with:
- Position, Rotation, Size
- Collision box
- Interaction logic (e.g., produces wood when chopped)
- Ownership & State rules

## Creator Tools & UGC Flow
When a player earns a "Creator Claim":
1. **The Sandbox Instance**: The player is teleported to an isolated, blank Map instance.
2. **Painting & Logic**: They can paint tiles and place pre-approved Logic Tiles (Doors, Signs).
3. **Validation**: The server validates the map layout to prevent exploits (e.g., trapped spawn points).
4. **Publishing**: The map is saved to the database. The Creator receives a unique `Warp Code` (or physical Gateway object) they can share with others to allow entry into their private realm.
