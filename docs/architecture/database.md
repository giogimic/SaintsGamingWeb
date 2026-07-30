# Database Schema & Event Architecture

Saints Gaming relies on a strict separation between in-memory simulation (Hot State) and persistent storage (Cold State) to balance MMO performance with data integrity.

## 1. Hot State vs Cold State

### Hot State (In-Memory)
While a player is logged in, their active position, current health, and temporary buffs are stored in the Node.js Game Server's RAM. This allows the server to process the 20-tick-per-second real-time simulation without hammering the SQL database on every single move.

### Cold State (Prisma/MariaDB)
The relational database acts as the ultimate cold storage for the game. The server periodically flushes Hot State to Cold State (e.g., every 60 seconds). 
- **Safe Logout:** When a player intentionally logs out, their Hot State is instantly flushed.
- **Crash Recovery:** If the Node.js server crashes, players will revert to their last Cold State flush (max 60 seconds of lost progress). 
- **Critical Syncs:** High-value events (Trading, Capturing, Looting a Rare item) trigger an **immediate, synchronous** Cold State flush to prevent duplication exploits or devastating losses in the event of a crash.

## 2. Core Prisma Models
The Prisma schema (`schema.prisma`) defines the rigid data structures that govern Server Authority.

### Accounts & Progression
- **`User` (NextAuth):** Handles authentication, session tokens, and Web UI settings.
- **`GameCharacter`**: The physical avatar in the MMO.
  - Fields: `id`, `userId`, `name`, `spriteId`, `level`, `xp`, `hp`, `maxHp`, `mapId`, `x`, `y`.
  - JSON Fields: `skills` (the 27 levels and XP), `equipment` (currently worn gear).
- **`Inventory`**:
  - Fields: `id`, `characterId`, `type` (BACKPACK vs BANK).
  - JSON Fields: `slots` (Item IDs, Quantity, Instance UUIDs for ARPG gear).

### The Creature Engine
- **`CreatureTemplate`**: The immutable reference data (Base HP, Base Power, Elements, Sprite mappings).
- **`PlayerCreature`**: The mutable instance owned by a player.
  - Fields: `id`, `ownerId`, `templateId`, `nickname`, `level`, `xp`.
  - IVs (Individual Values): `hpIv`, `powerIv`, `resistanceIv`, `tempoIv` (ensuring no two captured creatures are exactly the same).

### The World Editor
- **`Map`**: Serialized JSON data for the world.
  - Fields: `id`, `name`, `creatorId` (Null if official).
  - JSON Fields: `grid` (Visual Layer 0-3), `logicTiles` (Layer -1), `gates` (Warps), `npcs` (Spawns).

### Social & Economy
- **`Guild`**: `id`, `name`, `leaderId`, `memberIds`, `bankJson`.
- **`MarketplaceListing`**: `id`, `sellerId`, `itemInstanceId`, `creatureId`, `priceType`, `priceAmount`, `expiresAt`.

## 3. Socket.io Event Dictionary
The WebSocket server manages the real-time simulation. The client only sends INTENT; the server broadcasts STATE.

### Client-to-Server (Intents)
- `input`: `{ type: "MOVE", direction: "up", sequence: 124 }`
- `combat_cast`: `{ abilityId: "strike", targetId: "monster_12" }`
- `interact`: `{ targetId: "npc_5" }`
- `inventory_move`: `{ fromIndex: 0, toIndex: 5 }`

### Server-to-Client (State Broadcasts)
- `world_state_sync`: Sent every tick to all clients in a map channel (Array of moving entities).
- `position_correction`: Sent to a specific client if their predicted movement was illegal.
- `combat_event`: Sent when a combat action resolves (triggers floating combat text).
- `encounter_triggered`: Pauses MMO logic and opens the Turn-Based UI for creature collection.
