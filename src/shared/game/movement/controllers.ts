/**
 * Saints Gaming — Pluggable Movement Controllers (Bible 34 §7-8)
 */

import {
  IMovementController,
  MovementProfile,
  MoveIntent,
  MovementWorldContext,
  MoveResult,
  TraversalCapability,
} from './types';
import { LogicTile } from '../types/map';

/**
 * GridMovementController — discrete tile-by-tile step movement.
 */
export class GridMovementController implements IMovementController {
  public mode = 'grid' as const;

  public canTraverseTile(tile: LogicTile | undefined, profile: MovementProfile): boolean {
    if (profile.ignoresCollisions) return true;
    if (!tile) return true; // Default empty tile is walkable

    // 1. Check explicit passable capabilities on tile (Bible 34 §5)
    if (tile.passableBy && tile.passableBy.length > 0) {
      return tile.passableBy.some((cap) => profile.capabilities.includes(cap as TraversalCapability));
    }

    // 2. Flying entities can bypass walls
    if (profile.capabilities.includes('fly')) {
      return true;
    }

    // 3. Fallback to standard isSolid collision
    return !tile.isSolid;
  }

  public evaluateMove(
    from: { x: number; y: number },
    intent: MoveIntent,
    profile: MovementProfile,
    world: MovementWorldContext
  ): MoveResult {
    const targetX = from.x + (intent.dx > 0 ? 1 : intent.dx < 0 ? -1 : 0);
    const targetY = from.y + (intent.dy > 0 ? 1 : intent.dy < 0 ? -1 : 0);

    // Bounds Check
    if (targetX < 0 || targetX >= world.mapWidth || targetY < 0 || targetY >= world.mapHeight) {
      return { success: false, reason: 'BOUNDS' };
    }

    // Occupancy Check
    if (world.occupiedPositions?.some((p) => p.x === targetX && p.y === targetY)) {
      return { success: false, reason: 'OCCUPIED' };
    }

    // Tile Logic & Collision Check
    const tileId = world.mapGrid[targetY]?.[targetX];
    const logicTile = world.logicTiles[tileId];

    if (!this.canTraverseTile(logicTile, profile)) {
      return { success: false, reason: 'NO_CAPABILITY' };
    }

    // Compute Step Duration based on baseSpeed and tile.movementCost (Bible 34 §5)
    const baseDurationMs = (1 / Math.max(0.1, profile.baseSpeed)) * 1000;
    const costMultiplier = logicTile?.movementCost ?? 1.0;
    const stepDurationMs = Math.round(baseDurationMs * costMultiplier);

    let action: string | undefined = undefined;
    let payload: unknown = undefined;

    if (logicTile?.onStepAction) {
      action = logicTile.onStepAction;
      try {
        payload = logicTile.onStepPayload ? JSON.parse(logicTile.onStepPayload) : {};
      } catch {
        payload = {};
      }
    }

    return {
      success: true,
      targetX,
      targetY,
      stepDurationMs,
      action,
      payload,
    };
  }
}

/**
 * FreeMovementController — continuous vector movement for fly-through and free navigation.
 */
export class FreeMovementController implements IMovementController {
  public mode = 'free' as const;

  public canTraverseTile(tile: LogicTile | undefined, profile: MovementProfile): boolean {
    if (profile.ignoresCollisions) return true;
    if (!tile) return true;
    if (profile.capabilities.includes('fly')) return true;
    return !tile.isSolid;
  }

  public evaluateMove(
    from: { x: number; y: number },
    intent: MoveIntent,
    profile: MovementProfile,
    world: MovementWorldContext
  ): MoveResult {
    const dt = intent.dt ?? 0.016;
    const speed = profile.baseSpeed * (profile.capabilities.includes('fly') ? 1.5 : 1.0);

    const length = Math.sqrt(intent.dx * intent.dx + intent.dy * intent.dy);
    if (length === 0) {
      return { success: true, targetX: from.x, targetY: from.y, stepDurationMs: 0 };
    }

    const normX = intent.dx / length;
    const normY = intent.dy / length;

    const nextX = from.x + normX * speed * dt;
    const nextY = from.y + normY * speed * dt;

    // Bounds Check
    if (nextX < 0 || nextX >= world.mapWidth || nextY < 0 || nextY >= world.mapHeight) {
      return { success: false, reason: 'BOUNDS' };
    }

    const tileX = Math.floor(nextX);
    const tileY = Math.floor(nextY);
    const tileId = world.mapGrid[tileY]?.[tileX];
    const logicTile = world.logicTiles[tileId];

    if (!this.canTraverseTile(logicTile, profile)) {
      return { success: false, reason: 'COLLISION' };
    }

    return {
      success: true,
      targetX: nextX,
      targetY: nextY,
      stepDurationMs: Math.round(dt * 1000),
    };
  }
}

export const defaultGridMovement = new GridMovementController();
export const defaultFreeMovement = new FreeMovementController();
