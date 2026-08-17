import { describe, it, expect } from 'vitest';
import {
  CANONICAL_ACHIEVEMENTS,
  getAchievementDef,
  getAllAchievements,
} from './achievementCatalog';

describe('Canonical Achievement Catalog (Bible 25 & 26)', () => {
  it('defines all canonical achievements with valid categories and points', () => {
    const list = getAllAchievements();
    expect(list.length).toBeGreaterThanOrEqual(10);

    for (const ach of list) {
      expect(ach.id).toBeDefined();
      expect(ach.name.length).toBeGreaterThan(0);
      expect(ach.description.length).toBeGreaterThan(0);
      expect(['COMBAT', 'SKILLING', 'EXPLORATION', 'COLLECTION', 'QUESTS']).toContain(ach.category);
      expect(ach.points).toBeGreaterThan(0);
      expect(ach.targetCount).toBeGreaterThan(0);
    }
  });

  it('allows lookup of specific achievement definitions by ID', () => {
    const slayer = getAchievementDef('ach_monster_slayer');
    expect(slayer).toBeDefined();
    expect(slayer?.name).toBe('Monster Slayer');
    expect(slayer?.rewardTitleId).toBe('title_slayer');
  });
});
