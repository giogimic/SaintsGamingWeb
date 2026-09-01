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

export type LayerOp =
  | {
      kind: "create_layer";
      layerIdx: number;
      layer: { name?: string; grid?: number[][] };
    }
  | {
      kind: "delete_layer";
      layerIdx: number;
      layer: { name?: string; grid?: number[][] };
    }
  | {
      kind: "reorder_layer";
      fromIdx: number;
      toIdx: number;
    }
  | {
      kind: "rename_layer";
      layerIdx: number;
      before: string;
      after: string;
    };

export type EntityOp =
  | {
      kind: "create_entity";
      entity: any;
    }
  | {
      kind: "delete_entity";
      entity: any;
    }
  | {
      kind: "move_entity";
      entityId: string;
      before: { x: number; y: number };
      after: { x: number; y: number };
    }
  | {
      kind: "modify_entity";
      entityId: string;
      before: any;
      after: any;
    };

export type GateOp =
  | {
      kind: "create_gate";
      gate: any;
      tileChange?: PaintedCell;
    }
  | {
      kind: "delete_gate";
      gate: any;
      tileChange?: PaintedCell;
    }
  | {
      kind: "modify_gate";
      gateId: string;
      before: any;
      after: any;
    };

export type MapPropsOp = {
  kind: "modify_map_props";
  before: Record<string, any>;
  after: Record<string, any>;
};

export type CompoundOp = {
  kind: "compound";
  description?: string;
  ops: EditorOp[];
};

export type FreeformLayersOp = {
  kind: "modify_freeform_layers";
  before: any[];
  after: any[];
};

export type EditorOp =
  | PaintCellsOp
  | LayerOp
  | EntityOp
  | GateOp
  | MapPropsOp
  | FreeformLayersOp
  | CompoundOp;

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

function updateEntityPosition(entity: any, pos: { x: number; y: number }) {
  if (!entity) return;
  if (entity.components?.transform) {
    entity.components.transform.x = pos.x;
    entity.components.transform.y = pos.y;
  }
  if (entity.position) {
    entity.position.x = pos.x;
    entity.position.y = pos.y;
  }
  entity.x = pos.x;
  entity.y = pos.y;
}

/** Apply op forward (do) or reverse (undo). */
export function applyEditorOp(
  map: any,
  op: EditorOp,
  direction: "do" | "undo"
): { ok: true } | { ok: false; reason: string } {
  if (!map) return { ok: false, reason: "No active map." };

  switch (op.kind) {
    case "paint_cells": {
      const cells = direction === "undo" ? [...op.cells].reverse() : op.cells;
      for (const cell of cells) {
        const value = direction === "do" ? cell.after : cell.before;
        const result = writeCell(map, cell.layerIdx, cell.r, cell.c, value);
        if (!result.ok) return result;
      }
      return { ok: true };
    }

    case "create_layer": {
      if (!Array.isArray(map.tileLayers)) map.tileLayers = [];
      if (direction === "do") {
        map.tileLayers.splice(op.layerIdx, 0, op.layer);
      } else {
        map.tileLayers.splice(op.layerIdx, 1);
      }
      return { ok: true };
    }

    case "delete_layer": {
      if (!Array.isArray(map.tileLayers)) map.tileLayers = [];
      if (direction === "do") {
        map.tileLayers.splice(op.layerIdx, 1);
      } else {
        map.tileLayers.splice(op.layerIdx, 0, op.layer);
      }
      return { ok: true };
    }

    case "reorder_layer": {
      if (!Array.isArray(map.tileLayers)) return { ok: false, reason: "No tileLayers." };
      const from = direction === "do" ? op.fromIdx : op.toIdx;
      const to = direction === "do" ? op.toIdx : op.fromIdx;
      const [layer] = map.tileLayers.splice(from, 1);
      if (layer) {
        map.tileLayers.splice(to, 0, layer);
      }
      return { ok: true };
    }

    case "rename_layer": {
      if (!Array.isArray(map.tileLayers) || !map.tileLayers[op.layerIdx]) {
        return { ok: false, reason: `Layer ${op.layerIdx} not found.` };
      }
      map.tileLayers[op.layerIdx].name = direction === "do" ? op.after : op.before;
      return { ok: true };
    }

    case "create_entity": {
      const list = Array.isArray(map.entities) ? map.entities : Array.isArray(map.npcs) ? map.npcs : null;
      if (!list) {
        map.entities = [op.entity];
        return { ok: true };
      }
      if (direction === "do") {
        const existingIdx = list.findIndex((e: any) => e.id === op.entity.id);
        if (existingIdx >= 0) list[existingIdx] = op.entity;
        else list.push(op.entity);
      } else {
        const idx = list.findIndex((e: any) => e.id === op.entity.id);
        if (idx >= 0) list.splice(idx, 1);
      }
      return { ok: true };
    }

    case "delete_entity": {
      const list = Array.isArray(map.entities) ? map.entities : Array.isArray(map.npcs) ? map.npcs : null;
      if (!list) return { ok: true };
      if (direction === "do") {
        const idx = list.findIndex((e: any) => e.id === op.entity.id);
        if (idx >= 0) list.splice(idx, 1);
      } else {
        const existingIdx = list.findIndex((e: any) => e.id === op.entity.id);
        if (existingIdx >= 0) list[existingIdx] = op.entity;
        else list.push(op.entity);
      }
      return { ok: true };
    }

    case "move_entity": {
      const list = Array.isArray(map.entities) ? map.entities : Array.isArray(map.npcs) ? map.npcs : [];
      const entity = list.find((e: any) => e.id === op.entityId);
      if (entity) {
        updateEntityPosition(entity, direction === "do" ? op.after : op.before);
      }
      return { ok: true };
    }

    case "modify_entity": {
      const list = Array.isArray(map.entities) ? map.entities : Array.isArray(map.npcs) ? map.npcs : [];
      const idx = list.findIndex((e: any) => e.id === op.entityId);
      if (idx >= 0) {
        list[idx] = direction === "do" ? op.after : op.before;
      }
      return { ok: true };
    }

    case "create_gate": {
      if (!Array.isArray(map.gates) && typeof map.gates !== 'object') map.gates = [];
      const gateList = Array.isArray(map.gates)
        ? map.gates
        : Array.isArray(map.gates?.gates)
        ? map.gates.gates
        : null;

      if (direction === "do") {
        if (gateList) {
          const idx = gateList.findIndex((g: any) => g.id === op.gate.id);
          if (idx >= 0) gateList[idx] = op.gate;
          else gateList.push(op.gate);
        }
        if (op.tileChange) {
          writeCell(map, op.tileChange.layerIdx, op.tileChange.r, op.tileChange.c, op.tileChange.after);
        }
      } else {
        if (gateList) {
          const idx = gateList.findIndex((g: any) => g.id === op.gate.id);
          if (idx >= 0) gateList.splice(idx, 1);
        }
        if (op.tileChange) {
          writeCell(map, op.tileChange.layerIdx, op.tileChange.r, op.tileChange.c, op.tileChange.before);
        }
      }
      return { ok: true };
    }

    case "delete_gate": {
      const gateList = Array.isArray(map.gates)
        ? map.gates
        : Array.isArray(map.gates?.gates)
        ? map.gates.gates
        : null;

      if (direction === "do") {
        if (gateList) {
          const idx = gateList.findIndex((g: any) => g.id === op.gate.id);
          if (idx >= 0) gateList.splice(idx, 1);
        }
        if (op.tileChange) {
          writeCell(map, op.tileChange.layerIdx, op.tileChange.r, op.tileChange.c, op.tileChange.after);
        }
      } else {
        if (gateList) {
          const idx = gateList.findIndex((g: any) => g.id === op.gate.id);
          if (idx >= 0) gateList[idx] = op.gate;
          else gateList.push(op.gate);
        }
        if (op.tileChange) {
          writeCell(map, op.tileChange.layerIdx, op.tileChange.r, op.tileChange.c, op.tileChange.before);
        }
      }
      return { ok: true };
    }

    case "modify_gate": {
      const gateList = Array.isArray(map.gates)
        ? map.gates
        : Array.isArray(map.gates?.gates)
        ? map.gates.gates
        : [];
      const idx = gateList.findIndex((g: any) => g.id === op.gateId);
      if (idx >= 0) {
        gateList[idx] = direction === "do" ? op.after : op.before;
      }
      return { ok: true };
    }

    case "modify_map_props": {
      const data = direction === "do" ? op.after : op.before;
      Object.assign(map, data);
      return { ok: true };
    }

    case "modify_freeform_layers": {
      const data = direction === "do" ? op.after : op.before;
      (map as any).freeformLayers = JSON.parse(JSON.stringify(data || []));
      return { ok: true };
    }

    case "compound": {
      const ops = direction === "undo" ? [...op.ops].reverse() : op.ops;
      for (const subOp of ops) {
        const res = applyEditorOp(map, subOp, direction);
        if (!res.ok) return res;
      }
      return { ok: true };
    }

    default:
      return { ok: false, reason: `Unknown editor op kind: ${(op as any).kind}` };
  }
}

