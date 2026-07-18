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

  // 4. Authoritative Combat (4v4 Synced)
  socket.on("engage_battle", (data) => {
    console.log(`[-] Engaging battle with ${data.targetId}`);
    const battleId = `battle_${Date.now()}`;
    activeBattles[battleId] = {
      players: [socket.id],
      enemies: [data.targetId],
      turnQueue: []
    };
    io.to(socket.id).emit("battle_started", { battleId });
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
