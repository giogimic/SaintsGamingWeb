/**
 * Server achievement awards. Client UI must import from
 * `@/web/lib/achievements-catalog` so webpack does not pull
 * realtime-emit → custom server → redis into the browser bundle.
 */

import "server-only";

import { prisma } from "./prisma";
import { emitNotificationCreated } from "./realtime-emit";
import { getAchievementDef } from "./achievements-catalog";

export type { AchievementDef, AchievementRarity } from "./achievements-catalog";
export {
  ACHIEVEMENTS,
  getAchievementDef,
  getAllAchievements,
} from "./achievements-catalog";

/**
 * Evaluates a user's stats and automatically awards any missing achievements.
 * Safe to call asynchronously after any major action (e.g. creating thread).
 * Returns the list of newly awarded badge ids.
 */
export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: { select: { badgeId: true } },
        _count: {
          select: {
            threads: true,
            replies: true,
            socialPosts: true,
            tipsSent: true,
            receivedFriendships: true,
            sentFriendships: true,
          },
        },
        characters: { select: { bank: true } },
      },
    });

    if (!user) return [];

    const ownedBadges = new Set(user.achievements.map((a) => a.badgeId));
    const newAwards: string[] = [];

    if (!ownedBadges.has("first_blood") && user._count.threads >= 1) {
      newAwards.push("first_blood");
    }

    if (!ownedBadges.has("first_reply") && user._count.replies >= 1) {
      newAwards.push("first_reply");
    }

    if (!ownedBadges.has("social_starter") && user._count.socialPosts >= 1) {
      newAwards.push("social_starter");
    }

    if (!ownedBadges.has("tipper") && user._count.tipsSent >= 1) {
      newAwards.push("tipper");
    }

    if (!ownedBadges.has("social_butterfly")) {
      const acceptedCount = await prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [{ userId }, { friendId: userId }],
        },
      });
      if (acceptedCount >= 50) {
        newAwards.push("social_butterfly");
      }
    }

    if (!ownedBadges.has("rich")) {
      const isRich = user.characters.some((char) => char.bank >= 100000);
      if (isRich) {
        newAwards.push("rich");
      }
    }

    if (!ownedBadges.has("veteran")) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (user.createdAt < oneYearAgo) {
        newAwards.push("veteran");
      }
    }

    if (!ownedBadges.has("first_capture") || !ownedBadges.has("creature_collector_10")) {
      const creaturesCount = await prisma.playerCreature.count({ where: { userId } });
      if (!ownedBadges.has("first_capture") && creaturesCount >= 1) {
        newAwards.push("first_capture");
      }
      if (!ownedBadges.has("creature_collector_10") && creaturesCount >= 10) {
        newAwards.push("creature_collector_10");
      }
    }

    if (!ownedBadges.has("quest_complete_5")) {
      const completedQuests = await prisma.playerQuestState.count({
        where: { userId, status: "COMPLETED" },
      });
      if (completedQuests >= 5) {
        newAwards.push("quest_complete_5");
      }
    }

    if (!ownedBadges.has("first_craft")) {
      const craftLogs = await prisma.inventoryLog.count({
        where: { userId, reason: "craft" },
      });
      if (craftLogs >= 1) {
        newAwards.push("first_craft");
      }
    }

    if (!ownedBadges.has("first_trade")) {
      const tradeLogs = await prisma.inventoryLog.count({
        where: { userId, reason: { in: ["trade", "shop_buy", "shop_sell"] } },
      });
      if (tradeLogs >= 1) {
        newAwards.push("first_trade");
      }
    }

    for (const badgeId of newAwards) {
      await prisma.userAchievement.create({
        data: { userId, badgeId },
      });

      const def = getAchievementDef(badgeId);
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          message: def
            ? `Achievement unlocked: ${def.title} — ${def.description}`
            : `Achievement unlocked: ${badgeId}`,
          link: "/profile",
        },
      });
      await emitNotificationCreated(notification);
    }

    if (newAwards.length > 0) {
      console.log(
        `[Achievements] Automatically awarded ${newAwards.join(", ")} to ${user.username}`
      );
    }

    return newAwards;
  } catch (error) {
    console.error("[Achievements] Failed to check and award:", error);
    return [];
  }
}
