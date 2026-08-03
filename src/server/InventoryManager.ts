import { GameEngine } from "./GameEngine";
import { WorldManager } from "./WorldManager";
import { PlayerManager } from "./PlayerManager";
import { PrismaClient } from "@prisma/client";
import { toBaseMapId } from "@/shared/net/mapIds";

const prisma = new PrismaClient();

// Using require for legacy map loader
const mapLoader = require("../engine/map-loader.js");

// MapLogicTile ids: 5 = Wood Tree, 6 = Ore Rock
const RESOURCE_NODE_MAP: Record<
  number,
  { skillSlug: string; resourceSlug: string; xpAmount: number; respawnTimeMs: number }
> = {
  5: { skillSlug: "woodcutting", resourceSlug: "wood_log", xpAmount: 25, respawnTimeMs: 10000 },
  6: { skillSlug: "mining", resourceSlug: "ore_copper", xpAmount: 25, respawnTimeMs: 15000 },
};

async function resolveUserId(accountOrUserId: string): Promise<string | null> {
  if (!accountOrUserId) return null;
  const asAccount = await prisma.account.findFirst({
    where: { id: accountOrUserId },
    select: { userId: true },
  });
  if (asAccount?.userId) return asAccount.userId;
  const asUser = await prisma.user.findFirst({
    where: { id: accountOrUserId },
    select: { id: true },
  });
  return asUser?.id ?? null;
}

export class InventoryManager {
  private activeLootBags = new Map<
    string,
    { mapId: string; x: number; y: number; items: { itemId: string; quantity: number }[] }
  >();

  constructor(
    private engine: GameEngine,
    private worldManager: WorldManager,
    private playerManager?: PlayerManager
  ) {
    this.engine.events.on("gatherInteractRequest", (data) => this.handleGather(data));
    this.engine.events.on("entityDeath", (data) => this.handleEntityDeath(data));
    this.engine.events.on("pickupLootRequest", (data) => this.handlePickupLootRequest(data));
    this.engine.events.on("grantRewards", (data) => this.handleGrantRewards(data));
  }

  public async initialize() {
    console.log("[InventoryManager] Initialized ARPG Economy Engine");
    // ALIGNMENT E.2 — push cold inventory on lobby join so web marketplace buys appear
    this.engine.events.on(
      "playerInventorySyncRequest",
      async (data: { socketId: string; accountId: string }) => {
        const userId = await resolveUserId(data.accountId);
        if (!userId || !data.socketId) return;
        await this.syncInventory(data.socketId, userId);
      }
    );
    // CONTINUE #2 — restore personal bramble clears (and Q4-completed gate) on join
    this.engine.events.on(
      "playerBrambleHydrateRequest",
      async (data: { socketId: string; accountId: string; mapId?: string }) => {
        await this.hydratePersonalBramble(data);
      }
    );
  }

  private async hydratePersonalBramble(data: {
    socketId: string;
    accountId: string;
    mapId?: string;
  }) {
    if (!this.worldManager || !data.socketId || !data.accountId) return;
    const userId = await resolveUserId(data.accountId);
    if (!userId) return;
    const accountKeys = Array.from(new Set([data.accountId, userId]));
    const baseMapId = toBaseMapId(data.mapId || "DEMO_SANDBOX");

    // If Q4 already completed, re-open the full gate for this account
    try {
      const q4 = await prisma.playerQuestState.findFirst({
        where: {
          userId,
          questSlug: "quest_wilderness_clearance",
          status: "COMPLETED",
        },
      });
      if (q4) {
        this.worldManager.clearDemoBrambleGateForAccount(accountKeys);
      }
    } catch (e) {
      console.warn("[InventoryManager] bramble hydrate quest lookup failed", e);
    }

    const cells = new Map<string, { x: number; y: number }>();
    for (const key of accountKeys) {
      for (const cell of this.worldManager.listClearedBramble(key)) {
        cells.set(`${cell.x},${cell.y}`, cell);
      }
    }
    for (const cell of cells.values()) {
      this.engine.events.emit("directMessage", {
        socketId: data.socketId,
        event: "tile_changed",
        data: { mapId: baseMapId, x: cell.x, y: cell.y, tileId: 0 },
      });
    }
  }

  private async syncInventory(socketId: string, userId: string) {
    const invRows = await prisma.playerInventoryItem.findMany({ where: { userId } });
    const inventory: Record<string, number> = {};
    for (const row of invRows) {
      inventory[row.itemSlug] = (inventory[row.itemSlug] || 0) + row.quantity;
    }
    this.engine.events.emit("directMessage", {
      socketId,
      event: "inventory_sync",
      data: { inventory },
    });
  }

