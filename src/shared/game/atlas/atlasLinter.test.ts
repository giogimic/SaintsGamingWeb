import { describe, it, expect } from 'vitest';
import { lintWorldAtlasConnectivity, MapDataSummary } from './atlasLinter';
import { AtlasGridData } from './spatialAtlas';

describe('World Atlas Connectivity & Gate Linter (Bible 24)', () => {
  const validTown: MapDataSummary = {
    id: 'TOWN_CENTER',
    name: 'Town Center',
    width: 20,
    height: 20,
    grid: [
      [0, 0, 0],
      [0, 0, 0],
    ],
    gates: [
      {
        targetMapId: 'FOREST',
        spawnPoint: { x: 5, y: 5 },
      },
    ],
  };

  const validForest: MapDataSummary = {
    id: 'FOREST',
    name: 'Deep Forest',
    width: 30,
    height: 30,
    grid: [
      [0, 0, 0],
      [0, 0, 0],
    ],
    gates: [
      {
        targetMapId: 'TOWN_CENTER',
        spawnPoint: { x: 2, y: 2 },
      },
    ],
  };

  it('validates healthy two-way connected maps with 0 errors and 0 warnings', () => {
    const report = lintWorldAtlasConnectivity([validTown, validForest]);
    expect(report.valid).toBe(true);
    expect(report.errors.length).toBe(0);
    expect(report.warnings.length).toBe(0);
  });

  it('detects missing target map references as errors', () => {
    const brokenMap: MapDataSummary = {
      id: 'BROKEN_MAP',
      name: 'Broken Map',
      width: 10,
      height: 10,
      gates: [
        {
          targetMapId: 'NON_EXISTENT_MAP',
          spawnPoint: { x: 1, y: 1 },
        },
      ],
    };

    const report = lintWorldAtlasConnectivity([brokenMap]);
    expect(report.valid).toBe(false);
    expect(report.errors.length).toBe(1);
    expect(report.errors[0].code).toBe('MISSING_TARGET_MAP');
  });

  it('detects out-of-bounds spawn coordinates', () => {
    const mapWithOutOfBoundsSpawn: MapDataSummary = {
      id: 'START',
      name: 'Start',
      width: 10,
      height: 10,
      gates: [
        {
          targetMapId: 'FOREST',
          spawnPoint: { x: 100, y: 50 }, // FOREST is only 30x30
        },
      ],
    };

    const report = lintWorldAtlasConnectivity([mapWithOutOfBoundsSpawn, validForest]);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'OUT_OF_BOUNDS_SPAWN')).toBe(true);
  });

  it('detects solid tile spawn traps (softlock prevention)', () => {
    const trapTarget: MapDataSummary = {
      id: 'TRAP_ROOM',
      name: 'Trap Room',
      width: 5,
      height: 5,
      grid: [
        [0, 0, 0],
        [0, 1, 0], // Solid wall at (1, 1)
      ],
      gates: [],
    };

    const sourceMap: MapDataSummary = {
      id: 'SOURCE',
      name: 'Source',
      width: 5,
      height: 5,
      gates: [
        {
          targetMapId: 'TRAP_ROOM',
          spawnPoint: { x: 1, y: 1 }, // Spawns directly on solid tile
        },
      ],
    };

    const report = lintWorldAtlasConnectivity([sourceMap, trapTarget], undefined, new Set([1]));
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'SOLID_SPAWN_TRAP')).toBe(true);
  });

  it('emits a warning for one-way gates without return paths', () => {
    const oneWayTarget: MapDataSummary = {
      id: 'DUNGEON',
      name: 'Dungeon',
      width: 10,
      height: 10,
      gates: [], // No return gate
    };

    const sourceMap: MapDataSummary = {
      id: 'OVERWORLD',
      name: 'Overworld',
      width: 10,
      height: 10,
      gates: [{ targetMapId: 'DUNGEON', spawnPoint: { x: 2, y: 2 } }],
    };

    const report = lintWorldAtlasConnectivity([sourceMap, oneWayTarget]);
    expect(report.valid).toBe(true); // Warnings don't invalidate
    expect(report.warnings.length).toBe(1);
    expect(report.warnings[0].code).toBe('ONE_WAY_GATE');
  });

  it('detects overlapping Atlas grid node positions', () => {
    const overlappingAtlas: AtlasGridData = {
      nodes: [
        { mapId: 'MAP_A', gridX: 3, gridY: 3 },
        { mapId: 'MAP_B', gridX: 3, gridY: 3 }, // Duplicate slot
      ],
    };

    const report = lintWorldAtlasConnectivity([], overlappingAtlas);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'DUPLICATE_ATLAS_SLOT')).toBe(true);
  });
});