export function pushEditorOp(stack: EditorOpStack, op: EditorOp): EditorOpStack {
  if (op.kind === "paint_cells" && op.cells.length === 0) return stack;
  if (op.kind === "compound" && op.ops.length === 0) return stack;
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

// Op creation helpers
export function makeCreateLayerOp(layerIdx: number, layer: { name?: string; grid?: number[][] }): LayerOp {
  return { kind: "create_layer", layerIdx, layer };
}

export function makeDeleteLayerOp(layerIdx: number, layer: { name?: string; grid?: number[][] }): LayerOp {
  return { kind: "delete_layer", layerIdx, layer };
}

export function makeReorderLayerOp(fromIdx: number, toIdx: number): LayerOp {
  return { kind: "reorder_layer", fromIdx, toIdx };
}

export function makeRenameLayerOp(layerIdx: number, before: string, after: string): LayerOp {
  return { kind: "rename_layer", layerIdx, before, after };
}

export function makeCreateEntityOp(entity: any): EntityOp {
  return { kind: "create_entity", entity };
}

export function makeDeleteEntityOp(entity: any): EntityOp {
  return { kind: "delete_entity", entity };
}

export function makeMoveEntityOp(entityId: string, before: { x: number; y: number }, after: { x: number; y: number }): EntityOp {
  return { kind: "move_entity", entityId, before, after };
}

export function makeModifyEntityOp(entityId: string, before: any, after: any): EntityOp {
  return { kind: "modify_entity", entityId, before, after };
}

export function makeCreateGateOp(gate: any, tileChange?: PaintedCell): GateOp {
  return { kind: "create_gate", gate, tileChange };
}

export function makeDeleteGateOp(gate: any, tileChange?: PaintedCell): GateOp {
  return { kind: "delete_gate", gate, tileChange };
}

export function makeModifyGateOp(gateId: string, before: any, after: any): GateOp {
  return { kind: "modify_gate", gateId, before, after };
}

export function makeModifyMapPropsOp(before: Record<string, any>, after: Record<string, any>): MapPropsOp {
  return { kind: "modify_map_props", before, after };
}

export function makeCompoundOp(ops: EditorOp[], description?: string): CompoundOp {
  return { kind: "compound", ops, description };
}

