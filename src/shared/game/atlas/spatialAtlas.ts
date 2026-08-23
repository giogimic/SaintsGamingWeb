/**
 * Saints Gaming — World Atlas Spatial Adjacency Engine (Bible 23 & Bible 24)
 * Manages multi-map coordinate placement, directional neighbor queries, and seamless border warp offsets.
 */

export interface AtlasNode {
  id: string;
  mapId: string;
  x: number;
  y: number;
  gridX?: number; // Atlas grid X coordinate (legacy alias)
  gridY?: number; // Atlas grid Y coordinate (legacy alias)
  width?: number; // In-game tile width
  height?: number; // In-game tile height
  label?: string;
}

export interface AtlasGridData {
  nodes: AtlasNode[];
  edges?: any[];
  bufferPresets?: any[];
  options?: any;
}

export type CardinalDirection = 'north' | 'east' | 'south' | 'west';

export interface NeighborNodes {
  north?: AtlasNode;
  east?: AtlasNode;
  south?: AtlasNode;
  west?: AtlasNode;
}

/**
 * Generate a unique stable identifier for a newly placed Atlas node.
 * This ID is generated once and persisted across moves/saves.
 */
export function createAtlasNodeId(mapId: string): string {
  const rand = Math.random().toString(36).substring(2, 9);
  const cleanMap = (mapId || 'node').toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `atlas_node_${cleanMap}_${rand}`;
}

/**
 * Normalizes an Atlas node to ensure it has a stable persistent `id` and standard `x, y` coordinates.
 */
export function normalizeAtlasNode(node: Partial<AtlasNode> & { mapId: string }): AtlasNode {
  const x = node.x ?? node.gridX ?? 0;
  const y = node.y ?? node.gridY ?? 0;
  return {
    id: node.id && String(node.id).trim() ? String(node.id) : createAtlasNodeId(node.mapId),
    mapId: node.mapId,
    x,
    y,
    gridX: x,
    gridY: y,
    ...(node.width !== undefined ? { width: node.width } : {}),
    ...(node.height !== undefined ? { height: node.height } : {}),
    ...(node.label ? { label: node.label } : {}),
  };
}

/**
 * Normalizes an entire Atlas grid dataset, assigning stable IDs to any legacy nodes lacking one.
 */
export function normalizeAtlasGridData(atlas: any): AtlasGridData {
  if (!atlas || typeof atlas !== 'object') {
    return { nodes: [] };
  }
  const nodes = Array.isArray(atlas.nodes) ? atlas.nodes.map(normalizeAtlasNode) : [];
  return {
    ...atlas,
    nodes,
  };
}

/**
 * Finds all 4-directional adjacent neighbors for a given node (or mapId) in the Atlas grid.
 * When an AtlasNode or node ID is provided, adjacency is mathematically determined by node coordinates,
 * perfectly isolating duplicate placements of the same map definition.
 */
export function getAdjacentAtlasNeighbors(
  atlas: AtlasGridData,
  target: string | AtlasNode
): NeighborNodes {
  if (!atlas || !Array.isArray(atlas.nodes) || atlas.nodes.length === 0) return {};

  let curX = 0;
  let curY = 0;
  let targetNodeId: string | null = null;

  if (typeof target === 'object' && target !== null) {
    curX = target.x ?? target.gridX ?? 0;
    curY = target.y ?? target.gridY ?? 0;
    targetNodeId = target.id || null;
  } else {
    // Look up by node id first, then fallback to mapId
    const foundById = atlas.nodes.find((n) => n.id === target);
    if (foundById) {
      curX = foundById.x ?? foundById.gridX ?? 0;
      curY = foundById.y ?? foundById.gridY ?? 0;
      targetNodeId = foundById.id;
    } else {
      const matches = atlas.nodes.filter((n) => n.mapId === target);
      if (matches.length === 0) return {};
      if (matches.length > 1) {
        console.warn(`[SpatialAtlas] Ambiguous neighbor resolution: mapId '${target}' has ${matches.length} placements; pass AtlasNode or node ID for exact placement adjacency.`);
      }
      const foundByMapId = matches[0];
      curX = foundByMapId.x ?? foundByMapId.gridX ?? 0;
      curY = foundByMapId.y ?? foundByMapId.gridY ?? 0;
      targetNodeId = foundByMapId.id;
    }
  }

  const neighbors: NeighborNodes = {};

  for (const node of atlas.nodes) {
    if (targetNodeId && node.id === targetNodeId) continue;
    const nx = node.x ?? node.gridX ?? 0;
    const ny = node.y ?? node.gridY ?? 0;

    // North (y - 1)
    if (nx === curX && ny === curY - 1) {
      neighbors.north = node;
    }
    // South (y + 1)
    if (nx === curX && ny === curY + 1) {
      neighbors.south = node;
    }
    // East (x + 1)
    if (nx === curX + 1 && ny === curY) {
      neighbors.east = node;
    }
    // West (x - 1)
    if (nx === curX - 1 && ny === curY) {
      neighbors.west = node;
    }
  }

  return neighbors;
}

export interface BorderWarpTarget {
  targetMapId: string;
  targetNodeId?: string;
  spawnX: number;
  spawnY: number;
  direction: CardinalDirection;
}

/**
 * Calculates the exact landing spawn coordinate when crossing a map border into an adjacent neighbor map.
 */
export function calculateBorderWarp(
  source: string | AtlasNode,
  sourceDimensions: { width: number; height: number },
  exitPosition: { x: number; y: number },
  direction: CardinalDirection,
  atlas: AtlasGridData,
  neighborDimensions?: { width: number; height: number }
): BorderWarpTarget | null {
  const neighbors = getAdjacentAtlasNeighbors(atlas, source);
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
    targetNodeId: targetNode.id,
    spawnX,
    spawnY,
    direction,
  };
}
