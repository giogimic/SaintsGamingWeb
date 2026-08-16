/**
 * Saints Gaming — Elevation & Cliff Jump Mechanics Engine (Bible 34 §5 & Bible 08)
 * Implements one-way cliff ledges, height stepping, and climb/fly capability checks.
 */

import { LogicTile } from '../types/map';
import { MovementProfile } from './types';

export type LedgeDirection = 'north' | 'east' | 'south' | 'west' | 'all';

export interface ElevationEvaluationResult {
  canTraverse: boolean;
  isLedgeJump: boolean;
  deltaElevation: number;
  reason?: string;
  effect?: 'hop' | 'climb' | 'glide';
}

/**
 * Evaluates movement across elevation changes between a source tile and destination tile.
 */
export function checkElevationTraversal(
  sourceTile: LogicTile | undefined,
  targetTile: LogicTile | undefined,
  moveDirection: { dx: number; dy: number },
  profile: MovementProfile
): ElevationEvaluationResult {
  const sourceElevation = sourceTile?.elevation ?? 0;
  const targetElevation = targetTile?.elevation ?? 0;
  const delta = targetElevation - sourceElevation;

  // Flying entities can freely traverse all elevation deltas
  if (profile.capabilities.includes('fly') || profile.ignoresCollisions) {
    return {
      canTraverse: true,
      isLedgeJump: false,
      deltaElevation: delta,
      effect: 'glide',
    };
  }

  // Flat ground traversal
  if (delta === 0) {
    return {
      canTraverse: true,
      isLedgeJump: false,
      deltaElevation: 0,
    };
  }

  // Stepping UP (delta > 0)
  if (delta > 0) {
    if (profile.capabilities.includes('climb')) {
      return {
        canTraverse: true,
        isLedgeJump: false,
        deltaElevation: delta,
        effect: 'climb',
      };
    }
    return {
      canTraverse: false,
      isLedgeJump: false,
      deltaElevation: delta,
      reason: `Elevation difference (+${delta}) is too steep. Requires Climb capability.`,
    };
  }

  // Stepping DOWN (delta < 0)
  // Single-tier ledge hop (delta === -1)
  if (delta === -1) {
    return {
      canTraverse: true,
      isLedgeJump: true,
      deltaElevation: delta,
      effect: 'hop',
    };
  }

  // Steep drop (delta <= -2)
  return {
    canTraverse: false,
    isLedgeJump: false,
    deltaElevation: delta,
    reason: `Fall distance (${delta}) is too dangerous without flight or a glider.`,
  };
}
