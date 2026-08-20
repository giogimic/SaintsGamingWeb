import { describe, it, expect } from 'vitest';
import {
  eraseTilesInRegion,
  eraseSparseCells,
  getCellsBoundingBox,
  type PaintableMap,
} from './tilePaint';
import {
  extractSubgridFromMap,
  extractSparseCellsFromMap,
  stampClipboardOntoMap,
  type TileClipboardData,
} from './subgridStamp';
import {
  emptyEditorOpStack,
  pushEditorOp,
  undoEditorOp,
  redoEditorOp,
  type PaintedCell,
} from './editorOps';

function createMockGridMap(width = 16, height = 16): PaintableMap {
  const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));
  const visualGrid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

  // Seed sample visual tiles
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      visualGrid[r][c] = (r * width + c + 1);
    }
  }

  // Seed sample logic tags
  grid[2][2] = 3; // Warp Gate
  grid[5][5] = 4; // Loot
  grid[7][7] = 8; // NPC Trigger

  return {
    grid,
    tileLayers: [
      {
        name: 'Ground',
        grid: visualGrid,
      },
    ],
    tilesets: [{ firstgid: 1 }],
  };
}

describe('Studio Spatial Interaction System', () => {
  describe('1. Selection & Bounding Boxes', () => {
    it('calculates bounding box for single tile selection', () => {
      const bbox = getCellsBoundingBox([{ r: 5, c: 5 }]);
      expect(bbox).toEqual({
        minR: 5,
        maxR: 5,
        minC: 5,
        maxC: 5,
        width: 1,
        height: 1,
        count: 1,
      });
    });

    it('calculates bounding box for 2x2 selection', () => {
      const bbox = getCellsBoundingBox({
        '2,2': true,
        '2,3': true,
        '3,2': true,
        '3,3': true,
      });
      expect(bbox).toEqual({
        minR: 2,
        maxR: 3,
        minC: 2,
        maxC: 3,
        width: 2,
        height: 2,
        count: 4,
      });
    });

    it('calculates bounding box for large 8x6 selection (48 cells)', () => {
      const cells: Record<string, boolean> = {};
      for (let r = 10; r <= 15; r++) {
        for (let c = 10; c <= 17; c++) {
          cells[`${r},${c}`] = true;
        }
      }
      const bbox = getCellsBoundingBox(cells);
      expect(bbox).toEqual({
        minR: 10,
        maxR: 15,
        minC: 10,
        maxC: 17,
        width: 8,
        height: 6,
        count: 48,
      });
    });

    it('handles additive selection properly', () => {
      const selection: Record<string, boolean> = { '1,1': true, '1,2': true };
      // Add more cells (Shift + click / drag)
      const toAdd = [{ r: 2, c: 1 }, { r: 2, c: 2 }, { r: 5, c: 5 }];
      toAdd.forEach(({ r, c }) => {
        selection[`${r},${c}`] = true;
      });

      expect(Object.keys(selection)).toHaveLength(5);
      const bbox = getCellsBoundingBox(selection);
      expect(bbox).toEqual({
        minR: 1,
        maxR: 5,
        minC: 1,
        maxC: 5,
        width: 5,
        height: 5,
        count: 5,
      });
    });

    it('handles subtractive selection properly', () => {
      const selection: Record<string, boolean> = {
        '1,1': true,
        '1,2': true,
        '2,1': true,
        '2,2': true,
      };
      // Subtract cells (Ctrl/Cmd + click / drag)
      delete selection['1,1'];
      delete selection['2,2'];

      expect(Object.keys(selection)).toHaveLength(2);
      expect(selection['1,2']).toBe(true);
      expect(selection['2,1']).toBe(true);
    });
  });

  describe('2. Multi-Cell Delete & Undo/Redo', () => {
    it('deletes all 48 selected cells in one operation and undoes atomically', () => {
      const map = createMockGridMap(20, 20);
      const cells: Record<string, boolean> = {};
      for (let r = 2; r <= 7; r++) {
        for (let c = 2; c <= 9; c++) {
          cells[`${r},${c}`] = true;
        }
      }

      // 6 rows * 8 cols = 48 cells
      const eraseRes = eraseSparseCells({
        map,
        layerIdx: 0,
        cells,
      });

      expect(eraseRes.ok).toBe(true);
      if (!eraseRes.ok) return;

      expect(eraseRes.cells).toHaveLength(48);
      // Verify map mutated in place
      for (let r = 2; r <= 7; r++) {
        for (let c = 2; c <= 9; c++) {
          expect(map.tileLayers![0]!.grid![r][c]).toBe(0);
        }
      }

      // Single undo operation
      let stack = emptyEditorOpStack();
      stack = pushEditorOp(stack, { kind: 'paint_cells', cells: eraseRes.cells });

      const undone = undoEditorOp(map, stack);
      expect(undone.op).not.toBeNull();
      // All 48 cells restored
      for (let r = 2; r <= 7; r++) {
        for (let c = 2; c <= 9; c++) {
          expect(map.tileLayers![0]!.grid![r][c]).toBeGreaterThan(0);
        }
      }

      // Redo
      const redone = redoEditorOp(map, undone.stack);
      expect(redone.op).not.toBeNull();
      for (let r = 2; r <= 7; r++) {
        for (let c = 2; c <= 9; c++) {
          expect(map.tileLayers![0]!.grid![r][c]).toBe(0);
        }
      }
    });

    it('erases logic layer (-1) tiles correctly', () => {
      const map = createMockGridMap(10, 10);
      expect(map.grid![2][2]).toBe(3);

      const eraseRes = eraseSparseCells({
        map,
        layerIdx: -1,
        cells: [{ r: 2, c: 2 }],
      });

      expect(eraseRes.ok).toBe(true);
      if (!eraseRes.ok) return;
      expect(map.grid![2][2]).toBe(0);
      expect(eraseRes.cells[0]).toEqual({
        layerIdx: -1,
        r: 2,
        c: 2,
        before: 3,
        after: 0,
      });
    });
  });

  describe('3. Multi-Cell Copy & Cut', () => {
    it('copies rectangular and arbitrary sparse selections with relative normalization', () => {
      const map = createMockGridMap(10, 10);
      const cells: Record<string, boolean> = {
        '3,3': true,
        '3,4': true,
        '5,6': true,
      };

      const clip = extractSparseCellsFromMap({
        map,
        cells,
        activeLayerIdx: 0,
      });

      expect(clip).not.toBeNull();
      if (!clip) return;

      expect(clip.width).toBe(4); // from col 3 to col 6 = 4 cols
      expect(clip.height).toBe(3); // from row 3 to row 5 = 3 rows
      expect(clip.sourceOrigin).toEqual({ r: 3, c: 3 });
      expect(clip.visualData.length).toBeGreaterThanOrEqual(3);
    });

    it('cuts multi-cell selection atomically', () => {
      const map = createMockGridMap(10, 10);
      const cells = [
        { r: 1, c: 1 },
        { r: 1, c: 2 },
        { r: 2, c: 1 },
      ];

      // 1. Copy
      const clip = extractSparseCellsFromMap({
        map,
        cells,
        activeLayerIdx: 0,
      });
      expect(clip).not.toBeNull();

      // 2. Erase
      const eraseRes = eraseSparseCells({
        map,
        layerIdx: 0,
        cells,
      });
      expect(eraseRes.ok).toBe(true);
      if (!eraseRes.ok) return;

      expect(eraseRes.cells).toHaveLength(3);
      expect(map.tileLayers![0]!.grid![1][1]).toBe(0);
      expect(map.tileLayers![0]!.grid![1][2]).toBe(0);
      expect(map.tileLayers![0]!.grid![2][1]).toBe(0);
    });
  });

  describe('4. Paste Semantics & Action Preview', () => {
    it('pastes clipboard at explicit coordinates with single undo', () => {
      const map = createMockGridMap(12, 12);
      const clip: TileClipboardData = {
        width: 2,
        height: 2,
        visualData: [
          { layerOffset: 0, r: 0, c: 0, tileId: 777 },
          { layerOffset: 0, r: 0, c: 1, tileId: 778 },
          { layerOffset: 0, r: 1, c: 0, tileId: 779 },
          { layerOffset: 0, r: 1, c: 1, tileId: 780 },
        ],
        logicData: [
          { r: 0, c: 0, tileId: 9 },
        ],
        sourceOrigin: { r: 0, c: 0 },
        activeLayerAtCopy: 0,
      };

      const stampRes = stampClipboardOntoMap({
        map,
        clipboard: clip,
        targetR: 4,
        targetC: 4,
        mode: 'overlay',
        activeLayerIdx: 0,
      });

      expect(stampRes.ok).toBe(true);
      expect(map.tileLayers![0]!.grid![4][4]).toBe(777);
      expect(map.tileLayers![0]!.grid![4][5]).toBe(778);
      expect(map.tileLayers![0]!.grid![5][4]).toBe(779);
      expect(map.tileLayers![0]!.grid![5][5]).toBe(780);
      expect(map.grid![4][4]).toBe(9);

      // Single undo restores previous state
      let stack = emptyEditorOpStack();
      stack = pushEditorOp(stack, { kind: 'paint_cells', cells: stampRes.cells });

      const undone = undoEditorOp(map, stack);
      expect(undone.op).not.toBeNull();
      expect(map.tileLayers![0]!.grid![4][4]).not.toBe(777);
      expect(map.grid![4][4]).toBe(0);
    });

    it('handles clipboard stamping clipped at map boundaries gracefully', () => {
      const map = createMockGridMap(8, 8);
      const clip: TileClipboardData = {
        width: 4,
        height: 4,
        visualData: [
          { layerOffset: 0, r: 0, c: 0, tileId: 99 },
          { layerOffset: 0, r: 3, c: 3, tileId: 99 }, // will overflow when target is (6,6)
        ],
        logicData: [],
        sourceOrigin: { r: 0, c: 0 },
        activeLayerAtCopy: 0,
      };

      const stampRes = stampClipboardOntoMap({
        map,
        clipboard: clip,
        targetR: 6,
        targetC: 6,
        mode: 'overlay',
        activeLayerIdx: 0,
      });

      expect(stampRes.ok).toBe(true);
      expect(map.tileLayers![0]!.grid![6][6]).toBe(99);
      // (9,9) was skipped because map is 8x8
      expect(stampRes.cells.length).toBe(1);
    });
  });
});
