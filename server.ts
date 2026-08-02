import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { GameEngine } from "./src/server/GameEngine";
import { SocketHandler } from "./src/server/SocketHandler";
import { WorldManager } from "./src/server/WorldManager";
import { PlayerManager } from "./src/server/PlayerManager";
import { CombatManager } from "./src/server/CombatManager";
import { CreatureManager } from "./src/server/CreatureManager";
import { EncounterManager } from "./src/server/EncounterManager";
import { DialogueManager } from "./src/server/DialogueManager";
import { QuestManager } from "./src/server/QuestManager";
import { SkillManager } from "./src/server/SkillManager";
import { InventoryManager } from "./src/server/InventoryManager";
import { PartyManager } from "./src/server/PartyManager";
import { CraftingManager } from "./src/server/CraftingManager";
import { EconomyManager } from "./src/server/EconomyManager";
import { RealtimeService } from "./src/server/realtime/RealtimeService";
import { attachRedisAdapter } from "./src/server/net/redisAdapter";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Singleton — API routes import this to publish events via RealtimeService
let _realtimeService: RealtimeService | null = null;
export function getRealtimeService(): RealtimeService | null {
  return _realtimeService;
}

app.prepare().then(async () => {
  // Initialize MMO Backbone
  const gameEngine = new GameEngine();
  const worldManager = new WorldManager(gameEngine);
  const partyManager = new PartyManager(gameEngine);
  const playerManager = new PlayerManager(gameEngine, worldManager, partyManager);
  const creatureManager = new CreatureManager(gameEngine, worldManager);
  const encounterManager = new EncounterManager(gameEngine);
  const combatManager = new CombatManager(gameEngine, playerManager, creatureManager, worldManager);
  const dialogueManager = new DialogueManager(gameEngine);
  const questManager = new QuestManager(gameEngine);
  const skillManager = new SkillManager(gameEngine);
  const inventoryManager = new InventoryManager(gameEngine, worldManager);
  const craftingManager = new CraftingManager(gameEngine, playerManager);
  const economyManager = new EconomyManager(gameEngine, playerManager);
  
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

  // Optional multi-instance fan-out (REDIS_URL / REDIS_HOST)
  await attachRedisAdapter(io);

  // Initialize the Realtime Platform singleton
  _realtimeService = new RealtimeService(io);

  const socketHandler = new SocketHandler(io, gameEngine, _realtimeService);
  
  await worldManager.initialize();
  await dialogueManager.initialize();
  await questManager.initialize();
  await skillManager.initialize();
  await inventoryManager.initialize();
  await craftingManager.initialize();
  await economyManager.initialize();
  socketHandler.initialize();

  // Start the tick loop
  gameEngine.start();

  server.listen(port, () => {
    console.log(`> Saints MMO Server ready on http://${hostname}:${port}`);
    console.log(`> Saints Realtime Platform initialized`);
  });
});

