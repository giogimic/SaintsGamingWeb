/**
 * Saints Gaming — Master Achievement Ledger, Secret Titles, Realm Feats & Badges Engine (Bible 05, 13, 20, 25, 29)
 * Manages achievement catalog, incremental progress tracking, secret hidden feats, title rewards, and AP calculation.
 */

export type AchievementCategory =
  | 'COMBAT'
  | 'SKILLING'
  | 'EXPLORATION'
  | 'COLLECTION'
  | 'QUESTS'
  | 'CREATURE_TAMING'
  | 'CRAFTING_ECONOMY'
  | 'GUILD_WARFARE'
  | 'FEATS_OF_STRENGTH';

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'MYTHIC';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier?: AchievementTier;
  points: number; // e.g. 5, 10, 25, 50, 100
  targetCount: number;
  isSecret?: boolean;
  rewardTitleId?: string;
  rewardItemId?: string;
  rewardBadgeIcon?: string;
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

export interface PlayerAchievementProfile {
  playerId: string;
  totalPoints: number;
  unlockedTitles: string[];
  activeTitleId?: string;
  progress: Map<string, PlayerAchievementProgress>;
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

/**
 * Authoritative Master Achievement Ledger Engine
 */
export class AchievementEngine {
  private catalog = new Map<string, AchievementDefinition>();

  /**
   * Registers an achievement definition in the master catalog.
   */
  public registerAchievement(achievement: AchievementDefinition) {
    this.catalog.set(achievement.id, { ...achievement });
  }

  /**
   * Creates a new achievement tracking profile for a player.
   */
  public createProfile(playerId: string): PlayerAchievementProfile {
    const profile: PlayerAchievementProfile = {
      playerId,
      totalPoints: 0,
      unlockedTitles: [],
      progress: new Map<string, PlayerAchievementProgress>(),
    };

    for (const ach of this.catalog.values()) {
      profile.progress.set(ach.id, {
        achievementId: ach.id,
        currentCount: 0,
        isUnlocked: false,
      });
    }

    return profile;
  }

  /**
   * Records progress towards an achievement, evaluating unlock triggers and rewards.
   */
  public recordProgress(
    profile: PlayerAchievementProfile,
    achievementId: string,
    countDelta: number = 1
  ): AchievementUnlockEvent {
    const ach = this.catalog.get(achievementId);
    if (!ach) {
      throw new Error(`Achievement ${achievementId} not found in catalog`);
    }

    let p = profile.progress.get(achievementId);
    if (!p) {
      p = { achievementId, currentCount: 0, isUnlocked: false };
      profile.progress.set(achievementId, p);
    }

    if (p.isUnlocked) {
      return { justUnlocked: false, achievement: ach, progress: p };
    }

    p.currentCount += countDelta;

    if (p.currentCount >= ach.targetCount) {
      p.currentCount = ach.targetCount;
      p.isUnlocked = true;
      p.unlockedAt = Date.now();

      // Award points & cosmetic rewards
      profile.totalPoints += ach.points;
      if (ach.rewardTitleId && !profile.unlockedTitles.includes(ach.rewardTitleId)) {
        profile.unlockedTitles.push(ach.rewardTitleId);
        if (!profile.activeTitleId) {
          profile.activeTitleId = ach.rewardTitleId;
        }
      }

      return { justUnlocked: true, achievement: ach, progress: p };
    }

    return { justUnlocked: false, achievement: ach, progress: p };
  }

  /**
   * Sets active player cosmetic title.
   */
  public setActiveTitle(profile: PlayerAchievementProfile, titleId: string): boolean {
    if (!profile.unlockedTitles.includes(titleId)) {
      return false;
    }
    profile.activeTitleId = titleId;
    return true;
  }

  /**
   * Returns visible achievements for UI, masking secret achievements until unlocked.
   */
  public getVisibleAchievements(
    profile: PlayerAchievementProfile
  ): Array<AchievementDefinition & { currentCount: number; isUnlocked: boolean }> {
    const result: Array<AchievementDefinition & { currentCount: number; isUnlocked: boolean }> = [];

    for (const ach of this.catalog.values()) {
      const p = profile.progress.get(ach.id) || {
        achievementId: ach.id,
        currentCount: 0,
        isUnlocked: false,
      };

      if (ach.isSecret && !p.isUnlocked) {
        result.push({
          ...ach,
          name: '???',
          description: 'Secret feat of strength. Discover in-game to unlock.',
          currentCount: p.currentCount,
          isUnlocked: p.isUnlocked,
        });
      } else {
        result.push({
          ...ach,
          currentCount: p.currentCount,
          isUnlocked: p.isUnlocked,
        });
      }
    }

    return result;
  }
}
