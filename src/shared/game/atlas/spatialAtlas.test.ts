import { describe, it, expect } from 'vitest';
import {
  getAdjacentAtlasNeighbors,
  calculateBorderWarp,
  AtlasGridData,
} from './spatialAtlas';

describe('World Atlas Spatial Adjacency Engine (Bible 23 & 24)', () => {
  const mockAtlas: AtlasGridData = {
    nodes: [
      { mapId: 'TOWN_CENTER', gridX: 5, gridY: 5, width: 30, height: 30 },
      { mapId: 'NORTH_FOREST', gridX: 5, gridY: 4, width: 30, height: 30 }, // North
      { mapId: 'EAST_COAST', gridX: 6, gridY: 5, width: 40, height: 30 },   // East
      { mapId: 'SOUTH_DESERT', gridX: 5, gridY: 6, width: 30, height: 30 },  // South
      { mapId: 'WEST_MOUNTAINS', gridX: 4, gridY: 5, width: 30, height: 30 },// West
    ],
  };

  it('correctly discovers 4-directional adjacent neighbors', () => {
    const neighbors = getAdjacentAtlasNeighbors(mockAtlas, 'TOWN_CENTER');

    expect(neighbors.north?.mapId).toBe('NORTH_FOREST');
    expect(neighbors.east?.mapId).toBe('EAST_COAST');
    expect(neighbors.south?.mapId).toBe('SOUTH_DESERT');
    expect(neighbors.west?.mapId).toBe('WEST_MOUNTAINS');
  });

  it('calculates exact East border warp coordinates (x=29 -> x=0 in neighbor)', () => {
    const warp = calculateBorderWarp(
      'TOWN_CENTER',
      { width: 30, height: 30 },
      { x: 29, y: 15 },
      'east',
      mockAtlas,
      { width: 40, height: 30 }
    );

    expect(warp).not.toBeNull();
    expect(warp?.targetMapId).toBe('EAST_COAST');
    expect(warp?.spawnX).toBe(0);
    expect(warp?.spawnY).toBe(15);
  });

  it('calculates exact North border warp coordinates (y=0 -> y=29 in neighbor)', () => {
    const warp = calculateBorderWarp(
      'TOWN_CENTER',
      { width: 30, height: 30 },
      { x: 12, y: 0 },
      'north',
      mockAtlas,
      { width: 30, height: 30 }
    );

    expect(warp).not.toBeNull();
    expect(warp?.targetMapId).toBe('NORTH_FOREST');
    expect(warp?.spawnX).toBe(12);
    expect(warp?.spawnY).toBe(29);
  });

  it('returns null if no neighbor exists in requested direction', () => {
    const isolatedAtlas: AtlasGridData = {
      nodes: [{ mapId: 'ISLAND', gridX: 0, gridY: 0 }],
    };

    const warp = calculateBorderWarp(
      'ISLAND',
      { width: 20, height: 20 },
      { x: 19, y: 10 },
      'east',
      isolatedAtlas
    );

    expect(warp).toBeNull();
  });
});
