/**
 * World document write path — engine-editor ownership of working map data.
 *
 * Authoring tools mutate the working map through this module, then sync into
 * the game store for render/playtest. Keeps paint helpers pure while ending
 * ad-hoc `useGameStore.setState` as the primary editor write API.
 */

import type { PaintableMap } from "./tilePaint";
import { LOGIC_LAYER_IDX } from "./tilePaint";
import {
  paintCellWithHistory,
  type PaintedCell,
  type PaintCellsOp,
} from "./editorOps";

export type WorldDocumentSync = {
  /** Ensure game store points at this working map object. */
  ensureActiveMap: (map: PaintableMap) => void;
  markDirty: () => void;
};

/**
 * Paint one cell on the working world document and return history cell data.
 * Caller is responsible for engine mesh updates and pushing the EditorOp.
 */
export function paintWorldCell(
  map: PaintableMap,
  layerIdx: number,
  r: number,
  c: number,
  tileId: number,
  sync: WorldDocumentSync
): { cell: PaintedCell } | { error: string } {
  const result = paintCellWithHistory(map, layerIdx, r, c, tileId);
  if ("error" in result) return result;
  sync.ensureActiveMap(map);
  if (result.cell.before !== result.cell.after) {
    sync.markDirty();
  }
  return result;
}

export function makePaintCellsOp(cells: PaintedCell[]): PaintCellsOp {
  return {
    kind: "paint_cells",
    cells: cells.filter((c) => c.before !== c.after),
  };
}

export { LOGIC_LAYER_IDX };
