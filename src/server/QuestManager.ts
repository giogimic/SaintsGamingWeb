import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export class QuestManager {
  constructor(private engine: GameEngine) {
    this.engine.events.on("monsterKilled", (data) => this.handleEvent("KILL", data));
    this.engine.events.on("itemGathered", (data) => this.handleEvent("GATHER", data));
    this.engine.events.on("dialogue_start", (data) => this.handleEvent("TALK", data));
    this.engine.events.on("itemCrafted", (data) => this.handleEvent("CRAFT", data));
    this.engine.events.on("starterClaimed", (data) => this.handleEvent("CLAIM", data));
    this.engine.events.on("creatureCaptured", (data) => this.handleEvent("CLAIM", data));
    this.engine.events.on("brambleCleared", (data) => this.handleEvent("CLEAR", data));
    this.engine.events.on("acceptQuest", (data) => this.acceptQuest(data));
  }

  public async initialize() {
    console.log("[QuestManager] Initialized event-driven quest engine");
  }

  private async handleEvent(eventType: string, data: any) {
    const { accountId, targetSlug, socketId } = data;
    if (!accountId || !targetSlug) return;

    try {
      const userId = await resolveUserId(accountId);
      if (!userId) return;

      const activeStates = await prisma.playerQuestState.findMany({
        where: { userId, status: "ACTIVE" },
      });

      if (activeStates.length === 0) return;

      for (const state of activeStates) {
        const template = await prisma.questTemplate.findUnique({
          where: { slug: state.questSlug },
          include: { objectives: { where: { stage: state.currentStage } } },
        });

        if (!template || template.objectives.length === 0) continue;
        const currentObjective = template.objectives[0];

        if (
          currentObjective.type === eventType &&
          currentObjective.targetSlug === targetSlug
        ) {
          const newProgress = state.progress + (data.amount || 1);

          if (newProgress >= currentObjective.requiredQty) {
            await this.advanceQuestStage(userId, accountId, state, template, socketId);
          } else {
            await prisma.playerQuestState.update({
              where: { id: state.id },
              data: { progress: newProgress },
            });
            this.notifyClient(
              accountId,
              `${template.title}: ${newProgress}/${currentObjective.requiredQty} — ${currentObjective.description}`,
              socketId
            );
          }
        } else if (
          eventType === "GATHER" &&
          currentObjective.type === "GATHER" &&
          currentObjective.targetSlug !== targetSlug
        ) {
          this.notifyClient(
            accountId,
            `Q tracker wants ${currentObjective.targetSlug.replace(/_/g, " ")} first (${state.progress}/${currentObjective.requiredQty}).`,
            socketId
          );
        }
      }
    } catch (e) {
      console.error("[QuestManager] Error processing event:", e);
    }
  }

  private async advanceQuestStage(
    userId: string,
    accountId: string,
    state: any,
    template: any,
    socketId?: string
  ) {
    const nextStage = state.currentStage + 1;

    const hasNextStage = await prisma.questObjective.findFirst({
      where: { questId: template.id, stage: nextStage },
    });

    if (hasNextStage) {
      await prisma.playerQuestState.update({
        where: { id: state.id },
        data: { currentStage: nextStage, progress: 0 },
      });
      this.notifyClient(accountId, `Quest Updated: ${template.title}`, socketId);
    } else {
      await prisma.playerQuestState.update({
        where: { id: state.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      this.notifyClient(accountId, `Quest Completed: ${template.title}!`, socketId);

      if (template.rewards) {
        try {
          const rewards = JSON.parse(template.rewards);
          this.engine.events.emit("grantRewards", { accountId, socketId, rewards });
          if (rewards.nextQuest) {
            await this.acceptQuest({
              accountId,
              questSlug: rewards.nextQuest,
              socketId,
            });
          }
        } catch (e) {
          console.warn("[QuestManager] Bad rewards JSON", e);
        }
      }
    }
  }

  public async acceptQuest({
    accountId,
    questSlug,
    socketId,
  }: {
    accountId: string;
    questSlug: string;
    socketId?: string;
  }) {
    try {
      const userId = await resolveUserId(accountId);
      if (!userId) return;

      const existing = await prisma.playerQuestState.findFirst({
        where: { userId, questSlug },
      });

      if (existing) {
        if (existing.status === "COMPLETED") {
          console.log(`[QuestManager] Quest ${questSlug} already completed for ${userId}`);
          return;
        }
        console.log(`[QuestManager] Quest ${questSlug} already active for ${userId}`);
        this.notifyClient(accountId, "Quest already in progress.", socketId);
        return;
      }

      await prisma.playerQuestState.create({
        data: {
          userId,
          questSlug,
          status: "ACTIVE",
          currentStage: 1,
          progress: 0,
        },
      });

      const template = await prisma.questTemplate.findUnique({ where: { slug: questSlug } });
      if (template) {
        this.notifyClient(accountId, `Quest Accepted: ${template.title}`, socketId);
      }
    } catch (e) {
      console.error("[QuestManager] Error accepting quest:", e);
    }
  }

  private notifyClient(accountId: string, message: string, socketId?: string) {
    if (socketId) {
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message },
      });
      this.engine.events.emit("directMessage", {
        socketId,
        event: "quest_sync",
        data: { accountId },
      });
      return;
    }

    this.engine.events.emit("networkBroadcast", {
      event: "show_toast",
      data: { message },
    });
    this.engine.events.emit("networkBroadcast", {
      event: "quest_sync",
      data: { accountId },
    });
  }
}
