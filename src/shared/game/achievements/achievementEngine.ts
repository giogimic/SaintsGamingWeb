/**
 * Saints Gaming — Achievement Tracker & Unlock Engine (Bible 25)
 * Tracks player milestones across Combat, Skilling, Exploration, Collection, and Quests.
 */

export type AchievementCategory =
  | 'COMBAT'
  | 'SKILLING'
  | 'EXPLORATION'
  | 'COLLECTION'
  | 'QUESTS';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  points: number; // 5, 10, 25, 50, 100
  targetCount: number;
  rewardTitleId?: string;
  rewardItemId?: string;
}

export interface PlayerAchievementProgress {
  achievementId: string;
  currentCount: number;
  isUnlocked: boolean;
  unlockedAt?: number;
}

export interface AchievementUnlockEvent {
  justUnlocked: boolean;
  achievement: AchievementDefinition;
  progress: PlayerAchievementProgress;
}

/**
 * Records progress toward an achievement and unlocks it when targetCount is reached.
 */
export function recordAchievementProgress(
  progressMap: Record<string, PlayerAchievementProgress>,
  definition: AchievementDefinition,
  increment: number = 1,
  nowMs: number = Date.now()
): AchievementUnlockEvent {
  let progress = progressMap[definition.id];

  if (!progress) {
    progress = {
      achievementId: definition.id,
      currentCount: 0,
      isUnlocked: false,
    };
    progressMap[definition.id] = progress;
  }

  if (progress.isUnlocked) {
    return {
      justUnlocked: false,
      achievement: definition,
      progress,
    };
  }

  progress.currentCount = Math.min(
    definition.targetCount,
    progress.currentCount + increment
  );

  if (progress.currentCount >= definition.targetCount) {
    progress.isUnlocked = true;
    progress.unlockedAt = nowMs;

    return {
      justUnlocked: true,
      achievement: definition,
      progress,
    };
  }

  return {
    justUnlocked: false,
    achievement: definition,
    progress,
  };
}

/**
 * Calculates total achievement points earned by a player.
 */
export function calculateTotalAchievementPoints(
  progressMap: Record<string, PlayerAchievementProgress>,
  definitions: Record<string, AchievementDefinition>
): number {
  let totalPoints = 0;

  for (const [id, progress] of Object.entries(progressMap)) {
    if (progress.isUnlocked && definitions[id]) {
      totalPoints += definitions[id].points;
    }
  }

  return totalPoints;
}

/**
 * Returns all unlocked achievements.
 */
export function getUnlockedAchievements(
  progressMap: Record<string, PlayerAchievementProgress>
): PlayerAchievementProgress[] {
  return Object.values(progressMap).filter((p) => p.isUnlocked);
}
