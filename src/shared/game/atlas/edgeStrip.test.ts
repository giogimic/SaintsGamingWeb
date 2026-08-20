import { describe, it, expect } from 'vitest';
import { getEdgeStrip } from './edgeStrip';

describe('edgeStrip extraction', () => {
  const sampleMap = {
    id: 'FOREST_NORTH',
    width: 4,
    height: 4,
    grid: [
      [10, 11, 12, 13],
      [20, 21, 22, 23],
      [30, 31, 32, 33],
      [40, 41, 42, 43],
    ],
    tileLayers: [
      {
        name: 'Ground',
        grid: [
          [10, 11, 12, 13],
          [20, 21, 22, 23],
          [30, 31, 32, 33],
          [40, 41, 42, 43],
        ],
      },
    ],
    tilesets: [{ firstgid: 1, imageSource: 'terrain.png' }],
  };

  it('extracts bottom rows when direction is north (facing southern border of north map)', () => {
    const strip = getEdgeStrip(sampleMap, 'north', 2);
    expect(strip.direction).toBe('north');
    expect(strip.depth).toBe(2);
    expect(strip.sourceMapId).toBe('FOREST_NORTH');
    
    // offsetR 0 corresponds to row 3 (40, 41, 42, 43)
    const seamRow = strip.tiles.filter((t) => t.offsetR === 0);
    expect(seamRow.map((t) => t.tileId)).toEqual([40, 41, 42, 43]);

    // offsetR 1 corresponds to row 2 (30, 31, 32, 33)
    const secondRow = strip.tiles.filter((t) => t.offsetR === 1);
    expect(secondRow.map((t) => t.tileId)).toEqual([30, 31, 32, 33]);
  });

  it('extracts top rows when direction is south (facing northern border of south map)', () => {
    const strip = getEdgeStrip(sampleMap, 'south', 2);
    expect(strip.direction).toBe('south');
    expect(strip.depth).toBe(2);

    // offsetR 0 corresponds to row 0 (10, 11, 12, 13)
    const seamRow = strip.tiles.filter((t) => t.offsetR === 0);
    expect(seamRow.map((t) => t.tileId)).toEqual([10, 11, 12, 13]);
  });

  it('extracts leftmost columns when direction is east (facing western border of east map)', () => {
    const strip = getEdgeStrip(sampleMap, 'east', 2);
    expect(strip.direction).toBe('east');
    expect(strip.depth).toBe(2);

    // offsetC 0 corresponds to col 0 ([10, 20, 30, 40])
    const seamCol = strip.tiles.filter((t) => t.offsetC === 0);
    expect(seamCol.map((t) => t.tileId)).toEqual([10, 20, 30, 40]);
  });

  it('extracts rightmost columns when direction is west (facing eastern border of west map)', () => {
    const strip = getEdgeStrip(sampleMap, 'west', 2);
    expect(strip.direction).toBe('west');
    expect(strip.depth).toBe(2);

    // offsetC 0 corresponds to col 3 ([13, 23, 33, 43])
    const seamCol = strip.tiles.filter((t) => t.offsetC === 0);
    expect(seamCol.map((t) => t.tileId)).toEqual([13, 23, 33, 43]);
  });
});
