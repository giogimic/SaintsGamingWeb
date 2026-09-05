import { describe, it, expect } from 'vitest';
import {
  calculateSeraphtFirstGid,
  gidToLocalCoords,
  localCoordsToGid,
  type TilesetCalculationMeta,
} from './tilesetCalculations';

describe('Tileset GID Calculations (Phase 4C)', () => {
  it('returns firstgid 1 when no tilesets exist', () => {
    expect(calculateSeraphtFirstGid([])).toBe(1);
  });

  it('calculates sequential firstgid offsets when appending tilesets', () => {
    const initial = [{ firstgid: 1, columns: 8 }];
    const seraphtGid = calculateSeraphtFirstGid(initial);
    expect(seraphtGid).toBe(100001);

    const seraphtSeraphtGid = calculateSeraphtFirstGid([...initial, { firstgid: seraphtGid, columns: 8 }]);
    expect(seraphtSeraphtGid).toBe(200001);
  });

  it('converts GID to local tileset coordinates correctly', () => {
    const tileset: TilesetCalculationMeta = {
      firstgid: 1,
      columns: 8,
      tilewidth: 16,
      tileheight: 16,
    };

    // First tile GID 1 -> local 0, col 0, row 0
    expect(gidToLocalCoords(1, tileset)).toEqual({ localId: 0, col: 0, row: 0 });

    // GID 17 -> local 16 (row 2, col 0)
    expect(gidToLocalCoords(17, tileset)).toEqual({ localId: 16, col: 0, row: 2 });

    // GID 10 -> local 9 (row 1, col 1)
    expect(gidToLocalCoords(10, tileset)).toEqual({ localId: 9, col: 1, row: 1 });

    // Negative / below firstgid returns null
    expect(gidToLocalCoords(0, tileset)).toBeNull();
  });

  it('converts local coordinates back to GID accurately', () => {
    const tileset: TilesetCalculationMeta = {
      firstgid: 100,
      columns: 10,
      tilewidth: 16,
      tileheight: 16,
    };

    expect(localCoordsToGid(0, 0, tileset)).toBe(100);
    expect(localCoordsToGid(5, 2, tileset)).toBe(125);
  });
});
