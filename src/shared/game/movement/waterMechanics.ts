/**
 * Saints Gaming — Water & Swim Mechanics Engine (Bible 34 §5 & Future Water Spec)
 * Implements Shallow Water wading, Deep Water swimming/surfing, and contextual fishing checks.
 */

import { LogicTile } from '../types/map';
import { MovementProfile, MovementWorldContext } from './types';

export type WaterTier = 'none' | 'shallow' | 'deep';

export interface WaterEvaluationResult {
  isWater: boolean;
  waterTier: WaterTier;
  canEnter: boolean;
  speedMultiplier: number;
  effect?: 'wading' | 'swimming' | 'surfing';
  reason?: string;
}

/**
 * Resolves whether a tile is water and what tier it belongs to.
 */
export function evaluateWaterTile(tile: LogicTile | undefined): WaterTier {
  if (!tile) return 'none';

  if (tile.terrainType === 'water' || tile.name?.toLowerCase().includes('water')) {
    if (tile.name?.toLowerCase().includes('deep') || tile.elevation === -2) {
      return 'deep';
    }
    return 'shallow';
  }

  return 'none';
}

/**
 * Evaluates water traversal rules for a player profile entering a tile.
 */
export function checkWaterTraversal(
  tile: LogicTile | undefined,
  profile: MovementProfile
): WaterEvaluationResult {
  const tier = evaluateWaterTile(tile);

  if (tier === 'none') {
    return {
      isWater: false,
      waterTier: 'none',
      canEnter: true,
      speedMultiplier: 1.0,
    };
  }

  // Shallow Water: Walkable by default with speed penalty (wading)
  if (tier === 'shallow') {
    const isSwimmer = profile.capabilities.includes('swim') || profile.capabilities.includes('fly');
    return {
      isWater: true,
      waterTier: 'shallow',
      canEnter: true,
      speedMultiplier: isSwimmer ? 1.0 : 0.65, // 35% speed reduction when wading
      effect: isSwimmer ? 'swimming' : 'wading',
    };
  }

  // Deep Water: Requires swim or fly capability / mount
  const hasDeepCapability =
    profile.capabilities.includes('swim') ||
    profile.capabilities.includes('fly') ||
    profile.ignoresCollisions;

  if (hasDeepCapability) {
    return {
      isWater: true,
      waterTier: 'deep',
      canEnter: true,
      speedMultiplier: 1.0,
      effect: profile.capabilities.includes('fly') ? undefined : 'swimming',
    };
  }

  return {
    isWater: true,
    waterTier: 'deep',
    canEnter: false,
    speedMultiplier: 0,
    reason: 'Deep water requires Swim capability or an Aquatic Mount.',
  };
}

export interface PlayerFishingContext {
  id: string;
  hasFishingRod: boolean;
  fishingLevel?: number;
}

/**
 * Evaluates whether a player at (playerX, playerY) can cast a line to fish.
 * Allowed if standing in shallow water OR adjacent (within 1 tile) to shallow/deep water.
 */
export function canFishAtLocation(
  playerPos: { x: number; y: number },
  world: MovementWorldContext,
  player: PlayerFishingContext
): { canFish: boolean; reason?: string; targetWaterPos?: { x: number; y: number } } {
  if (!player.hasFishingRod) {
    return { canFish: false, reason: 'You need a Fishing Rod in your inventory or equipped.' };
  }

  // Check current tile and adjacent 4-directional tiles for water
  const offsets = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  for (const offset of offsets) {
    const checkX = playerPos.x + offset.x;
    const checkY = playerPos.y + offset.y;

    if (checkX < 0 || checkX >= world.mapWidth || checkY < 0 || checkY >= world.mapHeight) {
      continue;
    }

    const tileId = world.mapGrid[checkY]?.[checkX];
    const logicTile = world.logicTiles[tileId];
    const tier = evaluateWaterTile(logicTile);

    if (tier !== 'none') {
      return {
        canFish: true,
        targetWaterPos: { x: checkX, y: checkY },
      };
    }
  }

  return { canFish: false, reason: 'No water bodies nearby to fish in.' };
}
