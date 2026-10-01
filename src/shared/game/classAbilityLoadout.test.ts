import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYABLE_CLASSES, resolveStartingAbilityLoadout } from "./classCatalog";

describe("class ability loadout", () => {
  it("seeds a selected class with its Studio-configured ability IDs", () => {
	const result = resolveStartingAbilityLoadout(["MAGE"], DEFAULT_PLAYABLE_CLASSES);
	expect(result.unlockedAbilities).toEqual(["firestorm", "blizzard", "ion_beam"]);
	expect(result.equippedAbilities).toEqual(result.unlockedAbilities);
  });

  it("combines unique ability IDs for multi-class archetypes", () => {
	const result = resolveStartingAbilityLoadout(["WARRIOR", "MAGE"], DEFAULT_PLAYABLE_CLASSES);
	expect(result.unlockedAbilities).toEqual([
	  ...DEFAULT_PLAYABLE_CLASSES.find((def) => def.classId === "WARRIOR")!.abilities,
	  ...DEFAULT_PLAYABLE_CLASSES.find((def) => def.classId === "MAGE")!.abilities,
	]);
	expect(result.equippedAbilities).toHaveLength(5);
  });
});
