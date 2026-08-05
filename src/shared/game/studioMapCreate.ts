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

export const STUDIO_MAP_MIN = 8;
export const STUDIO_MAP_MAX = 128;

export type NewStudioMapInput = {
  slug: string;
  name?: string;
  gameId?: string;
  width?: number;
  height?: number;
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
  const grid = buildBorderedLogicGrid(w, h);
  const ground = buildDefaultGroundLayer(grid);

  return {
    ok: true,
    map: {
      id,
      name: (input.name || "").trim() || id,
      gameId: input.gameId || "tuxemon",
      grid,
      gates: {},
      npcs: [],
      encounterPool: [],
      tileLayers: [ground],
      tilesets: [...DEFAULT_STUDIO_TILESETS],
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
 * Fixes missing tilesets, blank Ground, and logic→visual copies.
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
      tilesets:
        Array.isArray(next.tilesets) && next.tilesets.length > 0
          ? next.tilesets
          : [...DEFAULT_STUDIO_TILESETS],
    };
  }
  return next;
}

export { DEFAULT_STUDIO_GROUND_GID };
