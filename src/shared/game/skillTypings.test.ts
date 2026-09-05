import { describe, expect, it } from "vitest";
import {
  ALL_SKILL_SLUGS,
  TOTAL_SKILLS_COUNT,
  applySkillDeltas,
  buildInitialSkills,
  calculateCombatLevelFromXp,
  calculateTotalLevel,
  calculateTotalXp,
  getMaxProgress,
  isCombatSkillTyping,
  isMaxCapeEligible,
  normalizeSkillSlug,
} from "./skillTypings";
import {
  resolveClassStats,
  resolveStartingSkills,
  SHARED_BASE_STATS,
} from "./classCatalog";

describe("combat skill typings", () => {
  it("normalizes aliases", () => {
    expect(normalizeSkillSlug("Constitution")).toBe("hitpoints");
    expect(normalizeSkillSlug("Defense")).toBe("defence");
    expect(normalizeSkillSlug("STR")).toBe("strength");
  });

  it("uses bible combat XP curve", () => {
    expect(calculateCombatLevelFromXp(0)).toBe(1);
    expect(calculateCombatLevelFromXp(50)).toBe(2);
    expect(calculateCombatLevelFromXp(120050)).toBe(50);
  });

  it("applies class skill deltas without locking skills", () => {
    const warrior = { classId: "WARRIOR", statDeltas: { def: 8 }, skillDeltas: { attack: 14 } } as any;
    const skills = resolveStartingSkills(warrior);
    expect(skills.Attack.level).toBeGreaterThan(1);
    expect(skills.Wisdom.level).toBe(1); // trainable, not locked out
    expect(isCombatSkillTyping("attack")).toBe(true);
  });

  it("shares base stats across classes with deltas", () => {
    const ranger = { classId: "RANGER", statDeltas: { def: -6 } } as any;
    const priest = { classId: "PRIEST", statDeltas: { hp: 15 } } as any;
    const r = resolveClassStats(ranger);
    const p = resolveClassStats(priest);
    expect(r.def).toBe(SHARED_BASE_STATS.def + (ranger.statDeltas.def || 0));
    expect(p.hp).toBeGreaterThan(r.hp);
  });

  it("buildInitialSkills includes gathering matrix", () => {
    const skills = buildInitialSkills({ attack: 5 });
    expect(skills.Attack.level).toBe(6);
    expect(skills.Woodcutting.level).toBe(1);
    expect(skills.Perception.level).toBe(1);
  });

  it("applySkillDeltas clamps", () => {
    const next = applySkillDeltas({ attack: { level: 1, xp: 0 } }, { attack: 100 });
    expect(next.attack.level).toBe(50);
  });

  it("accurately handles ALL_SKILL_SLUGS, Total Level, and Max Cape progress for all 27 skills", () => {
    expect(ALL_SKILL_SLUGS.length).toBe(27);
    expect(TOTAL_SKILLS_COUNT).toBe(27);

    const initial = buildInitialSkills();
    expect(calculateTotalLevel(initial)).toBe(27);
    expect(calculateTotalXp(initial)).toBe(0);
    expect(isMaxCapeEligible(initial)).toBe(false);

    const progress = getMaxProgress(initial);
    expect(progress.totalSkillsCount).toBe(27);
    expect(progress.totalLevel).toBe(27);
    expect(progress.isMaxed).toBe(false);
    expect(progress.maxedSkillsCount).toBe(0);

    // Maxed mock character
    const maxedSkills: Record<string, { level: number; xp: number }> = {};
    for (const slug of ALL_SKILL_SLUGS) {
      maxedSkills[slug] = { level: 99, xp: 13034431 };
    }
    expect(isMaxCapeEligible(maxedSkills)).toBe(true);
    const maxedProgress = getMaxProgress(maxedSkills);
    expect(maxedProgress.isMaxed).toBe(true);
    expect(maxedProgress.maxedSkillsCount).toBe(27);
    expect(maxedProgress.percentComplete).toBe(100);
  });
});
