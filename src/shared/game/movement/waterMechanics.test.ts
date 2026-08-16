import { describe, it, expect } from 'vitest';
import {
  evaluateWaterTile,
  checkWaterTraversal,
  canFishAtLocation,
  PlayerFishingContext,
} from './waterMechanics';
import { MovementProfile, MovementWorldContext } from './types';

describe('Water & Swim Mechanics Engine (Bible 34 §5 & Future Water Spec)', () => {
  const shallowTile = { id: 10, name: 'Shallow Water', terrainType: 'water', isSolid: false };
  const deepTile = { id: 11, name: 'Deep Sea Water', terrainType: 'water', isSolid: true };
  const grassTile = { id: 1, name: 'Grass Field', terrainType: 'grass', isSolid: false };

  const walkingProfile: MovementProfile = {
    mode: 'grid',
    baseSpeed: 5,
    capabilities: ['walk'],
  };

  const swimmingProfile: MovementProfile = {
    mode: 'grid',
    baseSpeed: 5,
    capabilities: ['walk', 'swim'],
  };

  it('correctly classifies water tiers (none, shallow, deep)', () => {
    expect(evaluateWaterTile(grassTile as any)).toBe('none');
    expect(evaluateWaterTile(shallowTile as any)).toBe('shallow');
    expect(evaluateWaterTile(deepTile as any)).toBe('deep');
  });

  it('allows walking in shallow water with speed penalty and wading effect', () => {
    const res = checkWaterTraversal(shallowTile as any, walkingProfile);
    expect(res.canEnter).toBe(true);
    expect(res.waterTier).toBe('shallow');
    expect(res.speedMultiplier).toBe(0.65);
    expect(res.effect).toBe('wading');
  });

  it('blocks walking in deep water, but allows swimming profile', () => {
    const walkRes = checkWaterTraversal(deepTile as any, walkingProfile);
    expect(walkRes.canEnter).toBe(false);
    expect(walkRes.reason).toContain('requires Swim capability');

    const swimRes = checkWaterTraversal(deepTile as any, swimmingProfile);
    expect(swimRes.canEnter).toBe(true);
    expect(swimRes.speedMultiplier).toBe(1.0);
    expect(swimRes.effect).toBe('swimming');
  });

  it('validates manual fishing interaction when standing adjacent to water with a rod', () => {
    const world: MovementWorldContext = {
      mapWidth: 5,
      mapHeight: 5,
      mapGrid: [
        [1, 1, 1],
        [1, 10, 1], // Shallow water at (1, 1)
        [1, 1, 1],
      ],
      logicTiles: {
        1: grassTile as any,
        10: shallowTile as any,
      },
    };

    const playerWithRod: PlayerFishingContext = {
      id: 'p1',
      hasFishingRod: true,
      fishingLevel: 10,
    };

    const playerWithoutRod: PlayerFishingContext = {
      id: 'p2',
      hasFishingRod: false,
    };

    // Standing adjacent at (1, 0)
    const canFishWithRod = canFishAtLocation({ x: 1, y: 0 }, world, playerWithRod);
    expect(canFishWithRod.canFish).toBe(true);
    expect(canFishWithRod.targetWaterPos).toEqual({ x: 1, y: 1 });

    const canFishWithoutRod = canFishAtLocation({ x: 1, y: 0 }, world, playerWithoutRod);
    expect(canFishWithoutRod.canFish).toBe(false);
    expect(canFishWithoutRod.reason).toContain('Fishing Rod');
  });
});
