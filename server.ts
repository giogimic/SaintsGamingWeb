import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { GameEngine } from "./lib/game-server/GameEngine";
import { SocketHandler } from "./lib/game-server/SocketHandler";
import { WorldManager } from "./lib/game-server/WorldManager";
import { PlayerManager } from "./lib/game-server/PlayerManager";
import { CombatManager } from "./lib/game-server/CombatManager";
import { CreatureManager } from "./lib/game-server/CreatureManager";
import { EncounterManager } from "./lib/game-server/EncounterManager";
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Initialize MMO Backbone
  const gameEngine = new GameEngine();
  const worldManager = new WorldManager(gameEngine);
  const playerManager = new PlayerManager(gameEngine, worldManager);
  const creatureManager = new CreatureManager(gameEngine, worldManager);
  const encounterManager = new EncounterManager(gameEngine);
  const combatManager = new CombatManager(gameEngine);
  
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      
      // Intercept the server-status API to use our live integrated MMO engine
      if (parsedUrl.pathname === '/api/game/server-status') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          players: playerManager.getPlayerCount(), 
          capacity: 500, 
          status: 'online' 
        }));
        return;
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Attach Socket.io to the Next.js HTTP server
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const socketHandler = new SocketHandler(io, gameEngine);
  
  await worldManager.initialize();
  socketHandler.initialize();

  // Start the tick loop
  gameEngine.start();

  server.listen(port, () => {
    console.log(`> Saints MMO Server ready on http://${hostname}:${port}`);
  });
});
