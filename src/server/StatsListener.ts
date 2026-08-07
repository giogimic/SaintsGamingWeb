import { gameEvents } from "@/shared/events/gameEventBus";
import { prisma } from "@/web/lib/prisma";

export function registerStatsListeners() {
  gameEvents.subscribe("creature.captured", async ({ userId }) => {
    try {
      await prisma.playerStats.upsert({
        where: { userId },
        update: { creaturesOwned: { increment: 1 } },
        create: { userId, creaturesOwned: 1 },
      });
    } catch (e) {
      console.error("[StatsListener] Error updating creaturesOwned:", e);
    }
  });

  gameEvents.subscribe("item.crafted", async ({ userId, quantity }) => {
    try {
      await prisma.playerStats.upsert({
        where: { userId },
        update: { itemsCrafted: { increment: quantity || 1 } },
        create: { userId, itemsCrafted: quantity || 1 },
      });
    } catch (e) {
      console.error("[StatsListener] Error updating itemsCrafted:", e);
    }
  });

  gameEvents.subscribe("quest.completed", async ({ userId }) => {
    try {
      await prisma.playerStats.upsert({
        where: { userId },
        update: { questsCompleted: { increment: 1 } },
        create: { userId, questsCompleted: 1 },
      });
    } catch (e) {
      console.error("[StatsListener] Error updating questsCompleted:", e);
    }
  });

  gameEvents.subscribe("trade.completed", async ({ userId, credits }) => {
    try {
      await prisma.playerStats.upsert({
        where: { userId },
        update: {
          tradesCompleted: { increment: 1 },
          creditsEarned: { increment: credits || 0 },
        },
        create: {
          userId,
          tradesCompleted: 1,
          creditsEarned: credits || 0,
        },
      });
    } catch (e) {
      console.error("[StatsListener] Error updating trade stats:", e);
    }
  });

  gameEvents.subscribe("skill.levelup", async ({ userId }) => {
    try {
      const skills = await prisma.playerSkill.findMany({
        where: { userId },
        select: { xp: true },
      });
      const totalXp = skills.reduce((acc, s) => acc + (s.xp || 0), 0);

      await prisma.playerStats.upsert({
        where: { userId },
        update: { combatXpTotal: totalXp },
        create: { userId, combatXpTotal: totalXp },
      });
    } catch (e) {
      console.error("[StatsListener] Error updating combatXpTotal:", e);
    }
  });

  console.log("[StatsListener] Registered GameEventBus stats listeners.");
}
