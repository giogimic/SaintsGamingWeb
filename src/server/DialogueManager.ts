import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";
import { VANCE_TREE } from "./DemoBootstrap";

const prisma = new PrismaClient();

const dialogueCache: Record<string, any> = {};

/** Built-in demo trees (always available even if DB empty). */
const BUILTIN_TREES: Record<string, any> = {
  npc_warden_vance: VANCE_TREE,
  warden_vance: VANCE_TREE,
};

async function resolveUserId(accountOrUserId: string): Promise<string | null> {
  if (!accountOrUserId || accountOrUserId.startsWith("acc_")) return null;
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

async function addItems(userId: string, items: { slug: string; qty: number }[]) {
  for (const item of items) {
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
}

async function inventorySnapshot(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.playerInventoryItem.findMany({ where: { userId } });
  const inv: Record<string, number> = {};
  for (const row of rows) {
    inv[row.itemSlug] = (inv[row.itemSlug] || 0) + row.quantity;
  }
  return inv;
}

export class DialogueManager {
  constructor(private engine: GameEngine) {
    this.engine.events.on("npcInteractRequest", (data) => this.handleNpcInteract(data));
    this.engine.events.on("dialogueSelectAction", (data) => this.handleDialogueSelect(data));
  }

  public async initialize() {
    console.log("[DialogueManager] Initialized (demo trees + DB)");
  }

  private async getDialogueTree(npcId: string) {
    const key = npcId.startsWith("npc_") ? npcId : `npc_${npcId}`;
    if (dialogueCache[key]) return dialogueCache[key];
    if (dialogueCache[npcId]) return dialogueCache[npcId];

    if (BUILTIN_TREES[npcId]) {
      dialogueCache[npcId] = BUILTIN_TREES[npcId];
      return BUILTIN_TREES[npcId];
    }
    if (BUILTIN_TREES[key]) {
      dialogueCache[key] = BUILTIN_TREES[key];
      return BUILTIN_TREES[key];
    }

    try {
      const tree = await prisma.npcDialogueTree.findUnique({
        where: { npcId: key },
      });
      if (tree) {
        const parsed = JSON.parse(tree.data);
        dialogueCache[key] = parsed;
        return parsed;
      }
      const tree2 = await prisma.npcDialogueTree.findUnique({ where: { npcId } });
      if (tree2) {
        const parsed = JSON.parse(tree2.data);
        dialogueCache[npcId] = parsed;
        return parsed;
      }
    } catch (e) {
      console.error(`[DialogueManager] Failed to load dialogue for ${npcId}`, e);
    }

    const fallback = {
      node_start: {
        text: "I have nothing more to say to you.",
        options: [{ label: "Goodbye.", nextNode: "exit" }],
      },
    };
    dialogueCache[npcId] = fallback;
    return fallback;
  }

  private toast(socketId: string, message: string) {
    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message },
    });
  }

  private async syncInv(socketId: string, userId: string) {
    const inventory = await inventorySnapshot(userId);
    this.engine.events.emit("directMessage", {
      socketId,
      event: "inventory_sync",
      data: { inventory },
    });
  }

  private async runAction(
    action: string | undefined,
    accountId: string,
    socketId: string
  ) {
    if (!action) return;

    if (action === "OPEN_LAB") {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "demo_open_lab",
        data: {},
      });
      return;
    }

    if (action === "ACCEPT_QUEST") {
      // Handled separately with questSlug
      return;
    }

    const userId = await resolveUserId(accountId);
    if (!userId) {
      this.toast(socketId, "No character found for grants.");
      return;
    }

    if (action === "GRANT_DEMO_TOOLS") {
      await addItems(userId, [
        { slug: "axe_bronze", qty: 1 },
        { slug: "pickaxe_bronze", qty: 1 },
      ]);
      await this.syncInv(socketId, userId);
      this.toast(socketId, "Received Rook Hatchet & Crude Pickaxe.");
      this.engine.events.emit("acceptQuest", {
        accountId,
        questSlug: "quest_tools_of_trade",
        socketId,
      });
      return;
    }

    if (action === "DEMO_QUEST_REPORT") {
      // Progress TALK objectives for active demo quests
      this.engine.events.emit("dialogue_start", {
        accountId,
        socketId,
        targetSlug: "npc_warden_vance",
      });
      return;
    }

    if (action === "GRANT_DEMO_FILM") {
      await addItems(userId, [
        { slug: "soul_camera", qty: 1 },
        { slug: "film_standard", qty: 5 },
      ]);
      await this.syncInv(socketId, userId);
      this.toast(socketId, "Received Soul Camera + 5× Standard Film.");
      return;
    }
  }

  private normalizeNpcId(targetId: string): string {
    const id = String(targetId || "");
    if (id.includes("vance") || id.includes("warden")) return "npc_warden_vance";
    return id;
  }

  private async handleNpcInteract({ accountId, socketId, mapId, targetId }: any) {
    const npcId = this.normalizeNpcId(targetId);
    const tree = await this.getDialogueTree(npcId);
    const startNode = tree["node_start"];
    if (!startNode) return;

    this.engine.events.emit("directMessage", {
      socketId,
      event: "dialogue_start",
      data: {
        npcId,
        npcName: npcId.includes("vance") ? "Warden Vance" : undefined,
        node: "node_start",
        text: startNode.text,
        options: startNode.options,
      },
    });
  }

  private async handleDialogueSelect({
    accountId,
    socketId,
    mapId,
    targetId,
    nextNode,
    action,
    questSlug,
  }: any) {
    const npcId = this.normalizeNpcId(targetId);

    if (action) {
      await this.runAction(action, accountId, socketId);
    }

    if (action === "ACCEPT_QUEST" && questSlug) {
      this.engine.events.emit("acceptQuest", { accountId, questSlug, socketId });
    }

    if (nextNode === "exit") {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "dialogue_end",
        data: { npcId },
      });
      return;
    }

    const tree = await this.getDialogueTree(npcId);
    const nodeData = tree[nextNode];

    if (!nodeData) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "dialogue_end",
        data: { npcId },
      });
      return;
    }

    this.engine.events.emit("directMessage", {
      socketId,
      event: "dialogue_start",
      data: {
        npcId,
        npcName: npcId.includes("vance") ? "Warden Vance" : undefined,
        node: nextNode,
        text: nodeData.text,
        options: nodeData.options,
      },
    });
  }
}
