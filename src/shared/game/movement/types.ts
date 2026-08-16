/**
 * Saints Gaming — Pluggable Movement System Contracts (Bible 34 §7-8)
 */

import { LogicTile } from '../types/map';

export type MovementMode = 'grid' | 'free' | 'click_to_move' | 'tactical';
export type TraversalCapability = 'walk' | 'swim' | 'fly' | 'climb';

export interface MovementProfile {
  mode: MovementMode;
  baseSpeed: number; // tiles / units per second
  capabilities: TraversalCapability[];
  ignoresCollisions?: boolean;
}

export interface MoveIntent {
  dx: number;
  dy: number;
  dt?: number; // Delta time in seconds for continuous movement
}

export interface MovementWorldContext {
  mapWidth: number;
  mapHeight: number;
  mapGrid: number[][];
  logicTiles: Record<number, LogicTile>;
  occupiedPositions?: Array<{ x: number; y: number }>;
}

export type MoveResult =
  | { success: true; targetX: number; targetY: number; stepDurationMs: number; action?: string; payload?: unknown }
  | { success: false; reason: 'BOUNDS' | 'COLLISION' | 'NO_CAPABILITY' | 'OCCUPIED' | 'INVALID_INTENT' };

export interface IMovementController {
  mode: MovementMode;
  canTraverseTile(tile: LogicTile | undefined, profile: MovementProfile): boolean;
  evaluateMove(from: { x: number; y: number }, intent: MoveIntent, profile: MovementProfile, world: MovementWorldContext): MoveResult;
}
