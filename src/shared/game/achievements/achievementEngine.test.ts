import { describe, it, expect } from 'vitest';
import {
  recordAchievementProgress,
  calculateTotalAchievementPoints,
  getUnlockedAchievements,
  AchievementDefinition,
  PlayerAchievementProgress,
} from './achievementEngine';

describe('Achievement Tracker & Unlock Engine (Bible 25)', () => {
  const monsterSlayer: AchievementDefinition = {
    id: 'ach_monster_slayer',
    name: 'Master Slayer',
    description: 'Defeat 50 monsters in the overworld.',
    category: 'COMBAT',
    points: 25,
    targetCount: 50,
    rewardTitleId: 'title_slayer',
  };

  const masterFisher: AchievementDefinition = {
    id: 'ach_master_fisher',
    name: 'Master Angler',
    description: 'Catch 100 fish.',
    category: 'SKILLING',
    points: 50,
    targetCount: 100,
  };

  const defs = {
    ach_monster_slayer: monsterSlayer,
    ach_master_fisher: masterFisher,
  };

  it('increments achievement progress and unlocks when target count is met', () => {
    const progressMap: Record<string, PlayerAchievementProgress> = {};

    // 1st kill
    const step1 = recordAchievementProgress(progressMap, monsterSlayer, 1);
    expect(step1.justUnlocked).toBe(false);
    expect(step1.progress.currentCount).toBe(1);
    expect(step1.progress.isUnlocked).toBe(false);

    // 49 more kills (total 50)
    const step2 = recordAchievementProgress(progressMap, monsterSlayer, 49);
    expect(step2.justUnlocked).toBe(true);
    expect(step2.progress.currentCount).toBe(50);
    expect(step2.progress.isUnlocked).toBe(true);
    expect(step2.progress.unlockedAt).toBeDefined();

    // Additional kill after unlock should not trigger justUnlocked
    const step3 = recordAchievementProgress(progressMap, monsterSlayer, 1);
    expect(step3.justUnlocked).toBe(false);
  });

  it('aggregates total achievement points correctly', () => {
    const progressMap: Record<string, PlayerAchievementProgress> = {};

    recordAchievementProgress(progressMap, monsterSlayer, 50); // +25 pts
    recordAchievementProgress(progressMap, masterFisher, 100); // +50 pts

    const totalPts = calculateTotalAchievementPoints(progressMap, defs);
    expect(totalPts).toBe(75);

    const unlocked = getUnlockedAchievements(progressMap);
    expect(unlocked.length).toBe(2);
  });
});
