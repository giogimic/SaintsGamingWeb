import { describe, expect, it } from 'vitest';
import { WorldSimulation, WorldState } from './WorldSimulation';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import {
  packVoxel,
  VoxelShape,
  VoxelOrientation,
  VoxelPhysics,
  VOXEL_MAT_GRASS,
  VOXEL_MAT_STONE,
  VOXEL_MAT_WATER,
  VOXEL_MAT_LAVA,
} from '@/shared/game/voxel/VoxelWord';

function createMockWorldState(overrides?: Partial<WorldState>): WorldState {
  const mapWidth = 8;
  const mapHeight = 8;
  const grid = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
  const voxelWorld = new VoxelWorld('test_sim', 'Test Sim', 1, 1, 1);
  voxelWorld.generateDefaultWorld();

  return {
    currentMapId: 'test_map',
    mapWidth,
    mapHeight,
    mapGrid: grid,
    gates: [],
    staticNpcs: [],
    dynamicEntities: [],
    logicTiles: {},
    playerPos: { x: 2, y: 2 },
    isDevEditorOpen: false,
    voxelWorld,
    ...overrides,
  };
}

describe('WorldSimulation with 3D Voxel Collision', () => {
  it('calculates direction accurately', () => {
    expect(WorldSimulation.calculateDirection(2, 2, 2, 1)).toBe('up');
    expect(WorldSimulation.calculateDirection(2, 2, 2, 3)).toBe('down');
    expect(WorldSimulation.calculateDirection(2, 2, 1, 2)).toBe('left');
    expect(WorldSimulation.calculateDirection(2, 2, 3, 2)).toBe('right');
  });

  it('permits valid moves on default ground', () => {
    const state = createMockWorldState();
    const result = WorldSimulation.tryMove(state, 3, 2);
    expect(result.type).toBe('MOVED');
    if (result.type === 'MOVED') {
      expect(result.direction).toBe('right');
      expect(result.targetX).toBe(3);
      expect(result.targetY).toBe(2);
    }
  });

  it('blocks movement when hitting solid voxel obstacle', () => {
    const state = createMockWorldState();
    const targetX = 3;
    const targetY = 2;
    const wz = state.mapHeight - 1 - targetY;

    // Place solid obstacle at target body level (y=16)
    const wallWord = packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE, 0);
    state.voxelWorld.setVoxel(targetX, 16, wz, wallWord);

    const result = WorldSimulation.tryMove(state, targetX, targetY);
    expect(result.type).toBe('BLOCKED');
    if (result.type === 'BLOCKED') {
      expect(result.reason).toBe('WALL');
    }
  });

  it('permits movement through walkable slope and stair voxels', () => {
    const state = createMockWorldState();
    const targetX = 3;
    const targetY = 2;
    const wz = state.mapHeight - 1 - targetY;

    // Place walkable slope
    const slopeWord = packVoxel(VOXEL_MAT_GRASS, VoxelShape.SLOPE_45, VoxelOrientation.NORTH, 0, VoxelPhysics.WALKABLE_SLOPE, 0);
    state.voxelWorld.setVoxel(targetX, 16, wz, slopeWord);

    const slopeResult = WorldSimulation.tryMove(state, targetX, targetY);
    expect(slopeResult.type).toBe('MOVED');

    // Place stairs
    const stairsWord = packVoxel(VOXEL_MAT_STONE, VoxelShape.STAIRS_STRAIGHT, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE, 0);
    state.voxelWorld.setVoxel(targetX, 16, wz, stairsWord);

    const stairsResult = WorldSimulation.tryMove(state, targetX, targetY);
    expect(stairsResult.type).toBe('MOVED');
  });

  it('triggers SWIM stepAction when stepping into fluid voxels', () => {
    const state = createMockWorldState();
    const targetX = 3;
    const targetY = 2;
    const wz = state.mapHeight - 1 - targetY;

    const waterWord = packVoxel(VOXEL_MAT_WATER, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SWIMMABLE_FLUID, 0);
    state.voxelWorld.setVoxel(targetX, 15, wz, waterWord);

    const result = WorldSimulation.tryMove(state, targetX, targetY);
    expect(result.type).toBe('MOVED');
    if (result.type === 'MOVED') {
      expect(result.stepAction).toBe('SWIM');
    }
  });

  it('triggers HAZARD stepAction when stepping into hazard damage voxels', () => {
    const state = createMockWorldState();
    const targetX = 3;
    const targetY = 2;
    const wz = state.mapHeight - 1 - targetY;

    const lavaWord = packVoxel(VOXEL_MAT_LAVA, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.HAZARD, 0);
    state.voxelWorld.setVoxel(targetX, 15, wz, lavaWord);

    const result = WorldSimulation.tryMove(state, targetX, targetY);
    expect(result.type).toBe('MOVED');
    if (result.type === 'MOVED') {
      expect(result.stepAction).toBe('HAZARD');
    }
  });

  it('blocks out of bounds movement when no border connection exists', () => {
    const state = createMockWorldState();
    const result = WorldSimulation.tryMove(state, -1, 2);
    expect(result.type).toBe('BLOCKED');
    if (result.type === 'BLOCKED') {
      expect(result.reason).toBe('BOUNDS');
    }
  });
});
