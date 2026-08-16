import { describe, it, expect } from "vitest";
import {
  rollD20,
  rollD20Advantage,
  getCreatureWillpowerDC,
  getCaptureModifiers,
  attemptCapture,
} from "./d20Engine";
import {
  computeArmorClass,
  rollHeroAttack,
  rollElementalSave,
  rollInspirationDie,
} from "./heroCombatD20";

describe("d20Engine — Capture Mechanics", () => {
  it("rolls d20 within 1-20 range", () => {
    for (let i = 0; i < 50; i++) {
      const roll = rollD20();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
    }
  });

  it("handles advantage taking the higher roll", () => {
    // Mock RNG returning 0.1 (roll 3) and 0.8 (roll 17)
    let call = 0;
    const mockRng = () => (call++ === 0 ? 0.1 : 0.8);
    const result = rollD20Advantage(true, mockRng);
    expect(result.roll).toBe(17);
    expect(result.discarded).toBe(3);
    expect(result.isAdvantage).toBe(true);
  });

  it("calculates accurate DC by rarity tier", () => {
    expect(getCreatureWillpowerDC("common")).toBe(10);
    expect(getCreatureWillpowerDC("uncommon")).toBe(12);
    expect(getCreatureWillpowerDC("rare")).toBe(15);
    expect(getCreatureWillpowerDC("elite")).toBe(18);
    expect(getCreatureWillpowerDC("mythic")).toBe(21);
    expect(getCreatureWillpowerDC("ancient")).toBe(24);
  });

  it("applies HP bonuses when beast is weakened", () => {
    const fullHp = getCaptureModifiers({ currentHp: 100, maxHp: 100 });
    expect(fullHp.hpBonus).toBe(0);

    const halfHp = getCaptureModifiers({ currentHp: 50, maxHp: 100 });
    expect(halfHp.hpBonus).toBe(2);

    const lowHp = getCaptureModifiers({ currentHp: 20, maxHp: 100 });
    expect(lowHp.hpBonus).toBe(4);

    const criticalHp = getCaptureModifiers({ currentHp: 5, maxHp: 100 });
    expect(criticalHp.hpBonus).toBe(6);
  });

  it("guarantees capture on Natural 20 (Critical Resonance)", () => {
    // Force roll 20
    const mockRng = () => 0.99;
    const result = attemptCapture({
      currentHp: 100,
      maxHp: 100,
      rarityTier: "ancient", // DC 24
      rng: mockRng,
    });
    expect(result.isNat20).toBe(true);
    expect(result.success).toBe(true);
  });

  it("guarantees failure on Natural 1 (Critical Fumble)", () => {
    // Force roll 1
    const mockRng = () => 0.01;
    const result = attemptCapture({
      currentHp: 1,
      maxHp: 100,
      tamerSkillLevel: 99,
      rarityTier: "common",
      rng: mockRng,
    });
    expect(result.isNat1).toBe(true);
    expect(result.success).toBe(false);
  });

  it("succeeds when roll + modifier >= DC", () => {
    // Roll 10 (rng = 0.47 -> 10) + tamer 4 + tool 2 + hp 4 = 20 vs DC 15
    let rollCall = 0;
    const mockRng = () => 0.47;
    const result = attemptCapture({
      currentHp: 20,
      maxHp: 100,
      tamerSkillLevel: 45,
      toolTier: "chroma",
      rarityTier: "rare",
      rng: mockRng,
    });
    expect(result.success).toBe(true);
    expect(result.totalRoll).toBeGreaterThanOrEqual(15);
  });
});

describe("heroCombatD20 — Hero Combat Mechanics", () => {
  it("calculates base Armor Class (AC)", () => {
    const ac = computeArmorClass({
      baseDefense: 40,
      agilityModifier: 8,
      equippedArmorBonus: 4,
    });
    // 10 + 4 (armor) + 2 (agility) + 4 (def bonus) = 20
    expect(ac).toBe(20);
  });

  it("resolves attack hits against Armor Class", () => {
    const hitResult = rollHeroAttack({
      attackerProficiency: 3,
      atkStatModifier: 4,
      weaponBonus: 2,
      targetAC: 15,
      rng: () => 0.5, // roll 11 + 9 = 20 >= 15
    });
    expect(hitResult.hit).toBe(true);
    expect(hitResult.totalRoll).toBe(20);
  });

  it("resolves elemental saving throws", () => {
    const saveResult = rollElementalSave({
      casterAbilityPower: 50,
      casterProficiency: 4,
      defenderElementalResist: 30,
      rng: () => 0.8, // roll 17 + 3 = 20 >= Spell DC (8 + 4 + 5 = 17)
    });
    expect(saveResult.saved).toBe(true);
    expect(saveResult.halfDamage).toBe(true);
  });

  it("rolls inspiration die scaling by level", () => {
    const lowLv = rollInspirationDie(10);
    expect(lowLv).toBeGreaterThanOrEqual(1);
    expect(lowLv).toBeLessThanOrEqual(4);

    const highLv = rollInspirationDie(99);
    expect(highLv).toBeGreaterThanOrEqual(1);
    expect(highLv).toBeLessThanOrEqual(10);
  });
});
