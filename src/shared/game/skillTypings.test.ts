import { describe, expect, it } from "vitest";
import {
  applySkillDeltas,
  buildInitialSkills,
  calculateCombatLevelFromXp,
  isCombatSkillTyping,
  normalizeSkillSlug,
} from "./skillTypings";
import {
  FALLBACK_CLASS_DEFS,
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
    const warrior = FALLBACK_CLASS_DEFS.find((c) => c.classId === "WARRIOR")!;
    const skills = resolveStartingSkills(warrior);
    expect(skills.Attack.level).toBeGreaterThan(1);
    expect(skills.Wisdom.level).toBe(1); // trainable, not locked out
    expect(isCombatSkillTyping("attack")).toBe(true);
  });

  it("shares base stats across classes with deltas", () => {
    const ranger = FALLBACK_CLASS_DEFS.find((c) => c.classId === "RANGER")!;
    const priest = FALLBACK_CLASS_DEFS.find((c) => c.classId === "PRIEST")!;
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
});
