/**
 * Definition-form undo stack (bible 30 §7 — separate from map paint ops).
 * v1: snapshot patches for catalog forms; panels push before/after JSON clones.
 */

export type DefinitionSnapshotOp = {
  kind: "definition_snapshot";
  /** Stable id e.g. `quest:demo_intro` or `quest:new`. */
  resourceKey: string;
  before: unknown;
  after: unknown;
};

export type DefinitionOp = DefinitionSnapshotOp;

export type DefinitionOpStack = {
  undo: DefinitionOp[];
  redo: DefinitionOp[];
};

export const MAX_DEFINITION_OPS = 50;

export function emptyDefinitionOpStack(): DefinitionOpStack {
  return { undo: [], redo: [] };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function pushDefinitionOp(
  stack: DefinitionOpStack,
  resourceKey: string,
  before: unknown,
  after: unknown
): DefinitionOpStack {
  if (JSON.stringify(before) === JSON.stringify(after)) return stack;
  const op: DefinitionSnapshotOp = {
    kind: "definition_snapshot",
    resourceKey,
    before: cloneJson(before),
    after: cloneJson(after),
  };
  const undo = [...stack.undo, op];
  if (undo.length > MAX_DEFINITION_OPS) undo.shift();
  return { undo, redo: [] };
}

export function undoDefinitionOp(
  stack: DefinitionOpStack
): { stack: DefinitionOpStack; op: DefinitionOp | null } {
  if (stack.undo.length === 0) return { stack, op: null };
  const op = stack.undo[stack.undo.length - 1]!;
  return {
    stack: {
      undo: stack.undo.slice(0, -1),
      redo: [...stack.redo, op],
    },
    op,
  };
}

export function redoDefinitionOp(
  stack: DefinitionOpStack
): { stack: DefinitionOpStack; op: DefinitionOp | null } {
  if (stack.redo.length === 0) return { stack, op: null };
  const op = stack.redo[stack.redo.length - 1]!;
  return {
    stack: {
      undo: [...stack.undo, op],
      redo: stack.redo.slice(0, -1),
    },
    op,
  };
}

/** Restore value for undo (before) or redo (after). */
export function definitionOpValue(
  op: DefinitionOp,
  direction: "undo" | "redo"
): unknown {
  return direction === "undo" ? op.before : op.after;
}

export function clearDefinitionOpsForKey(
  stack: DefinitionOpStack,
  resourceKey: string
): DefinitionOpStack {
  return {
    undo: stack.undo.filter((op) => op.resourceKey !== resourceKey),
    redo: stack.redo.filter((op) => op.resourceKey !== resourceKey),
  };
}
