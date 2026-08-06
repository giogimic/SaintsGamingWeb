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
import { ShopManager } from "./src/server/ShopManager";
import { BaseManager } from "./src/server/BaseManager";
import { GuildManager } from "./src/server/GuildManager";
import { bootstrapDemoContent } from "./src/server/DemoBootstrap";
import { RealtimeService } from "./src/server/realtime/RealtimeService";
import { attachRedisAdapter } from "./src/server/net/redisAdapter";
import { goMmoInternalBase } from "./src/server/goMmoNotify";

const dev = process.env.NODE_ENV !== "production";
// Docker sets HOSTNAME=0.0.0.0; default to all interfaces in prod so lobby sockets work.
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || "3000", 10);

/**
 * Hybrid scale path: when Go MMO URL is set, Next skips the TS GameEngine tick
 * (lobby/Studio sockets live on Go). Forum RealtimeService still runs here.
 * Force TS engine with ENABLE_TS_GAME_ENGINE=1 (emergency / local A/B).
 */
function shouldRunTsGameEngine(): boolean {
  if (process.env.ENABLE_TS_GAME_ENGINE === "1") return true;
  if (process.env.ENABLE_TS_GAME_ENGINE === "0") return false;
  return !goMmoInternalBase();
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Singleton — API routes import this to publish events via RealtimeService
let _realtimeService: RealtimeService | null = null;
export function getRealtimeService(): RealtimeService | null {
  return _realtimeService;
}

app.prepare().then(async () => {
  const runTsGame = shouldRunTsGameEngine();

  let playerManager: PlayerManager | null = null;
  let gameEngine: GameEngine | null = null;

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);

      // Live player count for status widgets (GET only). Mutations go through Next route + Admin+ auth.
      if (parsedUrl.pathname === "/api/game/server-status" && (req.method === "GET" || !req.method)) {
        res.setHeader("Content-Type", "application/json");
        if (runTsGame && playerManager) {
          res.end(
            JSON.stringify({
              players: playerManager.getPlayerCount(),
              capacity: 500,
              status: "online",
              engine: "typescript",
            })
          );
        } else {
          res.end(
            JSON.stringify({
              players: null,
              capacity: 500,
              status: "online",
              engine: "go-mmo",
              note: "lobby sockets on Go — see NEXT_PUBLIC_GO_MMO_URL",
            })
          );
        }
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Attach Socket.io to the Next.js HTTP server (forum RealtimeProvider + optional TS game)
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  await attachRedisAdapter(io);
  _realtimeService = new RealtimeService(io);

  // Maps / Studio content seed always (API path), even when Go owns game sockets.
  await bootstrapDemoContent();

  if (runTsGame) {
    gameEngine = new GameEngine();
    const worldManager = new WorldManager(gameEngine);
    const partyManager = new PartyManager(gameEngine);
    playerManager = new PlayerManager(gameEngine, worldManager, partyManager);
    const creatureManager = new CreatureManager(gameEngine, worldManager);
    const encounterManager = new EncounterManager(gameEngine);
    const combatManager = new CombatManager(
      gameEngine,
      playerManager,
      creatureManager,
      worldManager
    );
    void combatManager;
    void encounterManager;
    const dialogueManager = new DialogueManager(gameEngine);
    const questManager = new QuestManager(gameEngine);
    const skillManager = new SkillManager(gameEngine);
    const inventoryManager = new InventoryManager(gameEngine, worldManager, playerManager);
    const craftingManager = new CraftingManager(gameEngine, playerManager);
    const economyManager = new EconomyManager(gameEngine, playerManager);
    const shopManager = new ShopManager(gameEngine);
    void shopManager;
    const baseManager = new BaseManager(gameEngine);
    const guildManager = new GuildManager(gameEngine);

    const socketHandler = new SocketHandler(io, gameEngine, _realtimeService);
    await worldManager.initialize();
    await dialogueManager.initialize();
    await questManager.initialize();
    await skillManager.initialize();
    await inventoryManager.initialize();
    await craftingManager.initialize();
    await economyManager.initialize();
    await baseManager.initialize();
    await guildManager.initialize();
    socketHandler.initialize();
    gameEngine.start();
    console.log("> TS GameEngine enabled (ENABLE_TS_GAME_ENGINE or no Go URL)");
  } else {
    console.log(
      `> TS GameEngine gated — lobby/Studio realtime on Go (${goMmoInternalBase()})`
    );
  }

  server.listen(port, hostname, () => {
    console.log(`> Saints MMO Server ready on http://${hostname}:${port}`);
    console.log(`> Saints Realtime Platform initialized`);
  });
});
