import { describe, expect, it } from "vitest";
import { normalizeEncounterEntries, pickWeightedSlug } from "./encounterWeights";

describe("encounterWeights", () => {
  it("normalizes map encounter arrays", () => {
    const entries = normalizeEncounterEntries([
      { slug: "rockitten", weight: 3 },
      { speciesSlug: "agnite", encounter_rate: 0.5 },
    ]);
    expect(entries).toEqual([
      { slug: "rockitten", weight: 3 },
      { slug: "agnite", weight: 50 },
    ]);
  });

  it("normalizes tuxemon monsters blob", () => {
    const entries = normalizeEncounterEntries({
      monsters: [{ monster: "budaye", encounter_rate: 0.2 }],
    });
    expect(entries[0]).toEqual({ slug: "budaye", weight: 20 });
  });

  it("picks deterministically with rng", () => {
    const entries = [
      { slug: "a", weight: 1 },
      { slug: "b", weight: 99 },
    ];
    expect(pickWeightedSlug(entries, () => 0)).toBe("a");
    expect(pickWeightedSlug(entries, () => 0.5)).toBe("b");
  });
});
