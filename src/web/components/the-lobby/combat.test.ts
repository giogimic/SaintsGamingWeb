import { describe, expect, it } from "vitest";
import { getCombatMultiplier, calculateCombatHitDamage, calculatePlayerCombatStats } from "./combat";

describe("getCombatMultiplier", () => {
  it("returns 1.0 for neutral matchups or none", () => {
    expect(getCombatMultiplier("normal", "normal")).toBe(1.0);
    expect(getCombatMultiplier("None", "water")).toBe(1.0);
    expect(getCombatMultiplier("fire", "earth")).toBe(1.0);
  });

  it("returns 2.0 for advantageous super-effective matchups", () => {
    expect(getCombatMultiplier("fire", "grass")).toBe(2.0);
    expect(getCombatMultiplier("water", "fire")).toBe(2.0);
    expect(getCombatMultiplier("electric", "water")).toBe(2.0);
    expect(getCombatMultiplier("holy", "shadow")).toBe(2.0);
  });

  it("returns 0.5 for resistant/disadvantageous matchups", () => {
    expect(getCombatMultiplier("grass", "fire")).toBe(0.5);
    expect(getCombatMultiplier("fire", "water")).toBe(0.5);
    expect(getCombatMultiplier("water", "grass")).toBe(0.5);
    expect(getCombatMultiplier("shadow", "shadow")).toBe(0.5);
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

