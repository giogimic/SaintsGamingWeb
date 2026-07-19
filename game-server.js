// Authoritative MMO Server
const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-Memory Game State
const players = {}; // socket.id -> { x, y, name, spriteId, mapId, characterId }
const parties = {};
const activeBattles = {};

io.on("connection", (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  // 1. Join Map (Room)
  socket.on("join_map", (data) => {
    // data = { mapId, x, y, name, spriteId }
    players[socket.id] = { socketId: socket.id, ...data };
    
    // Join socket.io room for this map
    socket.join(data.mapId);

    // Get all other players currently in this map to send to the newly joined player
    const mapPlayers = {};
    for (const [id, p] of Object.entries(players)) {
      if (p.mapId === data.mapId && id !== socket.id) {
        mapPlayers[id] = p;
      }
    }
    
    // Send current players to the new player
    socket.emit("map_players", mapPlayers);

    // Broadcast to others in the map that someone joined
    socket.to(data.mapId).emit("player_joined", players[socket.id]);
    
    console.log(`[*] ${data.name} joined map ${data.mapId} at ${data.x},${data.y}`);
  });

  // 2. Movement Sync
  socket.on("move", (data) => {
    // data = { x, y, mapId }
    if (!players[socket.id]) return;
    
    const p = players[socket.id];
    
    // If they changed maps, handle room transition
    if (p.mapId !== data.mapId) {
      socket.leave(p.mapId);
      socket.to(p.mapId).emit("player_left", socket.id);
      
      p.mapId = data.mapId;
      socket.join(p.mapId);
      socket.to(p.mapId).emit("player_joined", p);
    }
    
    p.x = data.x;
    p.y = data.y;

    // Broadcast to everyone else in the same map
    socket.to(p.mapId).emit("player_moved", p);
  });

  // 3. Party System
  socket.on("invite_party", (targetSocketId) => {
    io.to(targetSocketId).emit("party_invite_received", { from: socket.id });
  });

  // 4. Authoritative PvP Combat
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

  socket.on("disconnect", () => {
    console.log(`[-] Player disconnected: ${socket.id}`);
    const p = players[socket.id];
    if (p && p.mapId) {
      socket.to(p.mapId).emit("player_left", socket.id);
    }
    delete players[socket.id];
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[SAINTS TAMER] Authoritative MMO Server running on port ${PORT}`);
});
