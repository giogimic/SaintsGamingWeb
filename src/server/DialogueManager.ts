import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";
import { VANCE_TREE } from "./DemoBootstrap";
import { loadCreatureDef, toPlayerCreatureStats } from "./creatureDefs";
import {
  AZURE_GUIDE_NPC_ID,
  AZURE_GUIDE_TREE,
  resolveAzureGuideStartNode,
  type GuideContext,
} from "./spyderGuideDialogue";
import {
  CARLOS_DIALOGUE_TREE,
  SCOOP_CLERK_DIALOGUE_TREE,
  SCOOP_NURSE_DIALOGUE_TREE,
  SPYDER_QUEST_CHAIN,
} from "./spyderQuests";

const prisma = new PrismaClient();

const dialogueCache: Record<string, any> = {};

/** Built-in demo trees (always available even if DB empty). */
const BUILTIN_TREES: Record<string, any> = {
  npc_warden_vance: VANCE_TREE,
  warden_vance: VANCE_TREE,
  [AZURE_GUIDE_NPC_ID]: AZURE_GUIDE_TREE,
  azure_guide: AZURE_GUIDE_TREE,
  npc_cotton_tunnel_carlos: CARLOS_DIALOGUE_TREE,
  npc_cotton_scoop_clerk: SCOOP_CLERK_DIALOGUE_TREE,
  npc_cotton_scoop_nurse: SCOOP_NURSE_DIALOGUE_TREE,
};

