/* eslint-disable @typescript-eslint/no-require-imports */
// ═══════════════════════════════════════════════════════════════════
//  Saints Tamer — Authoritative MMO Game Server (Phase 2)
//  Server-Side Physics, Collision Detection, Client Reconciliation
// ═══════════════════════════════════════════════════════════════════

const { Server } = require("socket.io");
const http = require("http");
const mapLoader = require("./lib/game/map-loader");

const server = http.createServer();

// Simple HTTP endpoint to expose live server status to the lobby UI
server.on('request', (req, res) => {
  if (req.method === 'GET' && req.url === '/status') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      players: Object.keys(players).length,
      capacity: 500,
      status: 'online'
    }));
  }
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ─── Constants ─────────────────────────────────────────────────────
const TICK_RATE = 15; // Server ticks per second
const TICK_INTERVAL = Math.floor(1000 / TICK_RATE); // ~66ms
const MOVE_COOLDOWN_MS = 200; // Minimum time between moves per player

// ─── In-Memory Game State ──────────────────────────────────────────
const players = {}; // socket.id -> PlayerState
const parties = {};
const activeBattles = {};

/**
 * PlayerState:
 * {
 *   socketId, x, y, name, spriteId, mapId, characterId,
 *   direction, isMoving, partyId,
 *   moveIntent: { direction, seq } | null,   // Pending move intent
 *   lastMoveTime: number,                     // Throttle moves
 *   lastAckedSeq: number,                     // Last acknowledged client seq
 * }
 */

// ─── Direction Vectors ─────────────────────────────────────────────
const DIRECTION_DELTA = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

// ═══════════════════════════════════════════════════════════════════
//  SERVER TICK LOOP — Processes all pending move intents
// ═══════════════════════════════════════════════════════════════════

