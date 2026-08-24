# Networking & Multiplayer Architecture

Saints Gaming employs a **hybrid dual-backend model** combining Next.js 15 for web features and persistence with a dedicated high-throughput Go MMO service (`:3001`).

---

## 1. Hybrid Server Architecture & Responsibilities

The network workload is split between web services and realtime simulation:

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server (:3000)                   │
│   • Auth.js Session Validation      • REST / GraphQL APIs   │
│   • Prisma SQLite DB Persistence    • Forum & News Feeds    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal Webhook Sync
┌──────────────────────────────▼──────────────────────────────┐
│                    Go MMO Server (:3001)                    │
│   • 20Hz Tick Game Simulation       • Gorilla WebSockets    │
│   • 16x16 Spatial AOI Grid          • Combat Hit Checking   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Spatial Partitioning & AOI Sharding

To prevent $O(N^2)$ network saturation when hundreds of players gather, maps are divided into **$16 \times 16$ tile spatial chunks**:

- **Interest Radius:** Clients subscribe to their active chunk and the 8 adjacent surrounding chunks ($3 \times 3$ chunk window, or $48 \times 48$ tiles).
- **Spawn / Despawn Triggers:** When an entity enters or exits a player's subscribed chunks, the Go server emits `entity_spawn` or `entity_despawn` packets.
- **Shard Channeling:** Shard identifiers use canonical base map names (`resolvePlayableMapId`), routing peers on the same map to the same channel (e.g. `SAINTS_VILLAGE_ch1`).

---

## 3. Movement Codecs & Client Interpolation

Player movement and state sync leverage optimized binary or lightweight JSON payloads:

```typescript
// Client movement packet structure
interface PlayerMovePacket {
  seq: number;       // Monotonically increasing sequence number
  x: number;         // Target tile X coordinate
  y: number;         // Target tile Y coordinate
  vx: number;        // Velocity X component
  vy: number;        // Velocity Y component
  t: number;         // Millisecond client timestamp
}
```

The client interpolates peer entities using linear interpolation (`lerp`), smoothing position updates across network latency variance.

---

## 4. Internal Map Sync Webhook Pipeline

When a map is modified in World Studio, changes are hot-reloaded across active server processes:

```
[Studio Client] ───(Ctrl+S)───► [POST /api/maps]
                                      │
                                      ▼ (Prisma / SQLite Persist)
[Go MMO :3001]  ◄──(POST /sync-map)───┘
       │
       ▼ (Hot-reload collision grid)
[Connected Players on Map] ───(map_reloaded event)───► [Live Tile Remesh]
```

1. Studio submits map layers to `POST /api/maps`.
2. Next.js updates the database and calls `POST http://localhost:3001/api/internal/sync-map`.
3. The Go MMO server updates its memory collision grid and broadcasts `map_reloaded` to active players.
4. Active clients rebuild visual chunk meshes without disconnecting.
