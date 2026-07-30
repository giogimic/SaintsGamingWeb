import { GameEngine } from "./GameEngine";
import { WorldManager } from "./WorldManager";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Using require for legacy map loader
const mapLoader = require("../engine/map-loader.js");

// Phase 7: The 27-Skill Matrix & Economy
// Mapping Logic Tile IDs to their corresponding Skill, Drops, and Respawn Time
const RESOURCE_NODE_MAP: Record<number, { skillSlug: string, resourceSlug: string, xpAmount: number, respawnTimeMs: number }> = {
  3: { skillSlug: "woodcutting", resourceSlug: "wood_log", xpAmount: 25, respawnTimeMs: 10000 },
  4: { skillSlug: "mining", resourceSlug: "ore_copper", xpAmount: 25, respawnTimeMs: 15000 },
  // 3 = LogicTile: Tree
  // 4 = LogicTile: Rock
};

export class InventoryManager {
  private activeLootBags = new Map<string, { mapId: string, x: number, y: number, items: { itemId: string, quantity: number }[] }>();

  constructor(private engine: GameEngine, private worldManager: WorldManager) {
    this.engine.events.on("gatherInteractRequest", (data) => this.handleGather(data));
    this.engine.events.on("entityDeath", (data) => this.handleEntityDeath(data));
  }

  public async initialize() {
    console.log("[InventoryManager] Initialized ARPG Economy Engine");
  }

  private async handleGather({ accountId, socketId, mapId, x, y }: any) {
    // 1. Verify tile exists and is gatherable
    const instance = this.worldManager.getInstance(mapId);
    if (!instance) return;

    // 1. Check if there's a loot bag here
    let foundLootId = null;
    let foundLoot = null;
    for (const [lootId, loot] of this.activeLootBags.entries()) {
      if (loot.mapId === instance.mapId && loot.x === x && loot.y === y) {
        foundLootId = lootId;
        foundLoot = loot;
        break;
      }
    }

    if (foundLootId && foundLoot) {
      await this.pickupLoot(accountId, socketId, foundLootId, foundLoot);
      return;
    }

    // Use mapLoader to find the logic tile at (x, y)
    const mapDef = mapLoader.getMapDataSync(instance.mapId);
    if (!mapDef || !mapDef.grid || !mapDef.grid[y] || mapDef.grid[y][x] === undefined) return;

    const tileId = mapDef.grid[y][x];
    const nodeConfig = RESOURCE_NODE_MAP[tileId];

    if (!nodeConfig) {
      // Not a gatherable node
      return;
    }

    // Phase 7: Check if node is on cooldown (depleted)
    if (this.worldManager.isNodeDepleted(instance.instanceId, x, y)) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message: "This resource is depleted." }
      });
      return;
    }

    const { resourceSlug, skillSlug, xpAmount, respawnTimeMs } = nodeConfig;
    
    // Check DB for player
    const dbUser = await prisma.account.findFirst({
      where: { id: accountId },
      select: { userId: true }
    });
    if (!dbUser) return;
    const userId = dbUser.userId;

    // 2. Do they have the right tool equipped?
    // We check `PlayerEquipment` (not yet in schema, checking Inventory instead)
    const pickaxe = await prisma.playerInventoryItem.findFirst({
      where: { userId, itemSlug: skillSlug === "mining" ? "pickaxe_bronze" : "axe_bronze" } // placeholder
    });
    
    // We will let them gather barehanded for the demo, just for ease.

    // 3. Grant Resource
    let invItem = await prisma.playerInventoryItem.findFirst({
      where: { userId, itemSlug: resourceSlug }
    });

    if (invItem) {
      await prisma.playerInventoryItem.update({
        where: { id: invItem.id },
        data: { quantity: invItem.quantity + 1 }
      });
    } else {
      await prisma.playerInventoryItem.create({
        data: { userId, itemSlug: resourceSlug, quantity: 1 }
      });
    }

    // 4. Grant XP
    this.engine.events.emit("grantSkillXp", { accountId, skillSlug, amount: xpAmount });

    // 5. Notify Client
    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message: `Harvested +1 ${resourceSlug}` }
    });
    
    // Phase 7: Deplete Node
    this.worldManager.depleteNode(instance.instanceId, x, y, respawnTimeMs);

    // 6. Degrade Tool Durability (if using one)
    if (pickaxe && pickaxe.durability !== null) {
      const newDurability = pickaxe.durability - 1;
      if (newDurability <= 0) {
        // Destroy tool
        await prisma.playerInventoryItem.delete({ where: { id: pickaxe.id } });
        this.engine.events.emit("directMessage", {
          socketId,
          event: "show_toast",
          data: { message: `Your axe_bronze broke!` }
        });
      } else {
        await prisma.playerInventoryItem.update({
          where: { id: pickaxe.id },
          data: { durability: newDurability }
        });
      }
    }
  }

  private handleEntityDeath(data: { entityId: string, mapId: string, x: number, y: number }) {
    const lootId = `loot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const items = [
      { itemId: "monster_bone", quantity: 1 },
      { itemId: "copper_coin", quantity: Math.floor(Math.random() * 15) + 5 }
    ];

    this.activeLootBags.set(lootId, { mapId: data.mapId, x: data.x, y: data.y, items });

    // Let the network know a loot bag dropped
    this.engine.events.emit("networkBroadcast", {
      room: data.mapId,
      event: "loot_dropped",
      data: { id: lootId, x: data.x, y: data.y, items }
    });
  }

  private async pickupLoot(accountId: string, socketId: string, lootId: string, loot: any) {
    const dbUser = await prisma.account.findFirst({
      where: { id: accountId },
      select: { userId: true }
    });
    if (!dbUser) return;

    for (const item of loot.items) {
      const invItem = await prisma.playerInventoryItem.findFirst({
        where: { userId: dbUser.userId, itemSlug: item.itemId }
      });

      if (invItem) {
        await prisma.playerInventoryItem.update({
          where: { id: invItem.id },
          data: { quantity: invItem.quantity + item.quantity }
        });
      } else {
        await prisma.playerInventoryItem.create({
          data: { userId: dbUser.userId, itemSlug: item.itemId, quantity: item.quantity }
        });
      }
    }

    this.activeLootBags.delete(lootId);

    // Notify client
    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message: `Looted ${loot.items.length} items!` }
    });
    
    // Broadcast loot bag despawn
    this.engine.events.emit("networkBroadcast", {
      room: loot.mapId,
      event: "loot_despawned",
      data: { id: lootId }
    });
  }
}
