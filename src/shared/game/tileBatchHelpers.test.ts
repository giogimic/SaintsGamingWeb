import { describe, expect, it } from "vitest";
import {
  cellBatchKey,
  collapsedQuadPositions,
  groundQuadPositions,
  tileCellWorldPos,
  tilesetUvForGid,
  tilesetUvForOverlayPlane,
} from "./tileBatchHelpers";

describe("tileBatchHelpers", () => {
  it("builds stable cell keys", () => {
    expect(cellBatchKey(0, 3, 5)).toBe("0_3_5");
  });

  it("places cells relative to map center", () => {
    expect(tileCellWorldPos(0, 0, 10, 10, 1)).toEqual({ posX: -5, posZ: 5 });
    expect(tileCellWorldPos(5, 5, 10, 10, 1)).toEqual({ posX: 0, posZ: 0 });
  });

  it("builds ground quads with TL→TR→BR→BL order", () => {
    const p = groundQuadPositions(0, 0, 0.02, 1);
    expect(p).toHaveLength(12);
    expect(p.slice(0, 3)).toEqual([-0.5, 0.02, 0.5]);
    expect(p.slice(3, 6)).toEqual([0.5, 0.02, 0.5]);
  });

  it("collapses quads under the map", () => {
    const p = collapsedQuadPositions();
    expect(p.every((v, i) => (i % 3 === 1 ? v === -100 : v === 0))).toBe(true);
  });

  it("computes batched UVs with 8 floats", () => {
    const uv = tilesetUvForGid(
      17,
      { firstgid: 1, imageSource: "Terrain.png", columns: 8, tilewidth: 16, tileheight: 16 },
      { "Terrain.png": { w: 128, h: 384 } }
    );
    expect(uv).toHaveLength(8);
    expect(uv[0]).toBeLessThan(uv[2]);
  });

  it("overlay UVs differ in V order from batched", () => {
    const ts = {
      firstgid: 1,
      imageSource: "Terrain.png",
      columns: 8,
      tilewidth: 16,
      tileheight: 16,
    };
    const batch = tilesetUvForGid(2, ts);
    const overlay = tilesetUvForOverlayPlane(2, ts);
    expect(overlay[1]).toBe(batch[5]);
    expect(overlay[5]).toBe(batch[1]);
  });
});