  private async handleGrantRewards(data: {
    accountId: string;
    socketId?: string;
    rewards: { items?: { slug: string; qty: number }[]; gold?: number };
  }) {
    const userId = await resolveUserId(data.accountId);
    if (!userId || !data.rewards?.items?.length) return;
    for (const item of data.rewards.items) {
      const existing = await prisma.playerInventoryItem.findFirst({
        where: { userId, itemSlug: item.slug },
      });
      if (existing) {
        await prisma.playerInventoryItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.qty },
        });
      } else {
        await prisma.playerInventoryItem.create({
          data: { userId, itemSlug: item.slug, quantity: item.qty },
        });
      }
    }
    if (data.socketId) {
      await this.syncInventory(data.socketId, userId);
      this.engine.events.emit("directMessage", {
        socketId: data.socketId,
        event: "show_toast",
        data: { message: "Quest rewards received." },
      });
    }
  }

  private resolveGatherInstance(accountId: string, mapId: string) {
    const player = this.playerManager?.getPlayerByAccountId(accountId);
    if (player?.mapId) {
      const byPlayer = this.worldManager.getInstance(player.mapId);
      if (byPlayer) return byPlayer;
    }
    return this.worldManager.resolveInstance(mapId);
  }

  private async handleGather({ accountId, socketId, mapId, x, y }: any) {
    const instance = this.resolveGatherInstance(accountId, mapId);
    if (!instance) return;

    // 1. Check if there's a loot bag here
    let foundLootId = null;
    let foundLoot = null;
    for (const [lootId, loot] of this.activeLootBags.entries()) {
      if (loot.mapId === instance.mapId || loot.mapId === instance.instanceId) {
        if (loot.x === x && loot.y === y) {
          foundLootId = lootId;
          foundLoot = loot;
          break;
        }
      }
    }

    if (foundLootId && foundLoot) {
      await this.pickupLoot(accountId, socketId, foundLootId, foundLoot);
      return;
    }

    // Ensure map definition is cached
    let mapDef = mapLoader.getMapDataSync(instance.mapId);
    if (!mapDef) {
      await mapLoader.loadMapData(instance.mapId);
      mapDef = mapLoader.getMapDataSync(instance.mapId);
    }
    if (!mapDef || !mapDef.grid || !mapDef.grid[y] || mapDef.grid[y][x] === undefined) return;

    const tileId = mapDef.grid[y][x];

    // Q4: Clear bramble (axe + party companion)
    if (tileId === 11) {
      const userIdEarly = await resolveUserId(accountId);
      if (
        userIdEarly &&
        (this.worldManager.hasAccountClearedBramble(accountId, x, y) ||
          this.worldManager.hasAccountClearedBramble(userIdEarly, x, y))
      ) {
        this.engine.events.emit("directMessage", {
          socketId,
          event: "show_toast",
          data: { message: "You already cleared this bramble." },
        });
        return;
      }
      await this.handleClearBramble({ accountId, socketId, instance, x, y });
      return;
    }

    const nodeConfig = RESOURCE_NODE_MAP[tileId];
    if (!nodeConfig) return;

    if (this.worldManager.isNodeDepleted(instance.instanceId, x, y)) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message: "This resource is depleted." },
      });
      return;
    }

    const { resourceSlug, skillSlug, xpAmount, respawnTimeMs } = nodeConfig;

    const userId = await resolveUserId(accountId);
    if (!userId) return;

    const requiredToolSlug = skillSlug === "mining" ? "pickaxe_bronze" : "axe_bronze";
    const tool = await prisma.playerInventoryItem.findFirst({
      where: { userId, itemSlug: requiredToolSlug },
    });

    if (!tool) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message: `You need a ${requiredToolSlug.replace("_", " ")} to gather here.` },
      });
      return;
    }

    let invItem = await prisma.playerInventoryItem.findFirst({
      where: { userId, itemSlug: resourceSlug },
    });

    if (invItem) {
      await prisma.playerInventoryItem.update({
        where: { id: invItem.id },
        data: { quantity: invItem.quantity + 1 },
      });
    } else {
      await prisma.playerInventoryItem.create({
        data: { userId, itemSlug: resourceSlug, quantity: 1 },
      });
    }

    this.engine.events.emit("grantSkillXp", { accountId, skillSlug, amount: xpAmount });

    this.engine.events.emit("itemGathered", {
      accountId,
      targetSlug: resourceSlug,
      amount: 1,
      socketId,
    });

    if (tool.durability !== null && tool.durability !== undefined) {
      const newDurability = tool.durability - 1;
      if (newDurability <= 0) {
        await prisma.playerInventoryItem.delete({ where: { id: tool.id } });
        this.engine.events.emit("directMessage", {
          socketId,
          event: "show_toast",
          data: { message: `Your ${requiredToolSlug} broke!` },
        });
      } else {
        await prisma.playerInventoryItem.update({
          where: { id: tool.id },
          data: { durability: newDurability },
        });
      }
    }

    await this.syncInventory(socketId, userId);

    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message: `Harvested +1 ${resourceSlug}` },
    });

    this.worldManager.setNodeDepleted(instance.instanceId, x, y, respawnTimeMs);
  }

  private async handleClearBramble({
    accountId,
    socketId,
    instance,
    x,
    y,
  }: {
    accountId: string;
    socketId: string;
    instance: { instanceId: string; mapId: string };
    x: number;
    y: number;
  }) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    const axe = await prisma.playerInventoryItem.findFirst({
      where: { userId, itemSlug: "axe_bronze" },
    });
    if (!axe) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message: "You need a Rook Hatchet to clear bramble." },
      });
      return;
    }

    const party = await prisma.playerCreature.findFirst({
      where: { userId, isParty: true },
    });
    if (!party) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message: "Your companion must be in the party to clear bramble." },
      });
      return;
    }

    const accountKeys = Array.from(new Set([accountId, userId].filter(Boolean)));
    const baseMapId = toBaseMapId(instance.mapId);

    // CONTINUE #2 — personal clear; shared DEMO grid stays bramble for other accounts/shards
    const cleared = this.worldManager.clearBrambleForAccount(
      accountKeys,
      baseMapId,
      x,
      y
    );
    if (!cleared) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message: "Could not clear that bramble." },
      });
      return;
    }

    // Open the full demo gate for this account so north grass is reachable
    const gateCells = this.worldManager.clearDemoBrambleGateForAccount(accountKeys);
    for (const cell of gateCells) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "tile_changed",
        data: { mapId: baseMapId, x: cell.x, y: cell.y, tileId: 0 },
      });
    }

    this.engine.events.emit("brambleCleared", {
      accountId,
      socketId,
      targetSlug: "bramble",
      amount: 1,
      x,
      y,
    });

    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message: "Bramble cleared — the north path opens." },
    });
  }

  private handleEntityDeath(data: { entityId: string; mapId: string; x: number; y: number }) {
    const lootId = `loot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const items = [
      { itemId: "monster_bone", quantity: 1 },
      { itemId: "copper_coin", quantity: Math.floor(Math.random() * 15) + 5 },
    ];

    this.activeLootBags.set(lootId, { mapId: data.mapId, x: data.x, y: data.y, items });

    this.engine.events.emit("networkBroadcast", {
      room: data.mapId,
      event: "loot_dropped",
      data: { id: lootId, x: data.x, y: data.y, items },
    });

    setTimeout(() => {
      if (!this.activeLootBags.has(lootId)) return;
      const loot = this.activeLootBags.get(lootId)!;
      this.activeLootBags.delete(lootId);
      this.engine.events.emit("networkBroadcast", {
        room: loot.mapId,
        event: "loot_despawned",
        data: { id: lootId },
      });
    }, 60_000);
  }

  private handlePickupLootRequest(data: {
    accountId: string;
    socketId: string;
    mapId: string;
    x: number;
    y: number;
  }) {
    for (const [lootId, loot] of this.activeLootBags.entries()) {
      if (
        (loot.mapId === data.mapId || toBaseMapId(loot.mapId) === toBaseMapId(data.mapId)) &&
        loot.x === data.x &&
        loot.y === data.y
      ) {
        this.pickupLoot(data.accountId, data.socketId, lootId, loot);
        return;
      }
    }
  }

  private async pickupLoot(accountId: string, socketId: string, lootId: string, loot: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    for (const item of loot.items) {
      const invItem = await prisma.playerInventoryItem.findFirst({
        where: { userId, itemSlug: item.itemId },
      });

      if (invItem) {
        await prisma.playerInventoryItem.update({
          where: { id: invItem.id },
          data: { quantity: invItem.quantity + item.quantity },
        });
      } else {
        await prisma.playerInventoryItem.create({
          data: { userId, itemSlug: item.itemId, quantity: item.quantity },
        });
      }
    }

    this.activeLootBags.delete(lootId);

    await this.syncInventory(socketId, userId);

    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message: `Looted ${loot.items.length} items!` },
    });

    this.engine.events.emit("networkBroadcast", {
      room: loot.mapId,
      event: "loot_despawned",
      data: { id: lootId },
    });
  }
}
