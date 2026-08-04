import { describe, expect, it } from "vitest";
import {
  DEFAULT_STUDIO_TILESETS,
  ensureMapHasStudioTilesets,
  buildEmptyGroundLayer,
} from "./studioTilesetBootstrap";

describe("ensureMapHasStudioTilesets", () => {
  it("bootstraps empty DEMO-style maps", () => {
    const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
    const next = ensureMapHasStudioTilesets({
      id: "DEMO_SANDBOX",
      grid,
      tileLayers: [],
      tilesets: [],
    });
    expect(next.tileLayers).toHaveLength(1);
    expect(next.tileLayers![0].name).toBe("Ground");
    expect(next.tileLayers![0].grid).toHaveLength(4);
    expect(next.tilesets).toEqual(DEFAULT_STUDIO_TILESETS);
  });

  it("leaves rich maps alone", () => {
    const map = {
      grid: [[0]],
      tileLayers: [{ name: "Ground", grid: [[1]] }],
      tilesets: [{ firstgid: 1, imageSource: "x.png", columns: 1, tilewidth: 16, tileheight: 16 }],
    };
    expect(ensureMapHasStudioTilesets(map)).toBe(map);
  });

  it("buildEmptyGroundLayer matches grid size", () => {
    const layer = buildEmptyGroundLayer([
      [0, 1],
      [1, 0],
      [0, 0],
    ]);
    expect(layer.grid).toHaveLength(3);
    expect(layer.grid[0]).toHaveLength(2);
    expect(layer.grid.every((row) => row.every((c) => c === 0))).toBe(true);
  });
});