function serverTick() {
  const now = Date.now();

  for (const [socketId, player] of Object.entries(players)) {
    if (!player.moveQueue || player.moveQueue.length === 0) continue;

    // Throttle: don't process moves faster than MOVE_COOLDOWN_MS
    if (now - player.lastMoveTime < MOVE_COOLDOWN_MS) {
      continue; // Skip this tick for this player, keep intent in queue
    }

    const { direction, seq } = player.moveQueue.shift(); // Consume the intent

    const delta = DIRECTION_DELTA[direction];
    if (!delta) continue;

    const targetX = player.x + delta.dx;
    const targetY = player.y + delta.dy;

    // ── Server-Side Collision Check ──
    const walkable = mapLoader.isWalkableSync(player.mapId, targetX, targetY);

    // ── NPC Collision Check ──
    let blockedByNpc = false;
    const cachedMap = mapLoader.getCachedMap(player.mapId);
    if (cachedMap?.npcs) {
      blockedByNpc = cachedMap.npcs.some(
        (npc) => npc.x === targetX && npc.y === targetY
      );
    }

    // ── Other Player Collision Check (optional — uncomment if desired) ──
    // const blockedByPlayer = Object.values(players).some(
    //   (p) => p.socketId !== socketId && p.mapId === player.mapId && p.x === targetX && p.y === targetY
    // );

    if (walkable && !blockedByNpc) {
      // ✅ Valid move — update authoritative position
      player.x = targetX;
      player.y = targetY;
      player.direction = direction;
      player.isMoving = true;
      player.lastMoveTime = now;
      player.lastAckedSeq = seq;

      // Broadcast to everyone in the map (including the mover for reconciliation)
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        // Send ack to the moving player with their sequence number
        socket.emit("move_ack", {
          seq,
          x: player.x,
          y: player.y,
          direction: player.direction,
        });

        // Broadcast to others in the map
        socket.to(player.mapId).emit("player_moved", {
          socketId: player.socketId,
          x: player.x,
          y: player.y,
          name: player.name,
          spriteId: player.spriteId,
          direction: player.direction,
          isMoving: true,
        });
      }
    } else {
      // ❌ Invalid move — send correction back to the client
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("position_correction", {
          seq,
          x: player.x,
          y: player.y,
          direction: direction, // Face the wall but don't move
          reason: blockedByNpc ? "npc_collision" : "wall_collision",
        });

        // Broadcast direction change to others!
        if (player.direction !== direction) {
          socket.to(player.mapId).emit("player_moved", {
            socketId: player.socketId,
            x: player.x,
            y: player.y,
            name: player.name,
            spriteId: player.spriteId,
            direction: direction,
            isMoving: false,
          });
        }
      }
      player.direction = direction;
      player.lastAckedSeq = seq;
    }
  }

  // Clear isMoving flag for players who haven't moved recently
  for (const player of Object.values(players)) {
    if (player.isMoving && now - player.lastMoveTime > 300) {
      player.isMoving = false;
      // Broadcast stop to others
      const socket = io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.to(player.mapId).emit("player_moved", {
          socketId: player.socketId,
          x: player.x,
          y: player.y,
          name: player.name,
          spriteId: player.spriteId,
          direction: player.direction,
          isMoving: false,
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  CONNECTION HANDLER
// ═══════════════════════════════════════════════════════════════════

io.on("connection", (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  // ─── 1. Join Map (Room) ────────────────────────────────────────
  socket.on("join_map", async (data) => {
    // data = { mapId, x, y, name, spriteId }

    // Ensure the map collision data is loaded before allowing join
    await mapLoader.loadMapData(data.mapId);

    // Validate spawn position — if the tile is solid, snap to a safe default
    let spawnX = data.x ?? 6;
    let spawnY = data.y ?? 2;
    if (!mapLoader.isWalkableSync(data.mapId, spawnX, spawnY)) {
      // Find first walkable tile near the spawn point
      const dims = mapLoader.getMapDimensions(data.mapId);
      if (dims) {
        let found = false;
        for (let r = 0; r < dims.height && !found; r++) {
          for (let c = 0; c < dims.width && !found; c++) {
            if (mapLoader.isWalkableSync(data.mapId, c, r)) {
              spawnX = c;
              spawnY = r;
              found = true;
            }
          }
        }
      }
    }

    players[socket.id] = {
      socketId: socket.id,
      x: spawnX,
      y: spawnY,
      name: data.name || 'Tamer',
      spriteId: data.spriteId || 'adventurer',
      mapId: data.mapId,
      characterId: data.characterId,
      direction: 'down',
      isMoving: false,
      partyId: null,
      moveQueue: [],
      lastMoveTime: 0,
      lastAckedSeq: 0,
    };

    // If server forced a different spawn than requested, tell the client immediately
    if (spawnX !== data.x || spawnY !== data.y) {
      socket.emit("position_correction", {
        seq: 0,
        x: spawnX,
        y: spawnY,
        direction: 'down',
        reason: "invalid_spawn",
      });
    }

    // Join socket.io room for this map
    socket.join(data.mapId);

    // Get all other players currently in this map
    const mapPlayers = {};
    for (const [id, p] of Object.entries(players)) {
      if (p.mapId === data.mapId && id !== socket.id) {
        mapPlayers[id] = p;
      }
    }

    // Send current players to the new player
    socket.emit("map_players", mapPlayers);

    // Broadcast to others that someone joined
    socket.to(data.mapId).emit("player_joined", players[socket.id]);

    console.log(`[*] ${data.name} joined map ${data.mapId} at ${spawnX},${spawnY}`);
  });

  // ─── 2. Movement Intent (Server-Authoritative) ─────────────────
  socket.on("move_intent", (data) => {
    // data = { direction: 'up'|'down'|'left'|'right', seq: number }
    if (!players[socket.id]) return;
    if (!DIRECTION_DELTA[data.direction]) return;

    // Queue the intent — the server tick loop will process it
    if (players[socket.id].moveQueue.length < 10) {
      players[socket.id].moveQueue.push({
        direction: data.direction,
        seq: data.seq || 0,
      });
    }
  });

  // ─── 2.1 Legacy Move Handler (backwards compatibility) ─────────
  // Kept for any clients that haven't updated yet.
  // Validates the position instead of blindly trusting it.
  socket.on("move", async (data) => {
    // data = { x, y, mapId, direction }
    if (!players[socket.id]) return;

    const p = players[socket.id];

    // If they changed maps, handle room transition
    if (p.mapId !== data.mapId) {
      socket.leave(p.mapId);
      socket.to(p.mapId).emit("player_left", socket.id);

      // Load new map collision data
      await mapLoader.loadMapData(data.mapId);

      p.mapId = data.mapId;
      socket.join(p.mapId);
      socket.to(p.mapId).emit("player_joined", p);
    }

    // Validate: only allow 1-tile moves
    const dx = Math.abs(data.x - p.x);
    const dy = Math.abs(data.y - p.y);
    if (dx + dy > 1) {
      // Teleport attempt — reject and rubber-band
      socket.emit("position_correction", {
        seq: 0,
        x: p.x,
        y: p.y,
        direction: p.direction,
        reason: "invalid_distance",
      });
      return;
    }

    // Validate target tile
    if (!mapLoader.isWalkableSync(data.mapId, data.x, data.y)) {
      socket.emit("position_correction", {
        seq: 0,
        x: p.x,
        y: p.y,
        direction: data.direction || p.direction,
        reason: "wall_collision",
      });
      return;
    }

    // Accept the move
    p.x = data.x;
    p.y = data.y;
    if (data.direction) p.direction = data.direction;
    if (data.isMoving !== undefined) p.isMoving = data.isMoving;
    p.lastMoveTime = Date.now();

    // Broadcast to everyone else in the same map
    socket.to(p.mapId).emit("player_moved", p);
  });

  // ─── 2.5 Chat Sync ─────────────────────────────────────────────
  socket.on("chat_message", (message) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];

    // Broadcast the chat message to everyone else in the map
    socket.to(p.mapId).emit("player_chat", {
      socketId: socket.id,
      message: message
    });
  });

  socket.on("global_chat", (message) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    io.emit("global_chat_msg", {
      sender: p.name || 'Tamer',
      message: message,
      timestamp: Date.now()
    });
  });

  socket.on("party_chat", (message) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    if (p.partyId && parties[p.partyId]) {
      parties[p.partyId].members.forEach((mid) => {
        const ms = io.sockets.sockets.get(mid);
        if (ms) {
          ms.emit("party_chat_msg", {
            sender: p.name || 'Tamer',
            message: message,
            timestamp: Date.now()
          });
        }
      });
    }
  });

  // ─── 3. Party System (up to 4 players) ─────────────────────────
  socket.on("create_party", () => {
    const partyId = `party_${Date.now()}`;
    parties[partyId] = { id: partyId, leader: socket.id, members: [socket.id] };
    players[socket.id].partyId = partyId;
    socket.emit("party_created", { partyId });
    console.log(`[*] ${players[socket.id].name} created party ${partyId}`);
  });

  socket.on("invite_to_party", (data) => {
    const targetSocket = io.sockets.sockets.get(data.targetUserId);
    if (targetSocket && players[socket.id].partyId) {
      targetSocket.emit("party_invite", {
        from: socket.id,
        fromName: players[socket.id].name,
        partyId: players[socket.id].partyId
      });
    }
  });

  socket.on("accept_party_invite", (data) => {
    const partyId = players[data.fromUserId]?.partyId;
    if (!partyId || !parties[partyId]) return;
    if (parties[partyId].members.length >= 4) {
      socket.emit("party_full");
      return;
    }
    parties[partyId].members.push(socket.id);
    players[socket.id].partyId = partyId;
    const memberInfo = { userId: socket.id, name: players[socket.id].name, spriteId: players[socket.id].spriteId, position: { x: players[socket.id].x, y: players[socket.id].y } };
    parties[partyId].members.forEach(mid => {
      const ms = io.sockets.sockets.get(mid);
      if (ms) ms.emit("party_member_joined", memberInfo);
    });
    const allMembers = parties[partyId].members.map(mid => ({
      userId: mid, name: players[mid]?.name || 'Unknown', spriteId: players[mid]?.spriteId || 'hero_male',
      position: { x: players[mid]?.x || 0, y: players[mid]?.y || 0 }
    }));
    socket.emit("party_joined", { partyId, members: allMembers });
  });

  socket.on("leave_party", () => {
    const partyId = players[socket.id]?.partyId;
    if (!partyId || !parties[partyId]) return;
    parties[partyId].members = parties[partyId].members.filter(id => id !== socket.id);
    players[socket.id].partyId = null;
    if (parties[partyId].members.length === 0) {
      delete parties[partyId];
    } else {
      if (parties[partyId].leader === socket.id) parties[partyId].leader = parties[partyId].members[0];
      parties[partyId].members.forEach(mid => {
        const ms = io.sockets.sockets.get(mid);
        if (ms) ms.emit("party_member_left", socket.id);
      });
    }
    socket.emit("party_left");
  });

  socket.on("update_party_position", (data) => {
    const partyId = players[socket.id]?.partyId;
    if (!partyId) return;
    broadcastToParty(partyId, "party_position_update", { userId: socket.id, position: data.position }, socket.id);
  });

  function broadcastToParty(partyId, event, data, excludeId) {
    const party = parties[partyId];
    if (!party) return;
    party.members.forEach(mid => {
      if (mid === excludeId) return;
      const ms = io.sockets.sockets.get(mid);
      if (ms) ms.emit(event, data);
    });
  }

  // ─── 4. Authoritative PvP Combat ───────────────────────────────
  socket.on("invite_battle", (targetSocketId) => {
    if (players[targetSocketId]) {
      io.to(targetSocketId).emit("battle_invite_received", {
        from: socket.id,
        name: players[socket.id]?.name || 'Unknown'
      });
    }
  });

  socket.on("accept_battle", (challengerId) => {
    if (!players[challengerId]) return;

    const battleId = `battle_${Date.now()}`;
    const p1 = challengerId;
    const p2 = socket.id;

    activeBattles[battleId] = {
      id: battleId,
      p1,
      p2,
      turn: p1, // Challenger goes first
      p1Hp: 100, // Dummy starting HP, normally fetched from active daemon
      p2Hp: 100,
      log: []
    };

    io.to(p1).emit("battle_started", { battleId, opponent: players[p2], isPlayerTurn: true });
    io.to(p2).emit("battle_started", { battleId, opponent: players[p1], isPlayerTurn: false });
  });

  socket.on("battle_action", (data) => {
    // data = { battleId, action: 'ATTACK', damage: number }
    const battle = activeBattles[data.battleId];
    if (!battle) return;

    if (battle.turn !== socket.id) return; // Not their turn

    const isP1 = battle.p1 === socket.id;
    const opponent = isP1 ? battle.p2 : battle.p1;
    
    // Process damage
    if (isP1) {
      battle.p2Hp -= data.damage;
      battle.log.push(`Player 1 dealt ${data.damage} damage!`);
    } else {
      battle.p1Hp -= data.damage;
      battle.log.push(`Player 2 dealt ${data.damage} damage!`);
    }

    // Check for win/loss
    if (battle.p1Hp <= 0 || battle.p2Hp <= 0) {
      const winner = battle.p1Hp > 0 ? battle.p1 : battle.p2;
      io.to(battle.p1).emit("battle_ended", { winner, log: battle.log });
      io.to(battle.p2).emit("battle_ended", { winner, log: battle.log });
      delete activeBattles[data.battleId];
      return;
    }

    // Swap turn
    battle.turn = opponent;
    
    // Broadcast state
    io.to(battle.p1).emit("battle_update", {
      turn: battle.turn,
      myHp: battle.p1Hp,
      oppHp: battle.p2Hp,
      log: battle.log,
      lastDamage: data.damage
    });
    
    io.to(battle.p2).emit("battle_update", {
      turn: battle.turn,
      myHp: battle.p2Hp,
      oppHp: battle.p1Hp,
      log: battle.log,
      lastDamage: data.damage
    });
  });

  // ─── 5. Disconnect ─────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[-] Player disconnected: ${socket.id}`);
    const p = players[socket.id];
    if (p && p.mapId) {
      socket.to(p.mapId).emit("player_left", socket.id);
    }
    delete players[socket.id];
  });
});

// ═══════════════════════════════════════════════════════════════════
//  SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════

const PORT = process.env.GAME_SERVER_PORT || 3001;

async function start() {
  // Initialize map loader — preload logic tiles from DB
  await mapLoader.initialize();

  // Start the physics tick loop
  setInterval(serverTick, TICK_INTERVAL);
  console.log(`[SAINTS TAMER] Server tick loop started at ${TICK_RATE} TPS (${TICK_INTERVAL}ms)`);

  // Start HTTP server
  server.listen(PORT, () => {
    console.log(`[SAINTS TAMER] Authoritative MMO Server running on port ${PORT}`);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[SAINTS TAMER] Shutting down...");
  await mapLoader.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[SAINTS TAMER] Shutting down...");
  await mapLoader.shutdown();
  process.exit(0);
});

start().catch((err) => {
  console.error("[SAINTS TAMER] Failed to start:", err);
  process.exit(1);
});
