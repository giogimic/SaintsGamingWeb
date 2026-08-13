import { describe, expect, it } from "vitest";
import {
  emptyEditorOpStack,
  paintCellWithHistory,
  pushEditorOp,
  redoEditorOp,
  undoEditorOp,
  deduplicatePaintedCells,
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

  it("deduplicates repeated cell writes in a single stroke preserving initial before and final after", () => {
    const cells = [
      { layerIdx: 0, r: 1, c: 1, before: 1, after: 5 },
      { layerIdx: 0, r: 1, c: 1, before: 5, after: 17 },
      { layerIdx: -1, r: 0, c: 0, before: 0, after: 2 },
    ];
    const deduped = deduplicatePaintedCells(cells);
    expect(deduped).toHaveLength(2);
    expect(deduped[0]).toEqual({ layerIdx: 0, r: 1, c: 1, before: 1, after: 17 });
    expect(deduped[1]).toEqual({ layerIdx: -1, r: 0, c: 0, before: 0, after: 2 });
  });

  it("omits cells with no net change from deduplicated op", () => {
    const cells = [
      { layerIdx: 0, r: 0, c: 0, before: 1, after: 5 },
      { layerIdx: 0, r: 0, c: 0, before: 5, after: 1 },
    ];
    const deduped = deduplicatePaintedCells(cells);
    expect(deduped).toHaveLength(0);
  });
});
