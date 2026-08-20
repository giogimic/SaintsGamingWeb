import { describe, it, expect, beforeEach } from 'vitest';
import {
  paintTilesInRegion,
  paintSparseCells,
  eraseTilesInRegion,
  eraseSparseCells,
  type PaintableMap,
} from './tilePaint';
import {
  extractSubgridFromMap,
  extractSparseCellsFromMap,
  stampClipboardOntoMap,
  duplicateSelectionOnMap,
  moveSelectionOnMap,
} from './subgridStamp';
import {
  transformSelectionInPlace,
  rotateCW,
  rotateCCW,
  flipMatrixH,
  flipMatrixV,
  type StampTransform,
} from './stampTransform';
import {
  emptyEditorOpStack,
  pushEditorOp,
  undoEditorOp,
  redoEditorOp,
  type PaintedCell,
} from './editorOps';

function createTestMap(width = 10, height = 10): PaintableMap {
  const blankGrid = () => Array.from({ length: height }, () => Array(width).fill(0));
  return {
    grid: blankGrid(), // Logic layer (-1)
    tilesets: [{ firstgid: 1 }],
    tileLayers: [
      { name: 'Ground', grid: blankGrid() }, // Visual layer 0
      { name: 'Overhead', grid: blankGrid() }, // Visual layer 1
    ],
  };
}

