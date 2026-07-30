import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class QuestManager {
  constructor(private engine: GameEngine) {
    // Listen to global gameplay events
    this.engine.events.on("monsterKilled", (data) => this.handleEvent("KILL", data));
    this.engine.events.on("itemGathered", (data) => this.handleEvent("GATHER", data));
    this.engine.events.on("dialogue_start", (data) => this.handleEvent("TALK", data));
    this.engine.events.on("acceptQuest", (data) => this.acceptQuest(data));
  }

  public async initialize() {
    console.log("[QuestManager] Initialized event-driven quest engine");
  }

  private async handleEvent(eventType: string, data: any) {
    // data must include accountId and targetSlug (e.g. "goblin", "iron_ore", "npc_blacksmith")
    const { accountId, targetSlug } = data;
    if (!accountId || !targetSlug) return;

    try {
      // 1. Get the underlying userId for this connection
      const dbUser = await prisma.account.findFirst({
        where: { id: accountId },
        select: { userId: true }
      });
      if (!dbUser) return;
      
      const userId = dbUser.userId;

      // 2. Find all active quests for this player
      const activeStates = await prisma.playerQuestState.findMany({
        where: { userId, status: "ACTIVE" }
      });

      if (activeStates.length === 0) return;

      // 3. For each active quest, check if the current objective matches the event
      for (const state of activeStates) {
        const objective = await prisma.questObjective.findFirst({
          where: { questSlug: state.questSlug, stage: state.currentStage } as any 
          // Note: The schema links by questId, but in the fast-loop we'll query by slug if we denormalize,
          // or we fetch the template first. Let's fetch template to be safe.
        });

        // Let's do it properly via relations
        const template = await prisma.questTemplate.findUnique({
          where: { slug: state.questSlug },
          include: { objectives: { where: { stage: state.currentStage } } }
        });

        if (!template || template.objectives.length === 0) continue;
        const currentObjective = template.objectives[0];

        // 4. Evaluate match
        if (currentObjective.type === eventType && currentObjective.targetSlug === targetSlug) {
          // Increment progress
          const newProgress = state.progress + (data.amount || 1);
          
          if (newProgress >= currentObjective.requiredQty) {
            // Objective complete! Advance stage
            await this.advanceQuestStage(userId, accountId, state, template);
          } else {
            // Just update progress
            await prisma.playerQuestState.update({
              where: { id: state.id },
              data: { progress: newProgress }
            });
            this.notifyClient(accountId, `Quest Progress: ${newProgress}/${currentObjective.requiredQty}`);
          }
        }
      }
    } catch (e) {
      console.error("[QuestManager] Error processing event:", e);
    }
  }

  private async advanceQuestStage(userId: string, accountId: string, state: any, template: any) {
    const nextStage = state.currentStage + 1;
    
    // Check if next stage exists
    const hasNextStage = await prisma.questObjective.findFirst({
      where: { questId: template.id, stage: nextStage }
    });

    if (hasNextStage) {
      // Advance to next stage
      await prisma.playerQuestState.update({
        where: { id: state.id },
        data: { currentStage: nextStage, progress: 0 }
      });
      this.notifyClient(accountId, `Quest Updated: ${template.title}`);
    } else {
      // Quest Complete!
      await prisma.playerQuestState.update({
        where: { id: state.id },
        data: { status: "COMPLETED", completedAt: new Date() }
      });
      
      this.notifyClient(accountId, `Quest Completed: ${template.title}!`);
      
      // Apply rewards
      if (template.rewards) {
        const rewards = JSON.parse(template.rewards);
        // Dispatch to inventory/economy managers
        // (For now, we emit to the event bus for the PlayerManager to handle)
        this.engine.events.emit("grantRewards", { accountId, rewards });
      }
    }
  }

  public async acceptQuest({ accountId, questSlug }: { accountId: string, questSlug: string }) {
    try {
      const dbUser = await prisma.account.findFirst({
        where: { id: accountId },
        select: { userId: true }
      });
      if (!dbUser) return;
      
      const userId = dbUser.userId;

      // Check if already active or completed
      const existing = await prisma.playerQuestState.findFirst({
        where: { userId, questSlug }
      });

      if (existing) {
        console.log(`[QuestManager] Quest ${questSlug} already exists for ${userId}`);
        return;
      }

      await prisma.playerQuestState.create({
        data: {
          userId,
          questSlug,
          status: "ACTIVE",
          currentStage: 1,
          progress: 0
        }
      });

      const template = await prisma.questTemplate.findUnique({ where: { slug: questSlug }});
      if (template) {
        this.notifyClient(accountId, `Quest Accepted: ${template.title}`);
      }
    } catch (e) {
      console.error("[QuestManager] Error accepting quest:", e);
    }
  }

  private notifyClient(accountId: string, message: string) {
    // Need to find socketId for this accountId.
    // In a real system, the GameEngine keeps an Account->Socket mapping.
    // We will broadcast globally for now as a hack, or we can use the directMessage structure
    this.engine.events.emit("networkBroadcast", {
      event: "show_toast",
      data: { message }
    });
  }
}
