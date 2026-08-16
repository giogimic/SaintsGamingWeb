/**
 * Saints Gaming — World Atlas Spatial Adjacency Engine (Bible 23 & Bible 24)
 * Manages multi-map coordinate placement, directional neighbor queries, and seamless border warp offsets.
 */

export interface AtlasNode {
  mapId: string;
  gridX: number; // Atlas grid X coordinate
  gridY: number; // Atlas grid Y coordinate
  width?: number; // In-game tile width
  height?: number; // In-game tile height
}

export interface AtlasGridData {
  nodes: AtlasNode[];
}

export type CardinalDirection = 'north' | 'east' | 'south' | 'west';

export interface NeighborNodes {
  north?: AtlasNode;
  east?: AtlasNode;
  south?: AtlasNode;
  west?: AtlasNode;
}

/**
 * Finds all 4-directional adjacent neighbors for a given map in the Atlas grid.
 */
export function getAdjacentAtlasNeighbors(atlas: AtlasGridData, mapId: string): NeighborNodes {
  const current = atlas.nodes.find((n) => n.mapId === mapId);
  if (!current) return {};

  const neighbors: NeighborNodes = {};

  for (const node of atlas.nodes) {
    if (node.mapId === mapId) continue;

    // North (gridY - 1)
    if (node.gridX === current.gridX && node.gridY === current.gridY - 1) {
      neighbors.north = node;
    }
    // South (gridY + 1)
    if (node.gridX === current.gridX && node.gridY === current.gridY + 1) {
      neighbors.south = node;
    }
    // East (gridX + 1)
    if (node.gridX === current.gridX + 1 && node.gridY === current.gridY) {
      neighbors.east = node;
    }
    // West (gridX - 1)
    if (node.gridX === current.gridX - 1 && node.gridY === current.gridY) {
      neighbors.west = node;
    }
  }

  return neighbors;
}

export interface BorderWarpTarget {
  targetMapId: string;
  spawnX: number;
  spawnY: number;
  direction: CardinalDirection;
}

/**
 * Calculates the exact landing spawn coordinate when crossing a map border into an adjacent neighbor map.
 */
export function calculateBorderWarp(
  sourceMapId: string,
  sourceDimensions: { width: number; height: number },
  exitPosition: { x: number; y: number },
  direction: CardinalDirection,
  atlas: AtlasGridData,
  neighborDimensions?: { width: number; height: number }
): BorderWarpTarget | null {
  const neighbors = getAdjacentAtlasNeighbors(atlas, sourceMapId);
  const targetNode = neighbors[direction];

  if (!targetNode) return null; // No adjacent map connected in this direction

  const nWidth = neighborDimensions?.width ?? targetNode.width ?? sourceDimensions.width;
  const nHeight = neighborDimensions?.height ?? targetNode.height ?? sourceDimensions.height;

  let spawnX = exitPosition.x;
  let spawnY = exitPosition.y;

  switch (direction) {
    case 'east':
      spawnX = 0;
      spawnY = Math.min(nHeight - 1, Math.max(0, exitPosition.y));
      break;

    case 'west':
      spawnX = nWidth - 1;
      spawnY = Math.min(nHeight - 1, Math.max(0, exitPosition.y));
      break;

    case 'south':
      spawnX = Math.min(nWidth - 1, Math.max(0, exitPosition.x));
      spawnY = 0;
      break;

    case 'north':
      spawnX = Math.min(nWidth - 1, Math.max(0, exitPosition.x));
      spawnY = nHeight - 1;
      break;
  }

  return {
    targetMapId: targetNode.mapId,
    spawnX,
    spawnY,
    direction,
  };
}