describe('Selection Operations Matrix (Phase 1)', () => {
  let map: PaintableMap;

  beforeEach(() => {
    map = createTestMap(10, 10);
  });

  describe('1. Paint × Selection Matrix', () => {
    it('paints a single selected cell on a visual layer', () => {
      const res = paintTilesInRegion({
        map,
        layerIdx: 0,
        minR: 2,
        maxR: 2,
        minC: 3,
        maxC: 3,
        tileId: 42,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.cells).toHaveLength(1);
        expect(res.cells[0]).toEqual({ layerIdx: 0, r: 2, c: 3, before: 0, after: 42 });
        expect(map.tileLayers![0].grid![2][3]).toBe(42);
      }
    });

    it('paints a rectangular region on the logic layer (-1)', () => {
      const res = paintTilesInRegion({
        map,
        layerIdx: -1,
        minR: 1,
        maxR: 3,
        minC: 2,
        maxC: 4,
        tileId: 1, // Logic Wall
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.cells).toHaveLength(9); // 3x3
        expect(map.grid![1][2]).toBe(1);
        expect(map.grid![3][4]).toBe(1);
        expect(map.grid![0][0]).toBe(0);
      }
    });

    it('paints an irregular sparse selection of cells', () => {
      const sparseCells = { '1,1': true, '3,5': true, '7,2': true };
      const res = paintSparseCells({
        map,
        layerIdx: 0,
        cells: sparseCells,
        tileId: 99,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.cells).toHaveLength(3);
        expect(map.tileLayers![0].grid![1][1]).toBe(99);
        expect(map.tileLayers![0].grid![3][5]).toBe(99);
        expect(map.tileLayers![0].grid![7][2]).toBe(99);
        expect(map.tileLayers![0].grid![1][2]).toBe(0);
      }
    });

    it('handles map boundary edges and corners cleanly', () => {
      // Top-left corner
      const resCorner = paintTilesInRegion({
        map,
        layerIdx: 0,
        minR: 0,
        maxR: 1,
        minC: 0,
        maxC: 1,
        tileId: 17,
      });
      expect(resCorner.ok).toBe(true);
      expect(map.tileLayers![0].grid![0][0]).toBe(17);

      // Bottom-right corner (9, 9)
      const resBottomRight = paintTilesInRegion({
        map,
        layerIdx: 0,
        minR: 9,
        maxR: 9,
        minC: 9,
        maxC: 9,
        tileId: 17,
      });
      expect(resBottomRight.ok).toBe(true);
      expect(map.tileLayers![0].grid![9][9]).toBe(17);
    });

    it('safely clamps partially out-of-bounds regions', () => {
      const res = paintTilesInRegion({
        map,
        layerIdx: 0,
        minR: 8,
        maxR: 15, // Out of bounds
        minC: 8,
        maxC: 15, // Out of bounds
        tileId: 17,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        // Only 8..9 x 8..9 should be painted (4 cells)
        expect(res.cells).toHaveLength(4);
        expect(map.tileLayers![0].grid![8][8]).toBe(17);
        expect(map.tileLayers![0].grid![9][9]).toBe(17);
      }
    });
  });

  describe('2. Erase × Selection Matrix', () => {
    it('erases a rectangular region and returns exact erased cells', () => {
      // Setup tiles
      paintTilesInRegion({ map, layerIdx: 0, minR: 2, maxR: 4, minC: 2, maxC: 4, tileId: 50 });
      expect(map.tileLayers![0].grid![2][2]).toBe(50);

      const eraseRes = eraseTilesInRegion({
        map,
        layerIdx: 0,
        minR: 2,
        maxR: 4,
        minC: 2,
        maxC: 4,
      });

      expect(eraseRes.ok).toBe(true);
      if (eraseRes.ok) {
        expect(eraseRes.cells).toHaveLength(9);
        expect(map.tileLayers![0].grid![2][2]).toBe(0);
        expect(map.tileLayers![0].grid![4][4]).toBe(0);
      }
    });

    it('erases sparse cells on the logic layer', () => {
      paintSparseCells({ map, layerIdx: -1, cells: { '2,2': true, '4,4': true }, tileId: 1 });
      expect(map.grid![2][2]).toBe(1);

      const eraseRes = eraseSparseCells({
        map,
        layerIdx: -1,
        cells: { '2,2': true, '4,4': true },
      });

      expect(eraseRes.ok).toBe(true);
      if (eraseRes.ok) {
        expect(eraseRes.cells).toHaveLength(2);
        expect(map.grid![2][2]).toBe(0);
        expect(map.grid![4][4]).toBe(0);
      }
    });
  });

  describe('3. Copy / Cut / Paste × Selection Matrix', () => {
    it('extracts rectangular clipboard and pastes to offset destination', () => {
      // Paint 2x2 stamp at (1, 1)
      paintTilesInRegion({ map, layerIdx: 0, minR: 1, maxR: 2, minC: 1, maxC: 2, tileId: 25 });

      const clip = extractSubgridFromMap({
        map,
        minR: 1,
        maxR: 2,
        minC: 1,
        maxC: 2,
        activeLayerIdx: 0,
      });

      expect(clip).not.toBeNull();
      expect(clip!.width).toBe(2);
      expect(clip!.height).toBe(2);
      expect(clip!.visualData).toHaveLength(4);

      // Paste at (5, 5)
      const stampRes = stampClipboardOntoMap({
        map,
        clipboard: clip!,
        targetR: 5,
        targetC: 5,
        mode: 'overlay',
        activeLayerIdx: 0,
      });

      expect(stampRes.ok).toBe(true);
      expect(stampRes.cells).toHaveLength(4);
      expect(map.tileLayers![0].grid![5][5]).toBe(25);
      expect(map.tileLayers![0].grid![6][6]).toBe(25);
    });

    it('extracts sparse clipboard with relative coordinates normalized', () => {
      paintSparseCells({ map, layerIdx: 0, cells: { '3,3': true, '5,7': true }, tileId: 77 });

      const clip = extractSparseCellsFromMap({
        map,
        cells: { '3,3': true, '5,7': true },
        activeLayerIdx: 0,
      });

      expect(clip).not.toBeNull();
      expect(clip!.sourceOrigin).toEqual({ r: 3, c: 3 });
      expect(clip!.width).toBe(5); // 7 - 3 + 1
      expect(clip!.height).toBe(3); // 5 - 3 + 1
      expect(clip!.visualData).toHaveLength(2);
    });
  });

  describe('4. Transform × Selection Matrix (Rotate / Flip / Duplicate / Move)', () => {
    it('rotates a 2x3 rectangular selection 90° clockwise in-place', () => {
      // Fill (2..3, 2..4) with distinct pattern
      map.tileLayers![0].grid![2][2] = 1;
      map.tileLayers![0].grid![2][3] = 2;
      map.tileLayers![0].grid![2][4] = 3;
      map.tileLayers![0].grid![3][2] = 4;
      map.tileLayers![0].grid![3][3] = 5;
      map.tileLayers![0].grid![3][4] = 6;

      const res = transformSelectionInPlace({
        map,
        layerIdx: 0,
        bounds: { minR: 2, maxR: 3, minC: 2, maxC: 4 },
        transform: { flipH: false, flipV: false, rotation: 90 },
      });

      expect(res.ok).toBe(true);
      expect(res.newBounds).toEqual({ minR: 2, minC: 2, maxR: 4, maxC: 3, width: 2, height: 3 });
      // 90° CW rotates 2x3 into 3x2
      // Top row becomes [4, 1]
      expect(map.tileLayers![0].grid![2][2]).toBe(4);
      expect(map.tileLayers![0].grid![2][3]).toBe(1);
    });

    it('flips a selection horizontally in-place', () => {
      map.tileLayers![0].grid![1][1] = 10;
      map.tileLayers![0].grid![1][2] = 20;

      const res = transformSelectionInPlace({
        map,
        layerIdx: 0,
        bounds: { minR: 1, maxR: 1, minC: 1, maxC: 2 },
        transform: { flipH: true, flipV: false, rotation: 0 },
      });

      expect(res.ok).toBe(true);
      expect(map.tileLayers![0].grid![1][1]).toBe(20);
      expect(map.tileLayers![0].grid![1][2]).toBe(10);
    });

    it('duplicates a selection with an offset destination', () => {
      map.tileLayers![0].grid![1][1] = 88;

      const res = duplicateSelectionOnMap({
        map,
        layerIdx: 0,
        cells: { '1,1': true },
        offsetR: 2,
        offsetC: 3,
      });

      expect(res.ok).toBe(true);
      expect(map.tileLayers![0].grid![1][1]).toBe(88); // Original intact
      expect(map.tileLayers![0].grid![3][4]).toBe(88); // Cloned
      expect(res.newBounds).toEqual({ minR: 3, minC: 4, maxR: 3, maxC: 4, width: 1, height: 1 });
    });

    it('moves a selection to a new offset destination in-place', () => {
      map.tileLayers![0].grid![2][2] = 99;

      const res = moveSelectionOnMap({
        map,
        layerIdx: 0,
        cells: { '2,2': true },
        offsetR: 1,
        offsetC: 1,
      });

      expect(res.ok).toBe(true);
      expect(map.tileLayers![0].grid![2][2]).toBe(0); // Erased from source
      expect(map.tileLayers![0].grid![3][3]).toBe(99); // Moved to destination
    });
  });

  describe('5. Undo / Redo Single-Operation Integrity', () => {
    it('reverses an entire selection paint as ONE atomic undo op', () => {
      let stack = emptyEditorOpStack();

      // Paint 3x3 selection
      const paintRes = paintTilesInRegion({
        map,
        layerIdx: 0,
        minR: 1,
        maxR: 3,
        minC: 1,
        maxC: 3,
        tileId: 100,
      });

      expect(paintRes.ok).toBe(true);
      if (!paintRes.ok) return;
      stack = pushEditorOp(stack, { kind: 'paint_cells', cells: paintRes.cells });

      expect(map.tileLayers![0].grid![1][1]).toBe(100);
      expect(map.tileLayers![0].grid![3][3]).toBe(100);

      // Single Undo
      const undoRes = undoEditorOp(map, stack);
      expect(undoRes.op).not.toBeNull();
      expect(undoRes.op?.kind).toBe('paint_cells');
      expect(map.tileLayers![0].grid![1][1]).toBe(0);
      expect(map.tileLayers![0].grid![3][3]).toBe(0);

      // Single Redo
      const redoRes = redoEditorOp(map, undoRes.stack);
      expect(redoRes.op).not.toBeNull();
      expect(map.tileLayers![0].grid![1][1]).toBe(100);
      expect(map.tileLayers![0].grid![3][3]).toBe(100);
    });

    it('reverses an in-place selection transform atomically', () => {
      let stack = emptyEditorOpStack();

      map.tileLayers![0].grid![1][1] = 1;
      map.tileLayers![0].grid![1][2] = 2;

      const transRes = transformSelectionInPlace({
        map,
        layerIdx: 0,
        bounds: { minR: 1, maxR: 1, minC: 1, maxC: 2 },
        transform: { flipH: true, flipV: false, rotation: 0 },
      });

      expect(transRes.ok).toBe(true);
      stack = pushEditorOp(stack, { kind: 'paint_cells', cells: transRes.cells });

      expect(map.tileLayers![0].grid![1][1]).toBe(2);
      expect(map.tileLayers![0].grid![1][2]).toBe(1);

      // Undo flip
      const undoRes = undoEditorOp(map, stack);
      expect(map.tileLayers![0].grid![1][1]).toBe(1);
      expect(map.tileLayers![0].grid![1][2]).toBe(2);
    });
  });
});
