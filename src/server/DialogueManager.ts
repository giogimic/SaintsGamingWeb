import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";
import { VANCE_TREE } from "./DemoBootstrap";
import { DEMO_NPC_DIALOGUES } from "./demoMapSeed";

const prisma = new PrismaClient();

const dialogueCache: Record<string, any> = {};

/** Built-in demo trees (always available even if DB empty). */
const BUILTIN_TREES: Record<string, any> = {
  npc_warden_vance: VANCE_TREE,
  warden_vance: VANCE_TREE,
  ...Object.fromEntries(
    Object.entries(DEMO_NPC_DIALOGUES).flatMap(([npcId, entry]) => [
      [npcId, entry.tree],
      [npcId.replace(/^npc_/, ""), entry.tree],
    ])
  ),
};

/** Strip spawn timestamp suffix: npc_foo_1712345678901 → npc_foo */
function normalizeNpcId(npcId: string): string {
  if (!npcId) return npcId;
  const stripped = npcId.replace(/_\d{10,}$/, "");
  return stripped.startsWith("npc_") ? stripped : `npc_${stripped.replace(/^npc_/, "")}`;
}

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
    const key = normalizeNpcId(npcId);
    const bare = key.replace(/^npc_/, "");
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
    if (BUILTIN_TREES[bare]) {
      dialogueCache[bare] = BUILTIN_TREES[bare];
      return BUILTIN_TREES[bare];
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
      const tree3 = await prisma.npcDialogueTree.findUnique({ where: { npcId: bare } });
      if (tree3) {
        const parsed = JSON.parse(tree3.data);
        dialogueCache[bare] = parsed;
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

  private async buildQuestReport(userId: string): Promise<{ toast: string; text: string }> {
    const state = await prisma.playerQuestState.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { acceptedAt: "desc" },
    });
    if (!state) {
      return {
        toast: "No active quest — take the Starter Toolbelt to begin Q1.",
        text: "You're not on a marked job. Take the Starter Toolbelt and we'll put you on the road to Aethervale.",
      };
    }
    const template = await prisma.questTemplate.findUnique({
      where: { slug: state.questSlug },
      include: { objectives: { where: { stage: state.currentStage } } },
    });
    const obj = template?.objectives?.[0];
    if (!obj) {
      return {
        toast: `${template?.title || state.questSlug}: check the tracker.`,
        text: "Keep at it. Your tracker on the right shows the next mark.",
      };
    }
    if (obj.type === "TALK") {
      return {
        toast: `Turning in: ${template?.title}`,
        text: `Good work on ${template?.title}. I'll mark that complete — watch the tracker for what opens next.`,
      };
    }
    return {
      toast: `${template?.title}: ${state.progress}/${obj.requiredQty} — ${obj.description}`,
      text: `Still on ${template?.title}. Next: ${obj.description} (${state.progress}/${obj.requiredQty}). ${
        obj.type === "GATHER" && obj.targetSlug === "wood_log"
          ? "Chop Wood Logs first in the southeast trees, then mine Copper Ore."
          : obj.type === "GATHER"
            ? "Southeast rocks after the logs."
            : obj.type === "CRAFT"
              ? "Shop tile west of plaza, or the craft table beside it."
              : obj.type === "CLAIM"
                ? "Open the Lab from my dialogue or Party menu."
                : obj.type === "CLEAR"
                  ? "Face the dark thicket on the north path — E with hatchet and your companion."
                  : "Check the quest tracker."
      }`,
    };
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
      const report = await this.buildQuestReport(userId);
      this.toast(socketId, report.toast);
      // Progress TALK objectives for active demo quests (turn-in stages)
      this.engine.events.emit("dialogue_start", {
        accountId,
        socketId,
        targetSlug: "npc_warden_vance",
      });
      // Override next dialogue line with state-aware copy when selecting report
      this.engine.events.emit("directMessage", {
        socketId,
        event: "dialogue_start",
        data: {
          npcId: "npc_warden_vance",
          npcName: "Warden Vance",
          node: "node_report",
          text: report.text,
          options: [{ label: "Understood.", nextNode: "exit" }],
        },
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

    // DEMO_QUEST_REPORT already sent its own dialogue_start payload
    if (action === "DEMO_QUEST_REPORT") {
      return;
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
