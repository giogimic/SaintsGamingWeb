/**
 * Pure Studio "Create New Map" payload builder.
 * Keeps logic grid (collision) separate from visual Ground (GID 17 grass).
 */

import {
  DEFAULT_STUDIO_GROUND_GID,
  DEFAULT_STUDIO_TILESETS,
  buildDefaultGroundLayer,
  ensureMapHasStudioTilesets,
  type StudioTilesetMeta,
} from "./studioTilesetBootstrap";
import { generateDefaultWorldDoc, type VoxelWorldDocV3 } from "./voxel/VoxelWorldDoc";

export const STUDIO_MAP_MIN = 8;
export const STUDIO_MAP_MAX = 256;

export type NewStudioMapInput = {
  slug: string;
  name?: string;
  gameId?: string;
  width?: number;
  height?: number;
  mapType?: 'TILE' | 'VOXEL' | 'FRACTAL' | string;
};

export type NewStudioMapData = {
  id: string;
  name: string;
  gameId: string;
  grid: number[][];
  gates: Record<string, never>;
  npcs: [];
  encounterPool: [];
  tileLayers: Array<{ name: string; grid: number[][] }>;
  tilesets: StudioTilesetMeta[];
  voxelDoc?: VoxelWorldDocV3;
  blockSizePx?: number;
  mapType?: 'TILE' | 'VOXEL' | 'FRACTAL' | string;
};

/** Normalize MAP_ID slug: trim, spaces→_, uppercase. */
export function normalizeMapSlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export function clampMapDimension(n: number, fallback = 24): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(STUDIO_MAP_MIN, Math.min(STUDIO_MAP_MAX, Math.floor(v)));
}

/**
 * Logic grid: solid border (id 1), walkable interior (id 0).
 * Visual Ground is filled separately with DEFAULT_STUDIO_GROUND_GID — never copy
 * this grid into tileLayers (GID 1 is a stair fragment, GID 0 is black void).
 */
export function buildBorderedLogicGrid(width: number, height: number): number[][] {
  const w = clampMapDimension(width);
  const h = clampMapDimension(height);
  return Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) =>
      r === 0 || r === h - 1 || c === 0 || c === w - 1 ? 1 : 0
    )
  );
}

export function buildNewStudioMap(input: NewStudioMapInput):
  | { ok: true; map: NewStudioMapData }
  | { ok: false; error: string } {
  const id = normalizeMapSlug(input.slug);
  if (!id) {
    return { ok: false, error: "Enter a Map ID slug (letters, numbers, underscore)." };
  }
  if (id.length < 2) {
    return { ok: false, error: "Map ID is too short." };
  }

  const w = clampMapDimension(input.width ?? 24);
  const h = clampMapDimension(input.height ?? 24);
  const isVoxel = input.mapType === 'VOXEL' || input.mapType === 'FRACTAL';
  const grid = isVoxel ? [] : buildBorderedLogicGrid(w, h);
  const ground = isVoxel ? { name: 'Ground', grid: [] } : buildDefaultGroundLayer(grid);

  const voxelDoc = generateDefaultWorldDoc(
    Math.max(1, Math.ceil(w / 32)),
    Math.max(1, Math.ceil(h / 32)),
    64,
    w,
    h
  );
  voxelDoc.id = id;
  voxelDoc.name = (input.name || "").trim() || id;

  return {
    ok: true,
    map: {
      id,
      name: (input.name || "").trim() || id,
      gameId: input.gameId || "saints",
      grid,
      gates: {},
      npcs: [],
      encounterPool: [],
      tileLayers: [ground],
      tilesets: [...DEFAULT_STUDIO_TILESETS],
      voxelDoc,
      blockSizePx: 64,
      mapType: input.mapType || "TILE",
    },
  };
}

/** Human-readable create/save API failure for Studio toasts. */
export function formatMapWriteError(
  status: number,
  body: { error?: string; details?: string[] } | null | undefined
): string {
  if (status === 401) {
    return "Not signed in — log in again, then retry Save Map.";
  }
  if (status === 403) {
    return "Forbidden — Admin+ (level 400) required to create or save maps.";
  }
  const err = body?.error?.trim();
  if (err) {
    const extra =
      Array.isArray(body?.details) && body!.details!.length > 1
        ? ` (+${body!.details!.length - 1} more)`
        : "";
    return `${err}${extra}`;
  }
  if (status === 400) return "Save rejected — check logic tile ids and map size.";
  if (status >= 500) return `Server error (${status}) while saving map.`;
  return `Save failed (${status}).`;
}

/**
 * True when visual Ground is an exact copy of the logic grid — the old
 * Create New Map bug (walls as GID 1 stair fragments, interior as GID 0 void).
 */
export function isLogicGridCopiedToVisual(
  logicGrid: number[][] | null | undefined,
  tileLayers: Array<{ grid?: number[][] }> | null | undefined
): boolean {
  const visual = tileLayers?.[0]?.grid;
  if (!Array.isArray(logicGrid) || !Array.isArray(visual)) return false;
  if (logicGrid.length === 0 || logicGrid.length !== visual.length) return false;
  for (let r = 0; r < logicGrid.length; r++) {
    const a = logicGrid[r];
    const b = visual[r];
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let c = 0; c < a.length; c++) {
      if (a[c] !== b[c]) return false;
    }
  }
  return true;
}

/**
 * Normalize create/save visual layers before persist.
 * Preserves user-painted layers and tilesets while bootstrapping missing structures.
 */
export function normalizeStudioMapVisuals<
  T extends {
    grid?: number[][];
    tileLayers?: Array<{ name: string; grid: number[][] }>;
    tilesets?: StudioTilesetMeta[];
  },
>(map: T): T {
  let next = ensureMapHasStudioTilesets(map);
  if (isLogicGridCopiedToVisual(next.grid, next.tileLayers)) {
    next = {
      ...next,
      tileLayers: [buildDefaultGroundLayer(next.grid)],
      tilesets: Array.isArray(next.tilesets) && next.tilesets.length > 0 ? next.tilesets : [...DEFAULT_STUDIO_TILESETS],
    };
  }
  return next;
}

/**
 * Resizes a map's logic grid and all visual tileLayers.
 * If expanding, the logic grid is padded with 0 (passable) and 
 * the base visual layer (index 0) is padded with DEFAULT_STUDIO_GROUND_GID.
 */
export function resizeStudioMap(
  map: NewStudioMapData | any,
  newW: number,
  newH: number
): any {
  const w = clampMapDimension(newW);
  const h = clampMapDimension(newH);

  // Resize logic grid
  const newGrid = Array.from({ length: h }, (_, r) => {
    return Array.from({ length: w }, (_, c) => {
      if (map.grid && r < map.grid.length && c < map.grid[r].length) {
        return map.grid[r][c];
      }
      return 0; // Pad with passable logic
    });
  });

  // Resize visual layers
  const newTileLayers = (map.tileLayers || []).map((layer: any, idx: number) => {
    const padGid = idx === 0 ? DEFAULT_STUDIO_GROUND_GID : 0;
    return {
      ...layer,
      grid: Array.from({ length: h }, (_, r) => {
        return Array.from({ length: w }, (_, c) => {
          if (layer.grid && r < layer.grid.length && c < layer.grid[r].length) {
            return layer.grid[r][c];
          }
          return padGid;
        });
      })
    };
  });

  return {
    ...map,
    grid: newGrid,
    tileLayers: newTileLayers,
  };
}

export { DEFAULT_STUDIO_GROUND_GID };
