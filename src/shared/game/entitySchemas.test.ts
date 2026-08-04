import { describe, expect, it } from "vitest";
import {
  NPC_PROPERTY_CATEGORIES,
  defaultEntityProps,
  getEntitySchema,
  groupFieldsByCategory,
} from "./entitySchemas";

describe("entitySchemas", () => {
  it("exposes all NPC property categories from the architecture brief", () => {
    const npc = getEntitySchema("npc");
    for (const cat of NPC_PROPERTY_CATEGORIES) {
      expect(npc.categories).toContain(cat);
    }
    expect(npc.fields.some((f) => f.key === "loot" && f.type === "lootRef")).toBe(true);
  });

  it("resource nodes share a unified gathering schema", () => {
    const node = getEntitySchema("resource_node");
    const keys = node.fields.map((f) => f.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "resourceType",
        "requiredSkill",
        "requiredLevel",
        "xpReward",
        "harvestDurationMs",
        "depletionBehaviour",
        "respawnMs",
        "loot",
        "seasonalBehaviour",
      ])
    );
  });

  it("builds default props with empty pool loot ref where relevant", () => {
    const props = defaultEntityProps("resource_node");
    expect(props.kind).toBe("resource_node");
    expect(props.loot).toEqual({ strategy: "pool", poolId: "" });
    expect(props.requiredSkill).toBe("woodcutting");
  });

  it("groups fields and hides advanced by default", () => {
    const groups = groupFieldsByCategory(getEntitySchema("npc"), { advanced: false });
    const debug = groups.find((g) => g.category === "Debug");
    expect(debug).toBeUndefined();
    const withAdv = groupFieldsByCategory(getEntitySchema("npc"), { advanced: true });
    expect(withAdv.some((g) => g.category === "Debug")).toBe(true);
  });

  it("defines encounter zones as logic overlays (not terrain)", () => {
    const zone = getEntitySchema("encounter_zone");
    expect(zone.fields.some((f) => f.key === "encounterPool")).toBe(true);
    expect(zone.fields.some((f) => f.key === "encounterRate")).toBe(true);
  });
});
