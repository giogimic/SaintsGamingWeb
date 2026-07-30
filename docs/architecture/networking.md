# Server Authority & Networking Architecture

Saints Gaming operates under a strictly **server-authoritative** model. The core networking philosophy is simple: **The client requests actions. The server decides outcomes.**

## The Client/Server Boundary
The game client (Babylon.js + React UI) is entirely untrusted. It is responsible for rendering the world, predicting visuals to hide latency, and sending player input to the server. It never decides outcomes.

**Example of Authority:**
- *Bad:* Client: "I caught this rare creature." Server: "Okay."
- *Good:* Client: "I attempted capture." Server checks encounter logic, inventory, creature existence, runs capture mathematics, and responds "Capture successful."

The server is the absolute and final authority for:
- Player position & collision
- Combat calculations & damage
- Creature ownership & captures
- Inventory, trading, and economy
- Skill progression

## The Networking Stack (Socket.io)
Because Saints Gaming is embedded inside a Next.js 16 web application, it requires strict boundaries between standard web traffic and real-time game traffic.

1. **Authentication (NextAuth Handshake):** When the React game component connects to the Socket.io server, it passes a secure, signed JWT token or session cookie. The socket server verifies this session against NextAuth. If invalid, the connection is instantly rejected.
2. **Spoofing Prevention:** A socket connection is intrinsically tied to the authenticated User ID. The client cannot send a `combat_cast` event claiming to be a different player.

## The Game Tick Loop
Do not put game logic directly inside Socket.io event handlers. The Socket layer is merely for transportation.

The Game Server maintains a consistent **Tick Loop** (e.g., 20 ticks per second). It buffers incoming inputs from sockets, updates the physics and spatial grids, resolves collisions, calculates combat damage, and then broadcasts the new world state to all relevant clients. 

### Movement Authority & Client Prediction
The client does not send exact coordinates (e.g., "I am at 300,400"). Instead, it sends input intent ("I am holding W"). The server calculates the new position based on speed and terrain.
To prevent laggy gameplay, the client predicts movement locally. If the server detects a desync (e.g., the client walked through a wall), it forces a hard position correction via a socket broadcast.

## Sharding & Instancing
Saints uses dynamic sharding rather than physical server clustering to manage population density.

- **Social Areas (The Lobby):** Automatically shards when population caps are reached (e.g., 50 players per channel).
- **Personal Bases:** Exist in private, isolated instances.
- **Creator Worlds:** Can scale dynamically depending on player traffic.

Players seamlessly transition between shards and instances via Socket.io room joins/leaves, maintaining the illusion of one connected world.
