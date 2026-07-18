import { JSX } from "react";
import { 
  AchievementFirstBlood, 
  AchievementBetaTester, 
  AchievementSocialButterfly,
  AchievementRich,
  AchievementVeteran
} from "@/components/achievements/achievement-icons";

export type AchievementRarity = "Common" | "Rare" | "Epic" | "Legendary";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rarity: AchievementRarity;
  colorClass: string;
  glowClass: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  "first_blood": {
    id: "first_blood",
    title: "First Blood",
    description: "Created your very first forum post.",
    rarity: "Common",
    colorClass: "text-blue-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]",
    Icon: AchievementFirstBlood
  },
  "beta_tester": {
    id: "beta_tester",
    title: "Beta Tester",
    description: "Participated during the early beta phase of Saints Web.",
    rarity: "Legendary",
    colorClass: "text-purple-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]",
    Icon: AchievementBetaTester
  },
  "social_butterfly": {
    id: "social_butterfly",
    title: "Social Butterfly",
    description: "Reached 50 friends on your friend list.",
    rarity: "Rare",
    colorClass: "text-pink-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]",
    Icon: AchievementSocialButterfly
  },
  "rich": {
    id: "rich",
    title: "High Roller",
    description: "Accumulated over $100,000 in your FiveM bank.",
    rarity: "Epic",
    colorClass: "text-green-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]",
    Icon: AchievementRich
  },
  "veteran": {
    id: "veteran",
    title: "Saints Veteran",
    description: "Member of the community for over 1 year.",
    rarity: "Epic",
    colorClass: "text-amber-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    Icon: AchievementVeteran
  }
};

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS[id];
}

export function getAllAchievements(): AchievementDef[] {
  return Object.values(ACHIEVEMENTS);
}

// ─── Auto-Award Logic ────────────────────────────────────────────────────────

import { prisma } from "./prisma";

/**
 * Evaluates a user's stats and automatically awards any missing achievements.
 * Safe to call asynchronously after any major action (e.g. creating thread).
 */
export async function checkAndAwardAchievements(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: { select: { badgeId: true } },
        _count: { select: { threads: true, receivedFriendships: true, sentFriendships: true } },
        characters: { select: { bank: true } }
      }
    });

    if (!user) return;

    const ownedBadges = new Set(user.achievements.map(a => a.badgeId));
    const newAwards: string[] = [];

    // 1. First Blood: Has created at least 1 forum thread
    if (!ownedBadges.has("first_blood") && user._count.threads >= 1) {
      newAwards.push("first_blood");
    }

    // 2. Social Butterfly: Has at least 50 friends (Accepted friendships where user is sender or receiver)
    if (!ownedBadges.has("social_butterfly")) {
      const acceptedCount = await prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [{ userId }, { friendId: userId }]
        }
      });
      if (acceptedCount >= 50) {
        newAwards.push("social_butterfly");
      }
    }

    // 3. High Roller: Has at least one character with $100,000 in the bank
    if (!ownedBadges.has("rich")) {
      const isRich = user.characters.some(char => char.bank >= 100000);
      if (isRich) {
        newAwards.push("rich");
      }
    }

    // 4. Saints Veteran: Account is older than 1 year
    if (!ownedBadges.has("veteran")) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (user.createdAt < oneYearAgo) {
        newAwards.push("veteran");
      }
    }

    // Award any new achievements
    for (const badgeId of newAwards) {
      await prisma.userAchievement.create({
        data: { userId, badgeId }
      });
    }

    if (newAwards.length > 0) {
      console.log(`[Achievements] Automatically awarded ${newAwards.join(", ")} to ${user.username}`);
    }

  } catch (error) {
    console.error("[Achievements] Failed to check and award:", error);
  }
}
