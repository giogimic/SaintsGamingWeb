# 🌐 Networking & Hybrid Go MMO Backend

Saints Gaming uses a **high-performance hybrid networking architecture** combining a Next.js web application with a dedicated Go socket server (`go-mmo/`).

---

## 1. Hybrid Server Roles

| Service | Port | Responsibilities |
| :--- | :--- | :--- |
| **Next.js Web / Sockets** | `3000` | Web pages, Auth.js session handling, REST/GraphQL APIs, Studio map persistence (`/api/maps`), forum realtime, and emergency Node.js socket fallback (`server.ts`). |
| **Go MMO Realtime Server** | `3001` | Authoritative player movement, tick simulation (20Hz), Area-of-Interest (AOI) spatial grid, combat hit calculation, chat broadcasting, and MariaDB/MySQL character state persistence. |

---

## 2. Area-of-Interest (AOI) Sharding

To support hundreds of concurrent players on dense maps without network saturation, the Go MMO backend employs **grid-based spatial partitioning**:

- Maps are divided into $16 \times 16$ tile spatial chunks.
- Players only receive state packets for entities located within their active chunk and immediate neighboring chunks.
- When an entity crosses an AOI boundary, `entity_spawn` or `entity_despawn` events are sent to nearby clients.
- Shards use base map IDs (`toBaseMapId` / `resolvePlayableMapId`) ensuring peers joining the same logical area inhabit the same shard channels (`DEMO_SANDBOX_ch1`).

---

## 3. Movement Codecs & Synchronization

- **Client Input:** Sent via binary or lightweight JSON movement packets containing destination, heading, velocity, and timestamp.
- **Server Tick:** The server validates collision against the authoritative map grid before updating the player's true position.
- **Drift Correction:** The client continuously interpolates remote entity positions using linear interpolation (`lerp`), preventing jitter while maintaining synchronization.

---

## 4. Internal Map Sync Webhook

When a creator or developer saves a map in Studio:
1. Studio sends updated visual tile layers and logic collision tags to `POST /api/maps`.
2. Next.js persists the changes to Prisma / MariaDB/MySQL.
3. Next.js triggers `notifyGoMapSynced()` (`POST http://localhost:3001/api/internal/sync-map`).
4. Go MMO reloads the map collision grid and broadcasts `map_reloaded` to all active players on that map without requiring a server reboot.
