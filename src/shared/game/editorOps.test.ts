import { describe, expect, it } from "vitest";
import {
  emptyEditorOpStack,
  paintCellWithHistory,
  pushEditorOp,
  redoEditorOp,
  undoEditorOp,
} from "./editorOps";
import type { PaintableMap } from "./tilePaint";

function makeMap(): PaintableMap {
  return {
    grid: [
      [0, 0],
      [0, 0],
    ],
    tileLayers: [
      {
        name: "Ground",
        grid: [
          [1, 1],
          [1, 1],
        ],
      },
    ],
    tilesets: [{ firstgid: 1 }],
  };
}

describe("editorOps", () => {
  it("records paint history and undoes/redoes a cell", () => {
    const map = makeMap();
    const painted = paintCellWithHistory(map, 0, 0, 1, 17);
    expect("cell" in painted).toBe(true);
    if (!("cell" in painted)) return;
    expect(map.tileLayers![0]!.grid![0]![1]).toBe(17);

    let stack = emptyEditorOpStack();
    stack = pushEditorOp(stack, { kind: "paint_cells", cells: [painted.cell] });

    const undone = undoEditorOp(map, stack);
    expect(undone.op).not.toBeNull();
    expect(map.tileLayers![0]!.grid![0]![1]).toBe(1);
    stack = undone.stack;

    const redone = redoEditorOp(map, stack);
    expect(redone.op).not.toBeNull();
    expect(map.tileLayers![0]!.grid![0]![1]).toBe(17);
  });

  it("paints logic layer (−1) with history", () => {
    const map = makeMap();
    const painted = paintCellWithHistory(map, -1, 1, 0, 3);
    expect("cell" in painted).toBe(true);
    if (!("cell" in painted)) return;
    expect(map.grid![1]![0]).toBe(3);

    const stack = pushEditorOp(emptyEditorOpStack(), {
      kind: "paint_cells",
      cells: [painted.cell],
    });
    undoEditorOp(map, stack);
    expect(map.grid![1]![0]).toBe(0);
  });
});
