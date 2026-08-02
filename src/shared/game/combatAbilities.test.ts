import { describe, expect, it } from "vitest";
import {
  computeCaptureChance,
  getCombatAbility,
  isForbiddenRtCaptureAbility,
  rollCaptureSuccess,
} from "./combatAbilities";

describe("RT combat abilities", () => {
  it("forbids capture tools on the real-time hotbar path", () => {
    expect(isForbiddenRtCaptureAbility("binding_crystal")).toBe(true);
    expect(isForbiddenRtCaptureAbility("capture_device")).toBe(true);
    expect(isForbiddenRtCaptureAbility("CAPTURE")).toBe(true);
    expect(isForbiddenRtCaptureAbility("strike")).toBe(false);
  });

  it("resolves known abilities and rejects capture ids", () => {
    expect(getCombatAbility("fireball")?.power).toBe(50);
    expect(getCombatAbility("binding_crystal")).toBeNull();
  });
});

describe("turn-based capture math", () => {
  it("is easier at low HP", () => {
    const full = computeCaptureChance({ maxHp: 100, currentHp: 100 });
    const weak = computeCaptureChance({ maxHp: 100, currentHp: 10 });
    expect(weak).toBeGreaterThan(full);
  });

  it("rolls against 0-255", () => {
    expect(rollCaptureSuccess(255, () => 0)).toBe(true);
    expect(rollCaptureSuccess(0, () => 0.99)).toBe(false);
  });
});
