import { describe, it, expect } from "vitest";
import {
  LOGIC_LAYER_IDX,
  eraseTilesInRegion,
  isPaintableLogicId,
  isTilePickTarget,
  paintCell,
  resolvePaintTarget,
  type PaintableMap,
} from "./tilePaint";

function demoMap(): PaintableMap {
  return {
    grid: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
    tileLayers: [
      {
        name: "Ground",
        grid: [
          [17, 17, 17],
          [17, 17, 17],
          [17, 17, 17],
        ],
      },
    ],
    tilesets: [{ firstgid: 1 }, { firstgid: 1000 }],
  };
}

describe("resolvePaintTarget", () => {
  it("targets the logic grid on layer -1", () => {
    expect(resolvePaintTarget(demoMap(), LOGIC_LAYER_IDX)).toEqual({ kind: "logic" });
  });

  it("targets an existing visual layer", () => {
    expect(resolvePaintTarget(demoMap(), 0)).toEqual({ kind: "visual", layerIdx: 0 });
  });

  it("refuses the logic layer when the map has no grid", () => {
    const target = resolvePaintTarget({ grid: [], tilesets: [{ firstgid: 1 }] }, LOGIC_LAYER_IDX);
    expect(target.kind).toBe("unavailable");
  });

  it("refuses a visual layer when the map has no tilesets", () => {
    const map = { ...demoMap(), tilesets: [] };
    const target = resolvePaintTarget(map, 0);
    expect(target.kind).toBe("unavailable");
    expect(target).toMatchObject({ reason: expect.stringContaining("no tilesets") });
  });

  it("refuses a visual layer index that does not exist", () => {
    const target = resolvePaintTarget(demoMap(), 3);
    expect(target.kind).toBe("unavailable");
    expect(target).toMatchObject({ reason: expect.stringContaining("No visual layer 3") });
  });

  it("refuses unknown negative layer indices such as the -2 logic mesh marker", () => {
    expect(resolvePaintTarget(demoMap(), -2).kind).toBe("unavailable");
  });

  it("refuses a null map", () => {
    expect(resolvePaintTarget(null, 0).kind).toBe("unavailable");
    expect(resolvePaintTarget(undefined, LOGIC_LAYER_IDX).kind).toBe("unavailable");
  });
});

describe("paintCell", () => {
  it("writes the logic grid in place", () => {
    const map = demoMap();
    expect(paintCell(map, { kind: "logic" }, 2, 1, 5)).toEqual({ ok: true });
    expect(map.grid![2][1]).toBe(5);
  });

  it("writes a visual layer in place without touching the logic grid", () => {
    const map = demoMap();
    expect(paintCell(map, { kind: "visual", layerIdx: 0 }, 0, 2, 4321)).toEqual({ ok: true });
    expect(map.tileLayers![0].grid![0][2]).toBe(4321);
    expect(map.grid![0][2]).toBe(0);
  });

  it("is idempotent when the cell already holds the id", () => {
    const map = demoMap();
    expect(paintCell(map, { kind: "visual", layerIdx: 0 }, 1, 1, 17)).toEqual({ ok: true });
    expect(map.tileLayers![0].grid![1][1]).toBe(17);
  });

  it("reports a ragged grid instead of throwing", () => {
    const map: PaintableMap = {
      tilesets: [{ firstgid: 1 }],
      tileLayers: [{ name: "Ground", grid: [[17, 17], undefined as unknown as number[]] }],
    };
    expect(() => paintCell(map, { kind: "visual", layerIdx: 0 }, 1, 0, 20)).not.toThrow();
    expect(paintCell(map, { kind: "visual", layerIdx: 0 }, 1, 0, 20).ok).toBe(false);
  });

  it("reports frozen map data instead of throwing", () => {
    const map = demoMap();
    map.grid!.forEach((row) => Object.freeze(row));
    Object.freeze(map.grid);
    const result = paintCell(map, { kind: "logic" }, 0, 0, 2);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining("read-only") });
    expect(map.grid![0][0]).toBe(0);
  });

  it("reports out-of-bounds cells", () => {
    const map = demoMap();
    expect(paintCell(map, { kind: "logic" }, 9, 0, 1).ok).toBe(false);
    expect(paintCell(map, { kind: "logic" }, 0, 9, 1).ok).toBe(false);
    expect(paintCell(map, { kind: "logic" }, -1, 0, 1).ok).toBe(false);
  });

  it("never writes for an unavailable target and passes the reason through", () => {
    const map = demoMap();
    const result = paintCell(map, { kind: "unavailable", reason: "nope" }, 0, 0, 99);
    expect(result).toEqual({ ok: false, reason: "nope" });
    expect(map.grid![0][0]).toBe(0);
  });
});

