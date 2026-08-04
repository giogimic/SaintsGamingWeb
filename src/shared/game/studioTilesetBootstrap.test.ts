import { describe, expect, it } from "vitest";
import {
  DEFAULT_STUDIO_GROUND_GID,
  DEFAULT_STUDIO_TILESETS,
  buildDefaultGroundLayer,
  buildEmptyGroundLayer,
  ensureMapHasStudioTilesets,
  isVisualTileLayersBlank,
} from "./studioTilesetBootstrap";

describe("ensureMapHasStudioTilesets", () => {
  it("bootstraps empty DEMO-style maps with visible ground GIDs", () => {
    const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
    const next = ensureMapHasStudioTilesets({
      id: "DEMO_SANDBOX",
      grid,
      tileLayers: [],
      tilesets: [],
    });
    expect(next.tileLayers).toHaveLength(1);
    const ground = next.tileLayers![0]!;
    expect(ground.name).toBe("Ground");
    expect(ground.grid).toHaveLength(4);
    expect(ground.grid.every((row: number[]) => row.every((c: number) => c === DEFAULT_STUDIO_GROUND_GID))).toBe(
      true
    );
    expect(next.tilesets).toEqual(DEFAULT_STUDIO_TILESETS);
  });

  it("upgrades legacy GID-1 stair fill to solid grass", () => {
    const map = {
      grid: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0)),
      tileLayers: [
        {
          name: "Ground",
          grid: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 1)),
        },
      ],
      tilesets: [...DEFAULT_STUDIO_TILESETS],
    };
    const next = ensureMapHasStudioTilesets(map);
    expect(next.tileLayers![0].grid.every((row: number[]) => row.every((c: number) => c === DEFAULT_STUDIO_GROUND_GID))).toBe(
      true
    );
  });

  it("refills sparse Ground that would render nearly black", () => {
    const map = {
      grid: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 0)),
      tileLayers: [
        {
          name: "Ground",
          grid: Array.from({ length: 10 }, (_, r) =>
            Array.from({ length: 10 }, (_, c) => (r === 0 && c < 3 ? 42 + c : 0))
          ),
        },
      ],
      tilesets: [...DEFAULT_STUDIO_TILESETS],
    };
    const next = ensureMapHasStudioTilesets(map);
    expect(isVisualTileLayersBlank(next.tileLayers)).toBe(false);
    // Preserves the 3 painted brush cells
    expect(next.tileLayers![0].grid[0][0]).toBe(42);
    expect(next.tileLayers![0].grid[0][1]).toBe(43);
    expect(next.tileLayers![0].grid[0][2]).toBe(44);
    // Fills the rest
    expect(next.tileLayers![0].grid[5][5]).toBe(DEFAULT_STUDIO_GROUND_GID);
  });

  it("leaves rich maps alone", () => {
    const map = {
      grid: [[0]],
      tileLayers: [{ name: "Ground", grid: [[42]] }],
      tilesets: [{ firstgid: 1, imageSource: "x.png", columns: 1, tilewidth: 16, tileheight: 16 }],
    };
    expect(ensureMapHasStudioTilesets(map)).toBe(map);
  });

  it("buildDefaultGroundLayer matches grid size with visible GID", () => {
    const layer = buildDefaultGroundLayer([
      [0, 1],
      [1, 0],
      [0, 0],
    ]);
    expect(layer.grid).toHaveLength(3);
    expect(layer.grid[0]).toHaveLength(2);
    expect(layer.grid.every((row) => row.every((c) => c === DEFAULT_STUDIO_GROUND_GID))).toBe(true);
    // Alias still works
    expect(buildEmptyGroundLayer([[0]]).grid[0][0]).toBe(DEFAULT_STUDIO_GROUND_GID);
  });
});
