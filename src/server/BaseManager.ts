import { GameEngine } from "./GameEngine";
import { prisma } from "@/web/lib/prisma";
import { resolveUserId } from "./inventoryService";
import { addItem } from "./inventoryService";

export class BaseManager {
  constructor(private engine: GameEngine) {
    this.engine.events.on("placeStructureRequest", (data) => this.handlePlaceStructure(data));
    this.engine.events.on("assignWorkerRequest", (data) => this.handleAssignWorker(data));
    this.engine.events.on("claimProductionRequest", (data) => this.handleClaimProduction(data));
  }

  public async initialize() {
    console.log("[BaseManager] Initialized Base Automation Engine");
    
    // 1Hz production tick for idle structures
    setInterval(() => this.processProductionTick(), 60000); // Check every minute
  }

  private async processProductionTick() {
    try {
      const structures = await prisma.playerStructure.findMany({
        where: { workerCreatureId: { not: null } },
      });

      const now = new Date();

      for (const structure of structures) {
        // Idle production: 1 item per minute if worked
        const diffMs = now.getTime() - new Date(structure.lastTickAt).getTime();
        const minutes = Math.floor(diffMs / 60000);
        
        if (minutes >= 1) {
          let outputItem = "wood_log";
          if (structure.structureType === "FURNACE") outputItem = "ingot_copper";
          else if (structure.structureType === "LUMBER_MILL") outputItem = "plank_wood";
          
          // We can just give the items directly
          await addItem(structure.userId, outputItem, minutes);
          
          await prisma.playerStructure.update({
            where: { id: structure.id },
            data: { lastTickAt: now },
          });
        }
      }
    } catch (e) {
      console.error("[BaseManager] Error in production tick", e);
    }
  }

  private async handlePlaceStructure({ accountId, socketId, mapId, x, y, structureType }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    // Currency Sink: Base claim cost
    const cost = 500;
    const char = await prisma.gameCharacter.findFirst({ where: { userId } });
    if (!char) return;

    const state = JSON.parse(char.stateData || "{}") as Record<string, any>;
    const credits = Number(state.credits || 0);
    
    if (credits < cost) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message: `You need ${cost} G to place a ${structureType}.` },
      });
      return;
    }

    state.credits = credits - cost;
    await prisma.gameCharacter.update({
      where: { id: char.id },
      data: { stateData: JSON.stringify(state) },
    });

    await prisma.playerStructure.create({
      data: { userId, mapId, x, y, structureType },
    });

    this.engine.events.emit("directMessage", {
      socketId,
      event: "sync_credits",
      data: { credits: state.credits },
    });
    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message: `Placed ${structureType} for ${cost} G.` },
    });
  }

  private async handleAssignWorker({ accountId, socketId, structureId, creatureId }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    await prisma.playerStructure.update({
      where: { id: structureId },
      data: { workerCreatureId: creatureId, lastTickAt: new Date() },
    });

    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message: `Worker assigned to structure. Production started!` },
    });
  }

  private async handleClaimProduction({ accountId, socketId, structureId }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    // Manual claim logic can go here, but tick handles it passively right now.
  }
}