describe("isPaintableLogicId", () => {
  const registry = { 0: {}, 1: {}, 2: {} };

  it("accepts registered ids", () => {
    expect(isPaintableLogicId(registry, 0)).toBe(true);
    expect(isPaintableLogicId(registry, 2)).toBe(true);
  });

  it("rejects a leftover visual GID", () => {
    expect(isPaintableLogicId(registry, 17)).toBe(false);
    expect(isPaintableLogicId(registry, 4321)).toBe(false);
  });

  it("does not block painting before the registry loads", () => {
    expect(isPaintableLogicId({}, 4321)).toBe(true);
    expect(isPaintableLogicId(null, 4321)).toBe(true);
  });
});

describe("isTilePickTarget", () => {
  it("accepts map surfaces", () => {
    for (const name of [
      "map_pick_plane",
      "logic_3_4",
      "tile_0_3_4",
      "tileset_mesh_Terrain_by_George.png",
      "ground_2_2",
      "base_ground_17",
    ]) {
      expect(isTilePickTarget(name)).toBe(true);
    }
  });

  it("rejects sprites and effects so clicks near an NPC still hit the ground", () => {
    for (const name of [
      "entity_npc_marshal_vance",
      "player_main",
      "multiplayer_abc",
      "paint_0_1_1",
      "",
      null,
      undefined,
    ]) {
      expect(isTilePickTarget(name)).toBe(false);
    }
  });
});

describe("eraseTilesInRegion", () => {
  it("erases selected region on visual layer and records changed cells", () => {
    const map = demoMap();
    const result = eraseTilesInRegion({
      map,
      layerIdx: 0,
      minR: 0,
      maxR: 1,
      minC: 1,
      maxC: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cells.length).toBe(4);
    expect(result.cells).toContainEqual({ layerIdx: 0, r: 0, c: 1, before: 17, after: 0 });
    expect(result.cells).toContainEqual({ layerIdx: 0, r: 0, c: 2, before: 17, after: 0 });
    expect(result.cells).toContainEqual({ layerIdx: 0, r: 1, c: 1, before: 17, after: 0 });
    expect(result.cells).toContainEqual({ layerIdx: 0, r: 1, c: 2, before: 17, after: 0 });

    // Grid mutated in-place
    expect(map.tileLayers?.[0].grid?.[0]).toEqual([17, 0, 0]);
    expect(map.tileLayers?.[0].grid?.[1]).toEqual([17, 0, 0]);
    expect(map.tileLayers?.[0].grid?.[2]).toEqual([17, 17, 17]);
  });

  it("erases selected region on logic layer (-1)", () => {
    const map = demoMap();
    const result = eraseTilesInRegion({
      map,
      layerIdx: LOGIC_LAYER_IDX,
      minR: 0,
      maxR: 2,
      minC: 0,
      maxC: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Only non-zero cell in logic grid was [1, 1] with value 1
    expect(result.cells).toEqual([
      { layerIdx: -1, r: 1, c: 1, before: 1, after: 0 },
    ]);
    expect(map.grid?.[1][1]).toBe(0);
  });

  it("handles reversed coordinates gracefully (minR > maxR)", () => {
    const map = demoMap();
    const result = eraseTilesInRegion({
      map,
      layerIdx: 0,
      minR: 2,
      maxR: 0,
      minC: 2,
      maxC: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cells.length).toBe(9);
  });

  it("refuses when map is missing", () => {
    const result = eraseTilesInRegion({
      map: null,
      layerIdx: 0,
      minR: 0,
      maxR: 1,
      minC: 0,
      maxC: 1,
    });
    expect(result.ok).toBe(false);
  });
});
