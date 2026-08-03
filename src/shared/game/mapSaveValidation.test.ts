import { describe, expect, it } from "vitest";
import { validateMapSave, type LogicTileMeta } from "./mapSaveValidation";

const TILES: LogicTileMeta[] = [
  { id: 0, isSolid: false },
  { id: 1, isSolid: true },
  { id: 2, isSolid: false },
];

function openGrid(w = 8, h = 8, fill = 0): number[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

describe("validateMapSave", () => {
  it("accepts a simple walkable grid", () => {
    expect(validateMapSave({ grid: openGrid() }, TILES)).toEqual({ ok: true });
  });

  it("rejects empty grid", () => {
    const r = validateMapSave({ grid: [] }, TILES);
    expect(r.ok).toBe(false);
  });

  it("rejects undersized maps", () => {
    const r = validateMapSave({ grid: [[0, 0], [0, 0]] }, TILES);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/between/);
  });

  it("rejects unknown logic tile ids", () => {
    const grid = openGrid();
    grid[3][3] = 99;
    const r = validateMapSave({ grid }, TILES);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Unknown logic tile/);
  });

  it("rejects fully solid (trapped) maps", () => {
    const r = validateMapSave({ grid: openGrid(8, 8, 1) }, TILES);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Trapped map/);
  });

  it("rejects NPC on solid tile", () => {
    const grid = openGrid();
    grid[2][2] = 1;
    const r = validateMapSave({ grid, npcs: [{ id: "boss", x: 2, y: 2 }] }, TILES);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/solid tile/);
  });

  it("rejects out-of-bounds NPC", () => {
    const r = validateMapSave(
      { grid: openGrid(), npcs: [{ name: "lost", x: 99, y: 1 }] },
      TILES
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/out of bounds/);
  });
});
