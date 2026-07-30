import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// In-memory cache of dialogue trees to prevent DB spam
const dialogueCache: Record<string, any> = {};

export class DialogueManager {
  constructor(private engine: GameEngine) {
    this.engine.events.on("npcInteractRequest", (data) => this.handleNpcInteract(data));
    this.engine.events.on("dialogueSelectAction", (data) => this.handleDialogueSelect(data));
  }

  public async initialize() {
    console.log("[DialogueManager] Initialized");
    // Pre-load common dialogue trees if needed
  }

  private async getDialogueTree(npcId: string) {
    if (dialogueCache[npcId]) return dialogueCache[npcId];

    try {
      const tree = await prisma.npcDialogueTree.findUnique({
        where: { npcId }
      });
      if (tree) {
        const parsed = JSON.parse(tree.data);
        dialogueCache[npcId] = parsed;
        return parsed;
      }
    } catch (e) {
      console.error(`[DialogueManager] Failed to load dialogue for ${npcId}`, e);
    }
    
    // Fallback generic dialogue if none exists
    const fallback = {
      node_start: {
        text: "I have nothing more to say to you.",
        options: [
          { label: "Goodbye.", nextNode: "exit" }
        ]
      }
    };
    dialogueCache[npcId] = fallback;
    return fallback;
  }

  private async handleNpcInteract({ accountId, socketId, mapId, targetId }: any) {
    // 1. Verify range (player must be adjacent to targetId)
    // For now, we trust the client interaction range just to demonstrate the state machine
    
    // 2. Fetch Dialogue
    const tree = await this.getDialogueTree(targetId);
    
    // 3. Evaluate conditional options on 'node_start'
    // Here we'd check playerQuestState from prisma to filter options.
    // For now, we just pass all options.
    const startNode = tree["node_start"];
    
    if (!startNode) return;

    this.engine.events.emit("directMessage", {
      socketId,
      event: "dialogue_start",
      data: {
        npcId: targetId,
        node: "node_start",
        text: startNode.text,
        options: startNode.options
      }
    });
  }

  private async handleDialogueSelect({ accountId, socketId, mapId, targetId, nextNode }: any) {
    if (nextNode === "exit") {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "dialogue_end",
        data: { npcId: targetId }
      });
      return;
    }

    const tree = await this.getDialogueTree(targetId);
    const nodeData = tree[nextNode];

    if (!nodeData) {
      // Invalid node
      this.engine.events.emit("directMessage", {
        socketId,
        event: "dialogue_end",
        data: { npcId: targetId }
      });
      return;
    }

    // Evaluate actions on selection (e.g. accepting a quest)
    if (nodeData.action === "ACCEPT_QUEST" && nodeData.questSlug) {
      // Create PlayerQuestState
      try {
        const dbUser = await prisma.account.findFirst({
          where: { id: accountId },
          select: { userId: true }
        });
        
        if (dbUser) {
           await prisma.playerQuestState.upsert({
            where: {
              userId_questSlug: { userId: dbUser.userId, questSlug: nodeData.questSlug }
            },
            update: { status: "ACTIVE" },
            create: { userId: dbUser.userId, questSlug: nodeData.questSlug, status: "ACTIVE" }
          });
          console.log(`[DialogueManager] ${accountId} accepted quest ${nodeData.questSlug}`);
        }
      } catch (e) {
        console.error("Failed to accept quest", e);
      }
    }

    this.engine.events.emit("directMessage", {
      socketId,
      event: "dialogue_start",
      data: {
        npcId: targetId,
        node: nextNode,
        text: nodeData.text,
        options: nodeData.options
      }
    });
  }
}
