/**
 * Saints Gaming — Edge Strip Extraction Utility (Runtime Edge Bleed)
 * Extracts thin outer tile strips from adjacent neighbor maps to render seamless multi-map boundaries.
 */

import type { CardinalDirection } from './spatialAtlas';

export interface EdgeStripTile {
  /** Offset row relative to the border (0 = adjacent border edge, 1 = 1 tile further out, etc.) */
  offsetR: number;
  /** Offset col relative to the border */
  offsetC: number;
  /** Tile GID for visual layers or tag ID for logic layer */
  tileId: number;
  layerIdx: number;
}

export interface EdgeStripData {
  direction: CardinalDirection;
  sourceMapId: string;
  depth: number;
  tiles: EdgeStripTile[];
  tilesets?: any[];
}

export interface TileLayerLike {
  name?: string;
  grid?: number[][];
}

export interface MapDataLike {
  id?: string;
  grid?: number[][];
  tileLayers?: TileLayerLike[];
  tilesets?: any[];
  width?: number;
  height?: number;
}

/**
 * Extracts a thin strip of depth N tiles along an outer edge of a map.
 * 
 * - 'north': extracts the bottom `depth` rows of the northern map (which border our north edge).
 * - 'south': extracts the top `depth` rows of the southern map (which border our south edge).
 * - 'east': extracts the leftmost `depth` columns of the eastern map (which border our east edge).
 * - 'west': extracts the rightmost `depth` columns of the western map (which border our west edge).
 */
export function getEdgeStrip(
  mapData: MapDataLike,
  direction: CardinalDirection,
  depth: number = 6
): EdgeStripData {
  const height = mapData.grid?.length || mapData.height || 24;
  const width = mapData.grid?.[0]?.length || mapData.width || 24;
  const safeDepth = Math.max(1, Math.min(depth, Math.min(width, height)));
  const tiles: EdgeStripTile[] = [];

  const tileLayers = Array.isArray(mapData.tileLayers) && mapData.tileLayers.length > 0
    ? mapData.tileLayers
    : [{ grid: mapData.grid || [] }];

  tileLayers.forEach((layer, layerIdx) => {
    const grid = layer.grid;
    if (!grid || grid.length === 0) return;
    const lHeight = grid.length;
    const lWidth = grid[0]?.length || 0;

    switch (direction) {
      case 'north': {
        // Bottom rows of north neighbor
        const startRow = Math.max(0, lHeight - safeDepth);
        for (let r = startRow; r < lHeight; r++) {
          const offsetR = lHeight - 1 - r; // 0 = closest to seam, 1, 2...
          for (let c = 0; c < lWidth; c++) {
            const tileId = grid[r]?.[c] || 0;
            if (tileId > 0) {
              tiles.push({ offsetR, offsetC: c, tileId, layerIdx });
            }
          }
        }
        break;
      }

      case 'south': {
        // Top rows of south neighbor
        const endRow = Math.min(lHeight, safeDepth);
        for (let r = 0; r < endRow; r++) {
          const offsetR = r; // 0 = closest to seam, 1, 2...
          for (let c = 0; c < lWidth; c++) {
            const tileId = grid[r]?.[c] || 0;
            if (tileId > 0) {
              tiles.push({ offsetR, offsetC: c, tileId, layerIdx });
            }
          }
        }
        break;
      }

      case 'east': {
        // Leftmost columns of east neighbor
        const endCol = Math.min(lWidth, safeDepth);
        for (let r = 0; r < lHeight; r++) {
          for (let c = 0; c < endCol; c++) {
            const offsetC = c; // 0 = closest to seam, 1, 2...
            const tileId = grid[r]?.[c] || 0;
            if (tileId > 0) {
              tiles.push({ offsetR: r, offsetC, tileId, layerIdx });
            }
          }
        }
        break;
      }

      case 'west': {
        // Rightmost columns of west neighbor
        const startCol = Math.max(0, lWidth - safeDepth);
        for (let r = 0; r < lHeight; r++) {
          for (let c = startCol; c < lWidth; c++) {
            const offsetC = lWidth - 1 - c; // 0 = closest to seam, 1, 2...
            const tileId = grid[r]?.[c] || 0;
            if (tileId > 0) {
              tiles.push({ offsetR: r, offsetC, tileId, layerIdx });
            }
          }
        }
        break;
      }
    }
  });

  return {
    direction,
    sourceMapId: mapData.id || 'UNKNOWN',
    depth: safeDepth,
    tiles,
    tilesets: mapData.tilesets || [],
  };
}
