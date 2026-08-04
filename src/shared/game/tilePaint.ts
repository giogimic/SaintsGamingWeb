/**
 * Studio paint resolution (bible 29 §layers / 30 §editor standard).
 *
 * Kept pure and free of Babylon/React imports so the pointer callback in
 * `GameCanvasBabylon` has one obvious decision point instead of a chain of
 * silent early returns. Every refusal carries a reason the UI can surface —
 * a click that does nothing without explanation is the bug this replaces.
 */

/** Bible layer −1: collision / authority grid stored on `map.grid`. */
export const LOGIC_LAYER_IDX = -1;

export type PaintTarget =
  | { kind: "logic" }
  | { kind: "visual"; layerIdx: number }
  | { kind: "unavailable"; reason: string };

export interface PaintableMap {
  grid?: number[][];
  tileLayers?: Array<{ name?: string; grid?: number[][] }>;
  tilesets?: Array<{ firstgid: number }>;
}

/** Decide which grid a click should write to, or why it cannot. */
export function resolvePaintTarget(
  map: PaintableMap | null | undefined,
  activeLayerIdx: number
): PaintTarget {
  if (activeLayerIdx === LOGIC_LAYER_IDX) {
    const grid = map?.grid;
    if (!Array.isArray(grid) || grid.length === 0) {
      return { kind: "unavailable", reason: "This map has no logic grid to paint." };
    }
    return { kind: "logic" };
  }

  if (!Number.isInteger(activeLayerIdx) || activeLayerIdx < 0) {
    return { kind: "unavailable", reason: `Unknown layer index ${activeLayerIdx}.` };
  }

  if (!Array.isArray(map?.tilesets) || map.tilesets.length === 0) {
    return {
      kind: "unavailable",
      reason: "Map has no tilesets — open World Builder to bootstrap them, then Save Map.",
    };
  }

  const layer = map?.tileLayers?.[activeLayerIdx];
  if (!layer || !Array.isArray(layer.grid)) {
    return {
      kind: "unavailable",
      reason: `No visual layer ${activeLayerIdx} — use Add Layer in World Builder, or switch to Logic (−1).`,
    };
  }

  return { kind: "visual", layerIdx: activeLayerIdx };
}

export type PaintResult = { ok: true } | { ok: false; reason: string };

/**
 * Write one cell in place, reporting a reason instead of throwing. A ragged grid
 * used to raise inside the Babylon pointer callback after the visual had already
 * been applied, so the map data and the screen disagreed with no error surfaced.
 */
export function paintCell(
  map: PaintableMap | null | undefined,
  target: PaintTarget,
  r: number,
  c: number,
  tileId: number
): PaintResult {
  if (target.kind === "unavailable") return { ok: false, reason: target.reason };

  const label = target.kind === "logic" ? "the logic grid" : `layer ${target.layerIdx}`;
  const grid = target.kind === "logic" ? map?.grid : map?.tileLayers?.[target.layerIdx]?.grid;
  if (!Array.isArray(grid)) return { ok: false, reason: `Cannot paint: ${label} is missing.` };

  if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) {
    return { ok: false, reason: `Cell (${c}, ${r}) is outside ${label}.` };
  }
  const row = grid[r];
  if (!Array.isArray(row) || c >= row.length) {
    return { ok: false, reason: `Cell (${c}, ${r}) is outside ${label}.` };
  }

  // A frozen row means the map came from immer-produced state. Report it rather
  // than throwing from inside the pointer handler where nothing surfaces it.
  if (Object.isFrozen(row)) {
    return { ok: false, reason: `Cannot paint: ${label} is read-only (frozen map data).` };
  }

  row[c] = tileId;
  return { ok: true };
}

/**
 * Logic ids must exist in the `MapLogicTile` registry or `validateMapSave`
 * rejects the whole map on save. Returns true when the registry has not loaded
 * yet so painting is never blocked by a slow fetch.
 */
export function isPaintableLogicId(
  logicTiles: Record<number | string, unknown> | null | undefined,
  logicId: number
): boolean {
  if (!logicTiles) return true;
  const keys = Object.keys(logicTiles);
  if (keys.length === 0) return true;
  return Object.prototype.hasOwnProperty.call(logicTiles, String(logicId));
}

/** Mesh names the paint/pick ray is allowed to land on. */
export function isTilePickTarget(meshName: string | null | undefined): boolean {
  if (!meshName) return false;
  return (
    meshName === "map_pick_plane" ||
    meshName.startsWith("logic_") ||
    meshName.startsWith("tile_") ||
    meshName.startsWith("tileset_mesh_") ||
    meshName.startsWith("ground_") ||
    meshName.startsWith("base_ground_")
  );
}
