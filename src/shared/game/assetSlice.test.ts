import { describe, it, expect } from "vitest";

describe("Spritesheet Slicing Logic (Bible 35 §2.1)", () => {
  it("calculates correct grid coordinate boundaries for 32x32 tiles", () => {
    const sheetWidth = 128;
    const sheetHeight = 64;
    const gridSize = 32;

    const cells: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let y = 0; y < sheetHeight; y += gridSize) {
      for (let x = 0; x < sheetWidth; x += gridSize) {
        cells.push({ x, y, w: gridSize, h: gridSize });
      }
    }

    expect(cells.length).toBe(8);
    expect(cells[0]).toEqual({ x: 0, y: 0, w: 32, h: 32 });
    expect(cells[7]).toEqual({ x: 96, y: 32, w: 32, h: 32 });
  });

  it("validates rectangular region bounds within image dimensions", () => {
    const imageBounds = { width: 256, height: 256 };
    const validRegion = { x: 32, y: 64, w: 32, h: 32 };
    const invalidRegion = { x: 240, y: 240, w: 32, h: 32 };

    const isInside = (r: typeof validRegion) =>
      r.x >= 0 &&
      r.y >= 0 &&
      r.x + r.w <= imageBounds.width &&
      r.y + r.h <= imageBounds.height;

    expect(isInside(validRegion)).toBe(true);
    expect(isInside(invalidRegion)).toBe(false);
  });
});
