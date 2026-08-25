import { describe, expect, it } from "vitest";
import {
  DEFAULT_STUDIO_GROUND_GID,
  buildBorderedLogicGrid,
  buildNewStudioMap,
  clampMapDimension,
  formatMapWriteError,
  isLogicGridCopiedToVisual,
  normalizeMapSlug,
  normalizeStudioMapVisuals,
} from "./studioMapCreate";
import { DEFAULT_STUDIO_TILESETS } from "./studioTilesetBootstrap";

describe("normalizeMapSlug", () => {
  it("uppercases and replaces spaces", () => {
    expect(normalizeMapSlug("  my map  ")).toBe("MY_MAP");
  });

  it("strips invalid characters", () => {
    expect(normalizeMapSlug("test-map!")).toBe("TESTMAP");
  });
});

describe("clampMapDimension", () => {
  it("clamps to 8–128", () => {
    expect(clampMapDimension(4)).toBe(8);
    expect(clampMapDimension(200)).toBe(128);
    expect(clampMapDimension(24)).toBe(24);
  });
});

describe("buildBorderedLogicGrid", () => {
  it("walls the border and leaves interior walkable", () => {
    const g = buildBorderedLogicGrid(8, 8);
    expect(g[0][0]).toBe(1);
    expect(g[7][7]).toBe(1);
    expect(g[3][3]).toBe(0);
  });
});

describe("buildNewStudioMap", () => {
  it("rejects empty slug", () => {
    const r = buildNewStudioMap({ slug: "  " });
    expect(r.ok).toBe(false);
  });

  it("fills Ground with grass GID 17 — not a copy of the logic grid", () => {
    const r = buildNewStudioMap({ slug: "test_map", width: 10, height: 10, name: "Test" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.map.id).toBe("TEST_MAP");
    expect(r.map.grid[0][0]).toBe(1); // logic wall
    expect(r.map.grid[5][5]).toBe(0); // logic walkable
    const ground = r.map.tileLayers[0];
    expect(ground.name).toBe("Ground");
    // Every visual cell is grass — including border (logic wall cells).
    expect(ground.grid.every((row) => row.every((c) => c === DEFAULT_STUDIO_GROUND_GID))).toBe(
      true
    );
    expect(r.map.tilesets).toEqual(DEFAULT_STUDIO_TILESETS);
    // Must not accidentally copy logic wall id 1 into visuals
    expect(ground.grid[0][0]).toBe(DEFAULT_STUDIO_GROUND_GID);
    expect(ground.grid[5][5]).toBe(DEFAULT_STUDIO_GROUND_GID);
  });
});

describe("isLogicGridCopiedToVisual / normalizeStudioMapVisuals", () => {
  it("detects and repairs logic→visual copies", () => {
    const grid = buildBorderedLogicGrid(8, 8);
    expect(
      isLogicGridCopiedToVisual(grid, [{ grid: grid.map((row) => [...row]) }])
    ).toBe(true);
    const fixed = normalizeStudioMapVisuals({
      grid,
      tileLayers: [{ name: "Ground", grid: grid.map((row) => [...row]) }],
      tilesets: [],
    });
    expect(isLogicGridCopiedToVisual(fixed.grid, fixed.tileLayers)).toBe(false);
    expect(
      fixed.tileLayers![0].grid.every((row) =>
        row.every((c) => c === DEFAULT_STUDIO_GROUND_GID)
      )
    ).toBe(true);
  });
});

describe("formatMapWriteError", () => {
  it("explains auth failures", () => {
    expect(formatMapWriteError(401, {})).toMatch(/signed in/i);
    expect(formatMapWriteError(403, {})).toMatch(/Admin/i);
  });

  it("surfaces validation error text", () => {
    expect(formatMapWriteError(400, { error: "Unknown logic tile id(s): 4321" })).toMatch(
      /4321/
    );
  });
});
