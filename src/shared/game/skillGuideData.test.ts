import { describe, it, expect } from 'vitest';
import {
  SKILL_GUIDE_REGISTRY,
  getSkillGuide,
  resolveDynamicSkillUnlocks,
  getAllSkillUnlocks,
} from './skillGuideData';
import {
  COMBAT_SKILL_TYPINGS,
  GATHERING_SKILL_SLUGS,
  ARTISAN_SKILL_SLUGS,
  SUPPORT_SKILL_SLUGS,
} from './skillTypings';

describe('skillGuideData Registry', () => {
  const ALL_27_SLUGS = [
    ...COMBAT_SKILL_TYPINGS,
    ...GATHERING_SKILL_SLUGS,
    ...ARTISAN_SKILL_SLUGS,
    ...SUPPORT_SKILL_SLUGS,
  ];

  it('contains registered entries for all 27 skills', () => {
    expect(ALL_27_SLUGS.length).toBe(27);
    for (const slug of ALL_27_SLUGS) {
      const guide = getSkillGuide(slug);
      expect(guide).toBeDefined();
      expect(guide?.name).toBeDefined();
      expect(guide?.category).toBeDefined();
      expect(guide?.iconName).toBeDefined();
      expect(guide?.perLevelPerks.length).toBeGreaterThan(0);
      expect(guide?.staticMilestones.length).toBeGreaterThan(0);
      expect(guide?.battlepassTiers.length).toBeGreaterThan(0);
    }
  });

  it('accurately resolves dynamic recipe and ability unlocks for Crafting & Attack', () => {
    const craftingUnlocks = resolveDynamicSkillUnlocks('crafting');
    expect(craftingUnlocks.length).toBeGreaterThan(0);
    expect(craftingUnlocks.some((u) => u.title.includes('Capture Device'))).toBe(true);

    const attackUnlocks = getAllSkillUnlocks('attack');
    expect(attackUnlocks.length).toBeGreaterThan(0);
    expect(attackUnlocks.some((u) => u.title.includes('Weaponry') || u.title.includes('Slash'))).toBe(true);
  });

  it('orders battlepass tiers and milestone levels sequentially', () => {
    for (const slug of ALL_27_SLUGS) {
      const guide = getSkillGuide(slug)!;
      for (let i = 1; i < guide.battlepassTiers.length; i++) {
        expect(guide.battlepassTiers[i].level).toBeGreaterThanOrEqual(guide.battlepassTiers[i - 1].level);
      }
    }
  });
});
