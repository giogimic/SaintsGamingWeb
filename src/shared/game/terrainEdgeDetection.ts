/**
 * Saints Gaming — Terrain Edge Detection & Auto-Tiling Engine
 *
 * Provides neighbor analysis, edge classification (4-way & 8-way),
 * 9-slice / Wang tile mapping, and seamless smart border transitions
 * for 2D, 2.5D, and 3D terrain editing.
 */

export type EdgeClassification =
  | 'CENTER'          // Fully surrounded by same material (interior)
  | 'EDGE_N'           // Exposed to North (top)
  | 'EDGE_S'           // Exposed to South (bottom)
  | 'EDGE_W'           // Exposed to West (left)
  | 'EDGE_E'           // Exposed to East (right)
  | 'OUTER_CORNER_NW'  // Convex top-left corner
  | 'OUTER_CORNER_NE'  // Convex top-right corner
  | 'OUTER_CORNER_SW'  // Convex bottom-left corner
  | 'OUTER_CORNER_SE'  // Convex bottom-right corner
  | 'INNER_CORNER_NW'  // Concave inner corner top-left
  | 'INNER_CORNER_NE'  // Concave inner corner top-right
  | 'INNER_CORNER_SW'  // Concave inner corner bottom-left
  | 'INNER_CORNER_SE'  // Concave inner corner bottom-right
  | 'SINGLE_ISLAND'    // Isolated 1x1 tile
  | 'STRIP_VERTICAL'   // 1-tile wide column (N & S connected, E & W exposed)
  | 'STRIP_HORIZONTAL' // 1-tile high row (E & W connected, N & S exposed)
  | 'END_N'            // Column cap North
  | 'END_S'            // Column cap South
  | 'END_W'            // Row cap West
  | 'END_E';           // Row cap East

export interface NeighborContext {
  n: boolean;   // North (r-1, c) matches target
  s: boolean;   // South (r+1, c) matches target
  w: boolean;   // West (r, c-1) matches target
  e: boolean;   // East (r, c+1) matches target
  nw: boolean;  // North-West (r-1, c-1) matches target
  ne: boolean;  // North-East (r-1, c+1) matches target
  sw: boolean;  // South-West (r+1, c-1) matches target
  se: boolean;  // South-East (r+1, c+1) matches target
}

/**
 * 9-Slice Grid Offset from Center (1, 1):
 * [ (-1, -1)   (0, -1)   (1, -1) ]  -> [ NW, N, NE ]
 * [ (-1,  0)   (0,  0)   (1,  0) ]  -> [  W, C,  E ]
 * [ (-1,  1)   (0,  1)   (1,  1) ]  -> [ SW, S, SE ]
 */
export interface RelativeTileOffset {
  dCol: number;
  dRow: number;
}

export const NINE_SLICE_OFFSETS: Record<EdgeClassification, RelativeTileOffset> = {
  CENTER: { dCol: 0, dRow: 0 },
  EDGE_N: { dCol: 0, dRow: -1 },
  EDGE_S: { dCol: 0, dRow: 1 },
  EDGE_W: { dCol: -1, dRow: 0 },
  EDGE_E: { dCol: 1, dRow: 0 },
  OUTER_CORNER_NW: { dCol: -1, dRow: -1 },
  OUTER_CORNER_NE: { dCol: 1, dRow: -1 },
  OUTER_CORNER_SW: { dCol: -1, dRow: 1 },
  OUTER_CORNER_SE: { dCol: 1, dRow: 1 },
  // Inner corners typically reuse edges or have distinct offset if available
  INNER_CORNER_NW: { dCol: 1, dRow: 1 },
  INNER_CORNER_NE: { dCol: -1, dRow: 1 },
  INNER_CORNER_SW: { dCol: 1, dRow: -1 },
  INNER_CORNER_SE: { dCol: -1, dRow: -1 },
  SINGLE_ISLAND: { dCol: 0, dRow: 0 },
  STRIP_VERTICAL: { dCol: 0, dRow: 0 },
  STRIP_HORIZONTAL: { dCol: 0, dRow: 0 },
  END_N: { dCol: 0, dRow: -1 },
  END_S: { dCol: 0, dRow: 1 },
  END_W: { dCol: -1, dRow: 0 },
  END_E: { dCol: 1, dRow: 0 },
};

/**
 * Inspect a cell and its 8 neighbors in a 2D tile grid.
 */
export function getNeighborContext(
  grid: number[][],
  r: number,
  c: number,
  targetValue?: number | ((val: number) => boolean)
): NeighborContext {
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const thisVal = grid[r]?.[c] ?? 0;

  const isMatch = (nr: number, nc: number): boolean => {
    if (nr < 0 || nr >= height || nc < 0 || nc >= width) return false;
    const val = grid[nr]?.[nc] ?? 0;
    if (typeof targetValue === 'function') {
      return targetValue(val);
    }
    if (typeof targetValue === 'number') {
      return val === targetValue;
    }
    return val === thisVal && thisVal !== 0;
  };

  return {
    n: isMatch(r - 1, c),
    s: isMatch(r + 1, c),
    w: isMatch(r, c - 1),
    e: isMatch(r, c + 1),
    nw: isMatch(r - 1, c - 1),
    ne: isMatch(r - 1, c + 1),
    sw: isMatch(r + 1, c - 1),
    se: isMatch(r + 1, c + 1),
  };
}

