import { describe, expect, it } from "vitest";
import {
  aggregateDropStats,
  parseLootRef,
  simulateLootOverride,
  simulateLootPool,
  validateLootRef,
} from "./lootRefs";

describe("lootRefs", () => {
  it("parses pool and override strategies", () => {
    expect(parseLootRef({ strategy: "pool", poolId: "forest_common" })).toEqual({
      strategy: "pool",
      poolId: "forest_common",
    });
    const override = parseLootRef({
      strategy: "override",
      drops: [{ itemId: "quest_key", chance: 100, min: 1, max: 1 }],
    });
    expect(override?.strategy).toBe("override");
    if (override?.strategy === "override") {
      expect(override.drops[0]?.itemId).toBe("quest_key");
    }
  });

  it("accepts itemSlug alias when normalizing drops", () => {
    const ref = parseLootRef({
      strategy: "override",
      drops: [{ itemSlug: "wood", weight: 10, minQty: 1, maxQty: 3 }],
    });
    expect(ref?.strategy).toBe("override");
    if (ref?.strategy === "override") {
      expect(ref.drops[0]).toMatchObject({ itemId: "wood", min: 1, max: 3, weight: 10 });
    }
  });

  it("simulates weighted pool rolls deterministically with seeded rng", () => {
    let i = 0;
    const seq = [0.1, 0.9, 0.2, 0.5];
    const rng = () => seq[i++ % seq.length]!;
    const drops = simulateLootPool(
      {
        id: "wood_tier2",
        name: "Wood T2",
        rollsPerDrop: 1,
        guaranteedDrops: [{ itemId: "bark", min: 1, max: 1 }],
        entries: [
          { itemId: "oak_log", weight: 80, min: 1, max: 1 },
          { itemId: "rare_sap", weight: 20, min: 1, max: 1 },
        ],
      },
      { rng }
    );
    expect(drops.some((d) => d.source === "guaranteed" && d.itemId === "bark")).toBe(true);
    expect(drops.some((d) => d.source === "weighted")).toBe(true);
  });

  it("simulates override chance drops", () => {
    const always = simulateLootOverride(
      [{ itemId: "quest_key", chance: 100, min: 1, max: 1 }],
      () => 0.5
    );
    expect(always).toEqual([{ itemId: "quest_key", qty: 1, source: "override" }]);
    const never = simulateLootOverride(
      [{ itemId: "quest_key", chance: 0, min: 1, max: 1 }],
      () => 0.5
    );
    expect(never).toEqual([]);
  });

  it("aggregates drop statistics", () => {
    const stats = aggregateDropStats([
      [{ itemId: "a", qty: 1, source: "weighted" }],
      [{ itemId: "a", qty: 2, source: "weighted" }, { itemId: "b", qty: 1, source: "weighted" }],
    ]);
    expect(stats.a?.count).toBe(2);
    expect(stats.a?.rate).toBe(1);
    expect(stats.b?.rate).toBe(0.5);
  });

  it("validates loot refs", () => {
    expect(validateLootRef({ strategy: "pool", poolId: "x" }).valid).toBe(true);
    expect(validateLootRef({ strategy: "pool", poolId: "  " }).valid).toBe(false);
    expect(validateLootRef({ strategy: "override", drops: [] }).valid).toBe(false);
  });
});
