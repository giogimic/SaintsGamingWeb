import { describe, it, expect } from "vitest";
import {
  buildSaintsHavenGrid,
  buildWildMeadowsGrid,
  buildQuarryMineGrid,
  buildTrainingArenaGrid,
  buildDungeonCryptsGrid,
} from "./demoMapSeed";

describe("Starter Testing Realm Map Grids", () => {
  it("builds SAINTS_HAVEN 40x40 grid with outer walls and plaza logic", () => {
    const grid = buildSaintsHavenGrid();
    expect(grid.length).toBe(40);
    expect(grid[0].length).toBe(40);

    // Corners are solid walls (logic 1)
    expect(grid[0][0]).toBe(1);
    expect(grid[0][39]).toBe(1);
    expect(grid[39][0]).toBe(1);
    expect(grid[39][39]).toBe(1);

    // North Gate opening at (20, 1) -> logic 14
    expect(grid[1][20]).toBe(14);
    // East Gate opening at (38, 20) -> logic 15
    expect(grid[20][38]).toBe(15);
    // South Gate opening at (20, 38) -> logic 16
    expect(grid[38][20]).toBe(16);
    // West Gate opening at (1, 20) -> logic 18
    expect(grid[20][1]).toBe(18);
    // Center Portal at (20, 15) -> logic 23
    expect(grid[15][20]).toBe(23);
  });

  it("builds WILD_MEADOWS 36x36 grid with tall grass quadrants and return gate", () => {
    const grid = buildWildMeadowsGrid();
    expect(grid.length).toBe(36);
    expect(grid[0].length).toBe(36);

    // Tall grass patches in NW (logic 2)
    expect(grid[8][8]).toBe(2);
    // Tall grass patches in NE (logic 2)
    expect(grid[8][26]).toBe(2);
    // Return gate to Saints Haven at south (18, 34)
    expect(grid[34][18]).toBe(16);
  });

  it("builds QUARRY_MINE 32x32 grid with mining ore and monster spawner nodes", () => {
    const grid = buildQuarryMineGrid();
    expect(grid.length).toBe(32);
    expect(grid[0].length).toBe(32);

    // West return gate at (1, 16) -> logic 17
    expect(grid[16][1]).toBe(17);
    // Mine shaft at (30, 16) -> logic 21
    expect(grid[16][30]).toBe(21);
  });

  it("builds TRAINING_ARENA 30x30 colosseum ring", () => {
    const grid = buildTrainingArenaGrid();
    expect(grid.length).toBe(30);
    expect(grid[0].length).toBe(30);

    // Center arena ring (logic 13)
    expect(grid[15][15]).toBe(13);
    // North return gate at (15, 1) -> logic 14
    expect(grid[1][15]).toBe(14);
  });

  it("builds DUNGEON_CRYPTS 32x32 shadow crypts", () => {
    const grid = buildDungeonCryptsGrid();
    expect(grid.length).toBe(32);
    expect(grid[0].length).toBe(32);

    // Boss spawner center (16, 12) -> logic 13
    expect(grid[12][16]).toBe(13);
    // South exit gate (16, 29) -> logic 16
    expect(grid[29][16]).toBe(16);
  });
});