/**
 * Classify a tile's boundary state based on its 8 neighbors.
 */
export function classifyTileEdge(ctx: NeighborContext): EdgeClassification {
  const { n, s, w, e, nw, ne, sw, se } = ctx;

  // Count cardinal connections
  const cardinalCount = (n ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0) + (e ? 1 : 0);

  // 1. Isolated 1x1 Island
  if (cardinalCount === 0) {
    return 'SINGLE_ISLAND';
  }

  // 2. Dead Ends (1 neighbor)
  if (cardinalCount === 1) {
    if (n) return 'END_S';
    if (s) return 'END_N';
    if (w) return 'END_E';
    if (e) return 'END_W';
  }

  // 3. Strips / Pipes (2 opposite neighbors)
  if (cardinalCount === 2) {
    if (n && s) return 'STRIP_VERTICAL';
    if (w && e) return 'STRIP_HORIZONTAL';

    // Outer Corners (2 adjacent neighbors)
    if (s && e) return 'OUTER_CORNER_NW';
    if (s && w) return 'OUTER_CORNER_NE';
    if (n && e) return 'OUTER_CORNER_SW';
    if (n && w) return 'OUTER_CORNER_SE';
  }

  // 4. Edges with 3 cardinal neighbors
  if (cardinalCount === 3) {
    if (!n) return 'EDGE_N';
    if (!s) return 'EDGE_S';
    if (!w) return 'EDGE_W';
    if (!e) return 'EDGE_E';
  }

  // 5. 4 cardinal neighbors -> Check diagonals for Inner Corners
  if (cardinalCount === 4) {
    if (!nw && ne && sw && se) return 'INNER_CORNER_NW';
    if (!ne && nw && sw && se) return 'INNER_CORNER_NE';
    if (!sw && nw && ne && se) return 'INNER_CORNER_SW';
    if (!se && nw && ne && sw) return 'INNER_CORNER_SE';
    return 'CENTER';
  }

  return 'CENTER';
}

export interface TerrainTransitionRule {
  id: string;
  name: string;
  centerGid: number;
  columns: number;
  customOffsets?: Partial<Record<EdgeClassification, number>>;
}

/**
 * Resolve the target Tile GID for a 9-Slice Auto-Tile Set
 * given the center GID and the detected EdgeClassification.
 *
 * @param centerGid The GID of the center tile (row 1, col 1 in the 3x3 block)
 * @param edge The detected edge classification
 * @param tilesetColumns Total columns in the source tilesheet
 * @param fallbackGid Optional fallback if out of bounds
 * @param customRule Optional custom transition rule mapping
 */
export function resolveAutoTileGid(
  centerGid: number,
  edge: EdgeClassification,
  tilesetColumns: number = 8,
  fallbackGid?: number,
  customRule?: TerrainTransitionRule
): number {
  if (centerGid <= 0) return 0;
  if (customRule?.customOffsets && customRule.customOffsets[edge] !== undefined) {
    return customRule.customOffsets[edge]!;
  }
  const offset = NINE_SLICE_OFFSETS[edge] || { dCol: 0, dRow: 0 };
  const targetGid = centerGid + offset.dCol + offset.dRow * tilesetColumns;
  if (targetGid <= 0) return fallbackGid || centerGid;
  return targetGid;
}

/**
 * Smart Border Auto-Tiling Pass:
 * Takes a grid and a list of modified coordinates (r, c), and recalculates
 * edge transitions for all modified tiles plus their 8-neighbors.
 */
export function applyAutoTilingPass(
  grid: number[][],
  modifiedCells: Array<{ r: number; c: number }>,
  centerGid: number,
  tilesetColumns: number = 8,
  matchPredicate?: (gid: number) => boolean,
  customRule?: TerrainTransitionRule
): Array<{ r: number; c: number; before: number; after: number }> {
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const visited = new Set<string>();
  const cellsToEvaluate: Array<{ r: number; c: number }> = [];

  // Collect modified cells + 8 surrounding neighbors
  for (const { r, c } of modifiedCells) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
          const key = `${nr},${nc}`;
          if (!visited.has(key)) {
            visited.add(key);
            cellsToEvaluate.push({ r: nr, c: nc });
          }
        }
      }
    }
  }

  const changes: Array<{ r: number; c: number; before: number; after: number }> = [];
  const isTargetMat = matchPredicate || ((g: number) => g > 0);

  for (const { r, c } of cellsToEvaluate) {
    const currentGid = grid[r][c];
    if (!isTargetMat(currentGid)) continue;

    const ctx = getNeighborContext(grid, r, c, isTargetMat);
    const classification = classifyTileEdge(ctx);
    const newGid = resolveAutoTileGid(centerGid, classification, tilesetColumns, currentGid, customRule);

    if (newGid !== currentGid) {
      changes.push({
        r,
        c,
        before: currentGid,
        after: newGid,
      });
      grid[r][c] = newGid;
    }
  }

  return changes;
}