const SPYDER_DEFAULT_STARTER = "budaye";

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
    this.engine.events.on("showTrainerPostBattleDialogue", (data) =>
      this.handleTrainerPostBattleDialogue(data)
    );
  }

  public async initialize() {
    console.log("[DialogueManager] Initialized (demo trees + DB)");
  }

  private normalizeNpcKey(npcId: string): string {
    // npc_azure_guide_1712345678 → npc_azure_guide
    let id = String(npcId || "").replace(/_\d{10,}$/, "");
    if (!id.startsWith("npc_")) id = `npc_${id.replace(/^npc_/, "")}`;
    return id;
  }

  private async getDialogueTree(npcId: string) {
    const key = this.normalizeNpcKey(npcId);
    const bare = key.replace(/^npc_/, "");
    if (dialogueCache[key]) return dialogueCache[key];
    if (dialogueCache[npcId]) return dialogueCache[npcId];
    if (dialogueCache[bare]) return dialogueCache[bare];

    for (const candidate of [key, bare, npcId, `npc_${bare}`]) {
      if (BUILTIN_TREES[candidate]) {
        dialogueCache[key] = BUILTIN_TREES[candidate];
        return BUILTIN_TREES[candidate];
      }
    }

    try {
      for (const candidate of [key, npcId, bare, `npc_${bare}`]) {
        const tree = await prisma.npcDialogueTree.findUnique({
          where: { npcId: candidate },
        });
        if (tree) {
          const parsed = JSON.parse(tree.data);
          dialogueCache[key] = parsed;
          return parsed;
        }
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
    dialogueCache[key] = fallback;
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

  private async buildGuideContext(userId: string): Promise<GuideContext> {
    const party = await prisma.playerCreature.findFirst({
      where: { userId, isParty: true },
      select: { id: true },
    });
    const states = await prisma.playerQuestState.findMany({
      where: {
        userId,
        questSlug: {
          in: SPYDER_QUEST_CHAIN.map((q) => q.slug),
        },
      },
    });
    const activeRow = states.find((s) => s.status === "ACTIVE") || null;
    const completedSlugs = new Set(
      states.filter((s) => s.status === "COMPLETED").map((s) => s.questSlug)
    );
    return {
      hasPartyCreature: !!party,
      active: activeRow
        ? {
            slug: activeRow.questSlug,
            status: activeRow.status,
            currentStage: activeRow.currentStage,
          }
        : null,
      completedSlugs,
    };
  }

  private async grantSpyderStarter(userId: string, socketId: string): Promise<boolean> {
    const existing = await prisma.playerCreature.findFirst({
      where: { userId, isParty: true },
    });
    if (existing) {
      this.toast(socketId, `${existing.nickname || existing.speciesSlug} is already in your party.`);
      return false;
    }

    const def = await loadCreatureDef(SPYDER_DEFAULT_STARTER);
    if (!def) {
      this.toast(socketId, "Starter companion unavailable — try the Lab.");
      return false;
    }

    await prisma.playerCreature.create({
      data: {
        userId,
        speciesSlug: def.slug,
        nickname: def.name,
        level: def.starterLevel,
        currentHp: def.baseHp,
        maxHp: def.baseHp,
        stats: JSON.stringify(toPlayerCreatureStats(def)),
        abilities: JSON.stringify(def.abilities),
        isParty: true,
        slotIndex: 0,
      },
    });

    this.engine.events.emit("directMessage", {
      socketId,
      event: "starter_claimed",
      data: {
        creature: { speciesSlug: def.slug, nickname: def.name },
        def: {
          slug: def.slug,
          name: def.name,
          typePrimary: def.typePrimary,
          typeSecondary: def.typeSecondary,
          spriteOverworld: def.spriteOverworld,
        },
        alreadyOwned: false,
      },
    });
    this.toast(socketId, `${def.name} joined your party!`);
    this.engine.events.emit("starterClaimed", {
      accountId: userId,
      socketId,
      targetSlug: "starter",
      amount: 1,
      speciesSlug: def.slug,
    });
    return true;
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

    if (action === "OPEN_SHOP") {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "demo_open_shop",
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

    if (action === "GRANT_SPYDER_STARTER") {
      await this.grantSpyderStarter(userId, socketId);
      return;
    }

    if (action === "HEAL_PARTY") {
      const party = await prisma.playerCreature.findMany({
        where: { userId, isParty: true },
      });
      for (const c of party) {
        if (c.currentHp >= c.maxHp) continue;
        await prisma.playerCreature.update({
          where: { id: c.id },
          data: { currentHp: c.maxHp },
        });
      }
      const sync = await prisma.playerCreature.findMany({
        where: { userId, isParty: true },
        select: { id: true, currentHp: true, maxHp: true },
      });
      this.engine.events.emit("directMessage", {
        socketId,
        event: "party_creatures_hp",
        data: { creatures: sync },
      });
      this.toast(socketId, "Your party was fully healed.");
      return;
    }

    if (action === "START_TRAINER_BATTLE") {
      // Handled in handleDialogueSelect with npc context
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
    // Strip spawn suffixes (npc_azure_guide_1712345678 → npc_azure_guide)
    return this.normalizeNpcKey(id);
  }

  private async handleTrainerPostBattleDialogue({
    socketId,
    npcId,
    trainerName,
    node,
  }: {
    socketId: string;
    npcId: string;
    trainerName?: string;
    node: string;
    result?: string;
  }) {
    const id = this.normalizeNpcId(npcId);
    const tree = await this.getDialogueTree(id);
    const nodeData = tree[node];
    if (!nodeData) return;

    this.engine.events.emit("directMessage", {
      socketId,
      event: "dialogue_start",
      data: {
        npcId: id,
        npcName: trainerName || (id === "npc_cotton_tunnel_carlos" ? "Carlos" : undefined),
        node,
        text: nodeData.text,
        options: nodeData.options,
      },
    });
  }

  private async handleNpcInteract({ accountId, socketId, mapId, targetId }: any) {
    const npcId = this.normalizeNpcId(targetId);
    const tree = await this.getDialogueTree(npcId);

    let startKey = "node_start";
    if (npcId === AZURE_GUIDE_NPC_ID) {
      const userId = await resolveUserId(accountId);
      if (userId) {
        const ctx = await this.buildGuideContext(userId);
        startKey = resolveAzureGuideStartNode(ctx);
      }
    }

    const startNode = tree[startKey] || tree["node_start"];
    if (!startNode) return;

    // Quest engine listens on engine `dialogue_start` (not the socket event).
    this.engine.events.emit("dialogue_start", {
      accountId,
      socketId,
      mapId,
      targetSlug: npcId,
      npcId,
    });

    const npcName =
      npcId.includes("vance")
        ? "Warden Vance"
        : npcId === AZURE_GUIDE_NPC_ID
          ? "Azure Guide"
          : undefined;

    this.engine.events.emit("directMessage", {
      socketId,
      event: "dialogue_start",
      data: {
        npcId,
        npcName,
        node: startKey,
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
      // Spyder on-ramp: film + party companion so Route 1 TB is immediately playable
      if (questSlug === "quest_azure_welcome") {
        const userId = await resolveUserId(accountId);
        if (userId) {
          await addItems(userId, [
            { slug: "soul_camera", qty: 1 },
            { slug: "film_standard", qty: 5 },
          ]);
          await this.syncInv(socketId, userId);
          this.toast(socketId, "Received Soul Camera + 5× Standard Film.");
          await this.grantSpyderStarter(userId, socketId);
        }
      }
    }

    if (action === "START_TRAINER_BATTLE") {
      const isCarlos = npcId === "npc_cotton_tunnel_carlos";
      const trainerName = isCarlos ? "Carlos" : "Trainer";
      // Carlos: Dragarbor → Pairagrin (sequential multi-foe)
      const speciesSlugs = isCarlos
        ? ["dragarbor", "pairagrin"]
        : ["rockitten"];
      const levels = isCarlos ? [10, 9] : [6];
      this.engine.events.emit("startTrainerBattle", {
        accountId,
        socketId,
        mapId,
        trainerNpcId: npcId,
        trainerName,
        speciesSlug: speciesSlugs[0],
        speciesSlugs,
        level: levels[0],
        levels,
      });
      this.engine.events.emit("directMessage", {
        socketId,
        event: "dialogue_end",
        data: { npcId },
      });
      return;
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
