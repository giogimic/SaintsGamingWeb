import { describe, it, expect, beforeEach } from "vitest";
import { getCachedMap, setCachedMap, invalidateMapCache, patchCachedMapTile } from "./mapCache";
import { isWalkableSync, getMapDimensions, getTile } from "./mapQueries";
import type { MapData } from "./types/map";

describe("Shared Map System (Cache & Queries)", () => {
  const testMap: MapData = {
    id: "TEST_MAP",
    name: "Test Map",
    grid: [
      [0, 1, 0],
      [0, 0, 0],
      [1, 1, 0],
    ],
    gates: {},
    npcs: [],
    encountersData: [],
    width: 3,
    height: 3,
  };

  beforeEach(() => {
    invalidateMapCache();
    setCachedMap("TEST_MAP", testMap);
  });

  it("should get cached map by id", () => {
    const cached = getCachedMap("TEST_MAP");
    expect(cached).toBeDefined();
    expect(cached?.name).toBe("Test Map");
  });

  it("should return correct dimensions", () => {
    const dims = getMapDimensions("TEST_MAP");
    expect(dims).toEqual({ width: 3, height: 3 });
  });

  it("should check tile values and walkability sync", () => {
    expect(getTile("TEST_MAP", 0, 0)).toBe(0);
    expect(getTile("TEST_MAP", 1, 0)).toBe(1);
    expect(isWalkableSync("TEST_MAP", 0, 0)).toBe(true);
    expect(isWalkableSync("TEST_MAP", -1, 0)).toBe(false);
  });

  it("should patch cached tile in place", () => {
    const ok = patchCachedMapTile("TEST_MAP", 1, 0, 0);
    expect(ok).toBe(true);
    expect(getTile("TEST_MAP", 1, 0)).toBe(0);
  });

  it("should invalidate map cache", () => {
    invalidateMapCache("TEST_MAP");
    expect(getCachedMap("TEST_MAP")).toBeNull();
  });
});
