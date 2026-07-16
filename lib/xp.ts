import { prisma } from "./prisma";
import { PERMISSION_LEVELS } from "./permissions";

function getBaseTierFromLevel(level: number): number {
  if (level >= 50) return PERMISSION_LEVELS.SAINT;
  if (level >= 40) return PERMISSION_LEVELS.LOYAL;
  if (level >= 30) return PERMISSION_LEVELS.DEDICATED;
  if (level >= 20) return PERMISSION_LEVELS.ACTIVE;
  if (level >= 10) return PERMISSION_LEVELS.USER;
  if (level >= 5) return PERMISSION_LEVELS.NEW;
  return PERMISSION_LEVELS.LURKER;
}

export const XP_VALUES = {
  THREAD_CREATE: 10,
  REPLY_CREATE: 5,
  REACTION: 1,
  NEWS_CREATE: 50,
};

/**
 * Awards XP to a user and automatically levels them up if they cross a tier threshold.
 * Silently rewards any linked FiveM characters with a bank deposit on level up.
 */
export async function awardXP(userId: string, amount: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, permissionLevel: true }
    });

    if (!user) return null;

    const newXp = user.xp + amount;
    
    // Determine new level based on tiers
    const eligibleTier = await prisma.levelTier.findFirst({
      where: { xpRequired: { lte: newXp } },
      orderBy: { level: 'desc' }
    });

    const newLevel = eligibleTier && eligibleTier.level > user.level 
        ? eligibleTier.level 
        : user.level;

    // Determine if we need to upgrade their permission tier automatically
    let newPermissionLevel: number | undefined = undefined;
    if (newLevel > user.level && user.permissionLevel < PERMISSION_LEVELS.HELPER) {
      const expectedTier = getBaseTierFromLevel(newLevel);
      if (expectedTier > user.permissionLevel) {
        newPermissionLevel = expectedTier;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: newLevel,
        ...(newPermissionLevel !== undefined && { permissionLevel: newPermissionLevel })
      }
    });

    // Handle FiveM Silent Level-Up Reward
    if (newLevel > user.level) {
      const rewardAmount = 5000 * newLevel;
      const characters = await prisma.character.findMany({
        where: { userId }
      });

      for (const char of characters) {
        await prisma.character.update({
          where: { id: char.id },
          data: { bank: { increment: rewardAmount } }
        });
        
        await prisma.bankTransaction.create({
          data: {
            characterId: char.id,
            type: "DEPOSIT",
            amount: rewardAmount,
            description: `Website Level Up Reward (Lvl ${newLevel})`
          }
        });
      }
    }

    return updatedUser;
  } catch (error) {
    console.error("Error awarding XP:", error);
    return null;
  }
}

/**
 * Helper to get user's title based on their level.
 */
export async function getUserTitle(level: number): Promise<string> {
  try {
    const tier = await prisma.levelTier.findUnique({
      where: { level }
    });
    return tier?.name || "Member";
  } catch {
    return "Member";
  }
}

/**
 * Gets detailed level data for UI rendering.
 */
export async function getLevelData(level: number) {
  try {
    const [currentTier, nextTier] = await Promise.all([
      prisma.levelTier.findUnique({ where: { level } }),
      prisma.levelTier.findFirst({ where: { level: { gt: level } }, orderBy: { level: 'asc' } })
    ]);
    
    return {
      title: currentTier?.name || "Member",
      icon: currentTier?.icon || "🏆",
      nextTierRequiredXp: nextTier?.xpRequired || null,
      nextTierName: nextTier?.name || null
    };
  } catch {
    return {
      title: "Member",
      icon: "🏆",
      nextTierRequiredXp: null,
      nextTierName: null
    };
  }
}
