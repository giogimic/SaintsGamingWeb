/**
 * Saints Gaming — Cross-Map Border Seamless Warp Resolution (Bible 23 & Bible 24)
 * Evaluates boundary step intents and resolves runtime transitions into adjacent Atlas zones.
 */

import {
  AtlasGridData,
  AtlasNode,
  CardinalDirection,
  calculateBorderWarp,
} from './spatialAtlas';

export interface BorderStepEvaluation {
  shouldWarp: boolean;
  targetMapId?: string;
  targetNodeId?: string;
  spawnX?: number;
  spawnY?: number;
  direction?: CardinalDirection;
  reason?: string;
}

/**
 * Evaluates whether moving from `currentPos` with intent `(dx, dy)` steps across the map border into an adjacent Atlas zone.
 */
export function evaluateBorderStep(
  currentSource: string | AtlasNode,
  currentPos: { x: number; y: number },
  intent: { dx: number; dy: number },
  mapDimensions: { width: number; height: number },
  atlas: AtlasGridData
): BorderStepEvaluation {
  const seraphtX = currentPos.x + (intent.dx > 0 ? 1 : intent.dx < 0 ? -1 : 0);
  const seraphtY = currentPos.y + (intent.dy > 0 ? 1 : intent.dy < 0 ? -1 : 0);

  let direction: CardinalDirection | null = null;

  if (seraphtX >= mapDimensions.width) direction = 'east';
  else if (seraphtX < 0) direction = 'west';
  else if (seraphtY >= mapDimensions.height) direction = 'south';
  else if (seraphtY < 0) direction = 'north';

  if (!direction) {
    return { shouldWarp: false }; // Within map bounds
  }

  const borderWarp = calculateBorderWarp(
    currentSource,
    mapDimensions,
    currentPos,
    direction,
    atlas
  );

  if (!borderWarp) {
    return {
      shouldWarp: false,
      reason: `Edge of map reached (${direction}), but no adjacent world zone is connected.`,
    };
  }

  return {
    shouldWarp: true,
    targetMapId: borderWarp.targetMapId,
    targetNodeId: borderWarp.targetNodeId,
    spawnX: borderWarp.spawnX,
    spawnY: borderWarp.spawnY,
    direction: borderWarp.direction,
  };
}
