import { describe, expect, it } from 'vitest';
import {
  AchievementDefinition,
  AchievementEngine,
  calculateTotalAchievementPoints,
  getUnlockedAchievements,
  PlayerAchievementProgress,
  recordAchievementProgress,
} from './achievementEngine';

describe('Achievement Tracker & Unlock Engine (Bible 05, 13, 20, 25, 29)', () => {
  const monsterSlayer: AchievementDefinition = {
    id: 'ach_monster_slayer',
    name: 'Master Slayer',
    description: 'Defeat 50 monsters in the overworld.',
    category: 'COMBAT',
    tier: 'SILVER',
    points: 25,
    targetCount: 50,
    rewardTitleId: 'title_slayer',
  };

  const masterFisher: AchievementDefinition = {
    id: 'ach_master_fisher',
    name: 'Master Angler',
    description: 'Catch 100 fish.',
    category: 'SKILLING',
    tier: 'GOLD',
    points: 50,
    targetCount: 100,
  };

  const secretFeat: AchievementDefinition = {
    id: 'ach_hidden_dragon',
    name: 'Dragon Whisperer',
    description: 'Defeat the secret dungeon dragon solo.',
    category: 'FEATS_OF_STRENGTH',
    tier: 'MYTHIC',
    points: 100,
    targetCount: 1,
    isSecret: true,
    rewardTitleId: 'title_dragon_whisperer',
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

  it('evaluates player achievement profile with secret feats, titles, and AP via AchievementEngine', () => {
    const engine = new AchievementEngine();
    engine.registerAchievement(monsterSlayer);
    engine.registerAchievement(secretFeat);

    const profile = engine.createProfile('player_saint_1');
    expect(profile.totalPoints).toBe(0);
    expect(profile.unlockedTitles).toHaveLength(0);

    // Check visible achievements before secret unlock
    const visibleBefore = engine.getVisibleAchievements(profile);
    const secretBefore = visibleBefore.find((a) => a.id === 'ach_hidden_dragon');
    expect(secretBefore?.name).toBe('???');

    // Unlock secret feat
    const unlockSecret = engine.recordProgress(profile, 'ach_hidden_dragon', 1);
    expect(unlockSecret.justUnlocked).toBe(true);
    expect(profile.totalPoints).toBe(100);
    expect(profile.unlockedTitles).toContain('title_dragon_whisperer');
    expect(profile.activeTitleId).toBe('title_dragon_whisperer');

    // Check visible achievements after secret unlock
    const visibleAfter = engine.getVisibleAchievements(profile);
    const secretAfter = visibleAfter.find((a) => a.id === 'ach_hidden_dragon');
    expect(secretAfter?.name).toBe('Dragon Whisperer');
  });
});
