import { describe, expect, it } from "vitest";
import { getCombatMultiplier, calculateCombatHitDamage, calculatePlayerCombatStats } from "./combat";

describe("getCombatMultiplier", () => {
  it("returns 1.0 for same type, unknown, or None", () => {
    expect(getCombatMultiplier("Solar", "Solar")).toBe(1.0);
    expect(getCombatMultiplier("Volt", "Bio")).toBe(1.0);
    expect(getCombatMultiplier("None", "Hydro")).toBe(1.0);
  });

  it("returns 1.5 for advantageous matchups", () => {
    expect(getCombatMultiplier("Solar", "Bio")).toBe(1.5);
    expect(getCombatMultiplier("Solar", "Cryo")).toBe(1.5);
    expect(getCombatMultiplier("Cyber", "Solar")).toBe(1.5);
    expect(getCombatMultiplier("Hydro", "Geo")).toBe(1.5);
  });

  it("returns 0.5 for disadvantageous matchups", () => {
    expect(getCombatMultiplier("Bio", "Solar")).toBe(0.5);
    expect(getCombatMultiplier("Cryo", "Geo")).toBe(0.5);
    expect(getCombatMultiplier("Volt", "Cyber")).toBe(0.5);
  });
});

describe("calculatePlayerCombatStats", () => {
  it("computes baseline stats from player level", () => {
    const stats = calculatePlayerCombatStats({
      level: 10,
      equipment: { head: null, chest: null, legs: null, weapon: null },
      activeDaemonId: null,
    } as any);

    expect(stats.atk).toBe(20);
    expect(stats.def).toBe(20);
  });
});

describe("calculateCombatHitDamage", () => {
  it("calculates positive damage with mitigation", () => {
    const result = calculateCombatHitDamage(50, 20, 15, 1);
    expect(result.damage).toBeGreaterThan(0);
    expect(typeof result.isCrit).toBe("boolean");
  });
});

