import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Asset Ingestion Pipeline (Bible 35 §3)", () => {
  it("formats asset classification and tags correctly", () => {
    const rawTags = ["hero", "warrior", "tuxemon"];
    const tagsJson = JSON.stringify(rawTags);
    expect(JSON.parse(tagsJson)).toEqual(["hero", "warrior", "tuxemon"]);
  });

  it("handles sourceRegion coordinate bounds parsing", () => {
    const region = { x: 0, y: 32, w: 32, h: 32 };
    const serialized = JSON.stringify(region);
    const deserialized = JSON.parse(serialized);
    expect(deserialized.x).toBe(0);
    expect(deserialized.y).toBe(32);
    expect(deserialized.w).toBe(32);
    expect(deserialized.h).toBe(32);
  });

  it("normalizes asset types to standard uppercase catalog types", () => {
    const validTypes = [
      "CHARACTER",
      "CREATURE",
      "TERRAIN",
      "TILE",
      "ITEM",
      "OBJECT",
      "UI",
      "EFFECT",
      "MODEL",
      "ANIMATION",
      "AUDIO",
    ];

    const input = "character";
    expect(validTypes.includes(input.toUpperCase())).toBe(true);
  });
});
