/**
 * Game-engine editor command ops (bible 30 §7 — map undo scope).
 *
 * Paint/erase/logic writes become reversible ops. Definition-form undo is a
 * separate stack (Phase 2). Pure module — no React/Babylon.
 */

import {
  LOGIC_LAYER_IDX,
  paintCell,
  resolvePaintTarget,
  type PaintableMap,
} from "./tilePaint";

export type PaintedCell = {
  r: number;
  c: number;
  /** −1 = logic grid; >= 0 = visual tileLayers index. */
  layerIdx: number;
  before: number;
  after: number;
};

export type PaintCellsOp = {
  kind: "paint_cells";
  cells: PaintedCell[];
};

export type EditorOp = PaintCellsOp;

export type EditorOpStack = {
  undo: EditorOp[];
  redo: EditorOp[];
};

export const MAX_EDITOR_OPS = 100;

export function emptyEditorOpStack(): EditorOpStack {
  return { undo: [], redo: [] };
}

export function readCellValue(
  map: PaintableMap | null | undefined,
  layerIdx: number,
  r: number,
  c: number
): number {
  if (layerIdx === LOGIC_LAYER_IDX) {
    return map?.grid?.[r]?.[c] ?? 0;
  }
  return map?.tileLayers?.[layerIdx]?.grid?.[r]?.[c] ?? 0;
}

/**
 * Apply a single cell paint and return an op cell entry (or null if no-op / fail).
 */
export function paintCellWithHistory(
  map: PaintableMap,
  layerIdx: number,
  r: number,
  c: number,
  after: number
): { cell: PaintedCell } | { error: string } {
  const target = resolvePaintTarget(map, layerIdx);
  if (target.kind === "unavailable") return { error: target.reason };

  const before = readCellValue(map, layerIdx, r, c);
  if (before === after) {
    return { cell: { r, c, layerIdx, before, after } };
  }

  const write = paintCell(map, target, r, c, after);
  if (!write.ok) return { error: write.reason };

  return { cell: { r, c, layerIdx, before, after } };
}

function writeCell(
  map: PaintableMap,
  layerIdx: number,
  r: number,
  c: number,
  value: number
): { ok: true } | { ok: false; reason: string } {
  const target = resolvePaintTarget(map, layerIdx);
  return paintCell(map, target, r, c, value);
}

/**
 * Merge multiple intermediate writes to the same cell within a single stroke/op.
 * Preserves the initial `before` value and the final `after` value.
 */
export function deduplicatePaintedCells(cells: PaintedCell[]): PaintedCell[] {
  const map = new Map<string, PaintedCell>();
  for (const cell of cells) {
    const key = `${cell.layerIdx}:${cell.r}:${cell.c}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...cell });
    } else {
      existing.after = cell.after;
    }
  }
  const result: PaintedCell[] = [];
  for (const cell of map.values()) {
    if (cell.before !== cell.after) {
      result.push(cell);
    }
  }
  return result;
}

/** Apply op forward (do) or reverse (undo). */
export function applyEditorOp(
  map: PaintableMap,
  op: EditorOp,
  direction: "do" | "undo"
): { ok: true } | { ok: false; reason: string } {
  if (op.kind !== "paint_cells") {
    return { ok: false, reason: `Unknown editor op.` };
  }

  const cells = direction === "undo" ? [...op.cells].reverse() : op.cells;
  for (const cell of cells) {
    const value = direction === "do" ? cell.after : cell.before;
    const result = writeCell(map, cell.layerIdx, cell.r, cell.c, value);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export function pushEditorOp(stack: EditorOpStack, op: EditorOp): EditorOpStack {
  if (op.kind === "paint_cells" && op.cells.length === 0) return stack;
  const undo = [...stack.undo, op];
  if (undo.length > MAX_EDITOR_OPS) undo.shift();
  return { undo, redo: [] };
}

export function undoEditorOp(
  map: PaintableMap,
  stack: EditorOpStack
): { stack: EditorOpStack; op: EditorOp | null; error?: string } {
  if (stack.undo.length === 0) return { stack, op: null };
  const op = stack.undo[stack.undo.length - 1]!;
  const result = applyEditorOp(map, op, "undo");
  if (!result.ok) return { stack, op: null, error: result.reason };
  return {
    stack: {
      undo: stack.undo.slice(0, -1),
      redo: [...stack.redo, op],
    },
    op,
  };
}

export function redoEditorOp(
  map: PaintableMap,
  stack: EditorOpStack
): { stack: EditorOpStack; op: EditorOp | null; error?: string } {
  if (stack.redo.length === 0) return { stack, op: null };
  const op = stack.redo[stack.redo.length - 1]!;
  const result = applyEditorOp(map, op, "do");
  if (!result.ok) return { stack, op: null, error: result.reason };
  return {
    stack: {
      undo: [...stack.undo, op],
      redo: stack.redo.slice(0, -1),
    },
    op,
  };
}
