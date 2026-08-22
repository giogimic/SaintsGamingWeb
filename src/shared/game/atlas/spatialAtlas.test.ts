import { describe, it, expect } from 'vitest';
import {
  getAdjacentAtlasNeighbors,
  calculateBorderWarp,
  normalizeAtlasGridData,
  normalizeAtlasNode,
  createAtlasNodeId,
  AtlasGridData,
  AtlasNode,
} from './spatialAtlas';

describe('World Atlas Spatial Adjacency Engine (Bible 23 & 24)', () => {
  const mockAtlas: AtlasGridData = {
    nodes: [
      { id: 'node_town', mapId: 'TOWN_CENTER', x: 5, y: 5, gridX: 5, gridY: 5, width: 30, height: 30 },
      { id: 'node_forest', mapId: 'NORTH_FOREST', x: 5, y: 4, gridX: 5, gridY: 4, width: 30, height: 30 }, // North
      { id: 'node_coast', mapId: 'EAST_COAST', x: 6, y: 5, gridX: 6, gridY: 5, width: 40, height: 30 },   // East
      { id: 'node_desert', mapId: 'SOUTH_DESERT', x: 5, y: 6, gridX: 5, gridY: 6, width: 30, height: 30 },  // South
      { id: 'node_mountains', mapId: 'WEST_MOUNTAINS', x: 4, y: 5, gridX: 4, gridY: 5, width: 30, height: 30 },// West
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
    expect(warp?.targetNodeId).toBe('node_coast');
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
    expect(warp?.targetNodeId).toBe('node_forest');
    expect(warp?.spawnX).toBe(12);
    expect(warp?.spawnY).toBe(29);
  });

  it('returns null if no neighbor exists in requested direction', () => {
    const isolatedAtlas: AtlasGridData = {
      nodes: [{ id: 'node_island', mapId: 'ISLAND', x: 0, y: 0, gridX: 0, gridY: 0 }],
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

  describe('Duplicate Map Placement & Node Identity Topology', () => {
    // Scenario:
    // Node A: FOREST @ (2,3) with north=TOWN, east=CAVE
    // Node B: FOREST @ (8,3) with north=DESERT, west=VILLAGE
    const multiAtlas: AtlasGridData = {
      nodes: [
        { id: 'node_forest_a', mapId: 'FOREST', x: 2, y: 3 },
        { id: 'node_town', mapId: 'TOWN', x: 2, y: 2 },
        { id: 'node_cave', mapId: 'CAVE', x: 3, y: 3 },
        { id: 'node_forest_b', mapId: 'FOREST', x: 8, y: 3 },
        { id: 'node_desert', mapId: 'DESERT', x: 8, y: 2 },
        { id: 'node_village', mapId: 'VILLAGE', x: 7, y: 3 },
      ],
    };

    it('distinguishes Forest A neighbors from Forest B neighbors using node instance ID', () => {
      const neighborsA = getAdjacentAtlasNeighbors(multiAtlas, 'node_forest_a');
      expect(neighborsA.north?.mapId).toBe('TOWN');
      expect(neighborsA.east?.mapId).toBe('CAVE');
      expect(neighborsA.south).toBeUndefined();
      expect(neighborsA.west).toBeUndefined();

      const neighborsB = getAdjacentAtlasNeighbors(multiAtlas, 'node_forest_b');
      expect(neighborsB.north?.mapId).toBe('DESERT');
      expect(neighborsB.west?.mapId).toBe('VILLAGE');
      expect(neighborsB.south).toBeUndefined();
      expect(neighborsB.east).toBeUndefined();
    });

    it('distinguishes neighbors when AtlasNode object is passed directly', () => {
      const nodeA = multiAtlas.nodes.find((n) => n.id === 'node_forest_a')!;
      const nodeB = multiAtlas.nodes.find((n) => n.id === 'node_forest_b')!;

      const neighborsA = getAdjacentAtlasNeighbors(multiAtlas, nodeA);
      expect(neighborsA.north?.id).toBe('node_town');
      expect(neighborsA.east?.id).toBe('node_cave');

      const neighborsB = getAdjacentAtlasNeighbors(multiAtlas, nodeB);
      expect(neighborsB.north?.id).toBe('node_desert');
      expect(neighborsB.west?.id).toBe('node_village');
    });

    it('preserves node ID when node coordinates are moved', () => {
      const nodeA = multiAtlas.nodes.find((n) => n.id === 'node_forest_a')!;
      // Move Forest A to (7,2), placing it adjacent to DESERT @ (8,2) and VILLAGE @ (7,3)
      const movedNodeA: AtlasNode = {
        ...nodeA,
        x: 7,
        y: 2,
      };

      expect(movedNodeA.id).toBe('node_forest_a'); // ID preserved!

      const updatedAtlas: AtlasGridData = {
        nodes: [
          movedNodeA,
          ...multiAtlas.nodes.filter((n) => n.id !== 'node_forest_a'),
        ],
      };

      const neighborsMoved = getAdjacentAtlasNeighbors(updatedAtlas, movedNodeA);
      expect(neighborsMoved.east?.id).toBe('node_desert');
      expect(neighborsMoved.south?.id).toBe('node_village');
      expect(neighborsMoved.north).toBeUndefined();
    });

    it('normalizes legacy atlas data without IDs by generating unique persistent IDs', () => {
      const legacyAtlas = {
        nodes: [
          { mapId: 'FOREST', x: 2, y: 3 },
          { mapId: 'FOREST', x: 8, y: 3 },
        ],
      };

      const normalized = normalizeAtlasGridData(legacyAtlas);
      expect(normalized.nodes).toHaveLength(2);
      expect(normalized.nodes[0].id).toBeTruthy();
      expect(normalized.nodes[1].id).toBeTruthy();
      expect(normalized.nodes[0].id).not.toBe(normalized.nodes[1].id);
      expect(normalized.nodes[0].x).toBe(2);
      expect(normalized.nodes[1].x).toBe(8);
    });
  });
});
