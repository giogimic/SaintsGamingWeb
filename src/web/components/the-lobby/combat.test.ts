import { describe, expect, it } from "vitest";
import { getCombatMultiplier } from "../../../shared/game/elementMatchups";

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
