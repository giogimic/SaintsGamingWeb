# Saints Gaming — Database Schema & Event Architecture (13.txt)

As we move toward full execution of the MMO Engine (Phase 5), the blueprint must define the rigid data structures that govern Server Authority. This document outlines the expected Prisma Database Schema and the Socket.io Event Dictionary.

---

# 1. The Prisma Database Schema (Cold State)

The relational database acts as the ultimate cold storage for the game.

### Core Accounts & Progression
* **`User` (NextAuth)**: Handles authentication, session tokens, and Web UI settings.
* **`GameCharacter`**: 
  * Fields: `id`, `userId`, `name`, `spriteId`, `level`, `xp`, `hp`, `maxHp`, `mapId`, `x`, `y`.
  * JSON Fields: `skills` (the 27 levels and XP), `equipment` (currently worn gear).
* **`Inventory`**:
  * Fields: `id`, `characterId`, `type` (BACKPACK vs BANK).
  * JSON Fields: `slots` (Item IDs, Quantity, Instance UUIDs for ARPG gear).

### The Creature Engine
* **`CreatureTemplate`**: The immutable reference data.
  * Fields: `id`, `name`, `baseHp`, `basePower`, `baseResistance`, `baseTempo`, `element`, `spriteKey`.
* **`PlayerCreature`**: The mutable instance owned by a player.
  * Fields: `id`, `ownerId`, `templateId`, `nickname`, `level`, `xp`.
  * IVs (Individual Values): `hpIv`, `powerIv`, `resistanceIv`, `tempoIv`. (These ensure no two captured creatures are exactly the same).

### The World Editor
* **`Map`**:
  * Fields: `id`, `name`, `creatorId` (Null if official).
  * JSON Fields: `grid` (Visual Layer 0-3), `logicTiles` (Layer -1), `gates` (Warps), `npcs` (Spawns).

### Social & Economy
* **`Guild`**: `id`, `name`, `leaderId`, `memberIds`, `bankJson`.
* **`MarketplaceListing`**: `id`, `sellerId`, `itemInstanceId`, `creatureId`, `priceType`, `priceAmount`, `expiresAt`.

---

# 2. Socket.io Event Dictionary (Hot State)

The WebSocket server manages the 20-tick-per-second real-time simulation. The client only sends INTENT; the server broadcasts STATE.

### Client-to-Server (Intents)
* `input`: `{ type: "MOVE", direction: "up", sequence: 124 }`
  * *Server Validation*: Checks collision grid. If valid, updates server-side `x/y`. If invalid, sends a `position_correction`.
* `combat_cast`: `{ abilityId: "strike", targetId: "monster_12" }`
  * *Server Validation*: Checks range, Line of Sight, and cooldowns.
* `interact`: `{ targetId: "npc_5" }`
* `inventory_move`: `{ fromIndex: 0, toIndex: 5 }`
* `chat_message`: `{ channel: "local", text: "Hello" }`

### Server-to-Client (State Broadcasts)
* `world_state_sync`: Sent every tick to all clients in a map channel.
  * Payload: Array of moving entities `{ id, x, y, direction, isMoving }`.
* `position_correction`: Sent to a specific client if their predicted movement was illegal.
* `combat_event`: Sent when a combat action resolves.
  * Payload: `{ sourceId, targetId, abilityId, damage, isCrit, statusApplied }`. The client uses this to render Floating Damage text and animations.
* `resource_harvested`: `{ tileX, tileY, respawnTimeMs }`. Client removes the visual resource.
* `encounter_triggered`: `{ battleId, wildCreatureTemplateId, level }`. Client pauses MMO logic and opens the Turn-Based UI.

---

# 3. Handling Disconnects and Rollbacks

Because the game relies on Hot State memory for performance, unexpected crashes are a risk.

1. **Heartbeats**: The client emits a heartbeat every 5 seconds. If the server misses 3 heartbeats, the player is considered disconnected.
2. **Safe Logout**: When a player intentionally logs out, their Hot State is instantly flushed to the Prisma Cold State.
3. **Crash Recovery**: If the Node.js server crashes, players will revert to their last Cold State flush (max 60 seconds of lost progress). High-value events (Trading, Capturing, Looting a Rare item) trigger an **immediate, synchronous** Cold State flush to prevent duplication exploits or devastating losses.
