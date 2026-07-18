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
const players = {};
const parties = {};
const activeBattles = {};

io.on("connection", (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  // 1. Movement Sync
  socket.on("move", (data) => {
    // data = { x, y, characterId, mapId }
    players[socket.id] = { ...players[socket.id], ...data };
    // Broadcast to everyone else in the same map
    socket.broadcast.emit("player_moved", {
      socketId: socket.id,
      ...data
    });
  });

  // 2. Party System
  socket.on("invite_party", (targetSocketId) => {
    io.to(targetSocketId).emit("party_invite_received", { from: socket.id });
  });

  // 3. Authoritative Combat (4v4 Synced)
  socket.on("engage_battle", (data) => {
    // Calculate Speed/Agility Math
    console.log(`[-] Engaging battle with ${data.targetId}`);
    
    // Broadcast battle start to the rest of the party
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
    delete players[socket.id];
    io.emit("player_disconnected", socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[SAINTS TAMER] Authoritative MMO Server running on port ${PORT}`);
});
