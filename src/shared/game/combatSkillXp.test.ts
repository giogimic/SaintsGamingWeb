import { describe, expect, it } from "vitest";
import {
  grantsForAbilityCast,
  grantsForDamageTaken,
  grantsForTurnBattle,
} from "./combatSkillXp";

describe("combatSkillXp", () => {
  it("maps melee strike to attack + strength", () => {
    const grants = grantsForAbilityCast({ id: "strike", category: "physical", power: 40 });
    expect(grants.some((g) => g.skillSlug === "attack" && g.amount > 0)).toBe(true);
    expect(grants.some((g) => g.skillSlug === "strength")).toBe(true);
  });

  it("maps fireball to intelligence", () => {
    const grants = grantsForAbilityCast({ id: "fireball", category: "special", power: 50 });
    expect(grants[0].skillSlug).toBe("intelligence");
  });

  it("maps shoot to ranged + perception", () => {
    const grants = grantsForAbilityCast({ id: "shoot", category: "physical", power: 35 });
    expect(grants.map((g) => g.skillSlug)).toEqual(expect.arrayContaining(["ranged", "perception"]));
  });

  it("gives no XP on miss", () => {
    expect(grantsForAbilityCast({ id: "strike", category: "physical", power: 40 }, { isMiss: true })).toEqual([]);
  });

  it("grants defence/hitpoints on damage taken", () => {
    const grants = grantsForDamageTaken(25);
    expect(grants.some((g) => g.skillSlug === "defence")).toBe(true);
    expect(grants.some((g) => g.skillSlug === "hitpoints")).toBe(true);
  });

  it("grants summoning on TB win/capture", () => {
    expect(grantsForTurnBattle("WIN").some((g) => g.skillSlug === "summoning")).toBe(true);
    expect(grantsForTurnBattle("CAPTURE").some((g) => g.skillSlug === "summoning")).toBe(true);
    expect(grantsForTurnBattle("FLEE")).toEqual([]);
  });
});
