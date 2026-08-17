import { describe, it, expect } from 'vitest';
import {
  transformGrid,
  rotateCW,
  rotateCCW,
  flipMatrixH,
  flipMatrixV,
  rotateMatrix90CW,
  transformClipboard,
  DEFAULT_STAMP_TRANSFORM,
} from './stampTransform';

describe('Stamp Transforms (Phase 5A)', () => {
  const sampleGrid = [
    [1, 2, 3],
    [4, 5, 6],
  ];

  it('cycles clockwise and counter-clockwise rotation angles', () => {
    expect(rotateCW(0)).toBe(90);
    expect(rotateCW(90)).toBe(180);
    expect(rotateCW(180)).toBe(270);
    expect(rotateCW(270)).toBe(0);

    expect(rotateCCW(0)).toBe(270);
    expect(rotateCCW(270)).toBe(180);
    expect(rotateCCW(180)).toBe(90);
    expect(rotateCCW(90)).toBe(0);
  });

  it('flips grid horizontally', () => {
    const flipped = flipMatrixH(sampleGrid);
    expect(flipped).toEqual([
      [3, 2, 1],
      [6, 5, 4],
    ]);
  });

  it('flips grid vertically', () => {
    const flipped = flipMatrixV(sampleGrid);
    expect(flipped).toEqual([
      [4, 5, 6],
      [1, 2, 3],
    ]);
  });

  it('rotates grid 90 degrees clockwise', () => {
    const rotated = rotateMatrix90CW(sampleGrid);
    expect(rotated).toEqual([
      [4, 1],
      [5, 2],
      [6, 3],
    ]);
  });

  it('applies compound flip and 180 rotation via transformGrid', () => {
    const res = transformGrid(sampleGrid, {
      flipH: true,
      flipV: false,
      rotation: 180,
    });
    // FlipH: [[3,2,1], [6,5,4]] -> Rot180: [[4,5,6], [1,2,3]]
    expect(res).toEqual([
      [4, 5, 6],
      [1, 2, 3],
    ]);
  });

  it('preserves grid with default transform', () => {
    expect(transformGrid(sampleGrid, DEFAULT_STAMP_TRANSFORM)).toEqual(sampleGrid);
  });

  it('transforms TileClipboardData coordinates and dimensions', () => {
    const clipboard = {
      width: 3,
      height: 2,
      visualData: [
        { layerOffset: 0, r: 0, c: 0, tileId: 10 },
        { layerOffset: 0, r: 1, c: 2, tileId: 20 },
      ],
      logicData: [{ r: 0, c: 0, tileId: 1 }],
      sourceOrigin: { r: 5, c: 5 },
      activeLayerAtCopy: 0,
    };

    // Flip H
    const flippedH = transformClipboard(clipboard, { flipH: true, flipV: false, rotation: 0 });
    expect(flippedH.visualData[0]).toEqual({ layerOffset: 0, r: 0, c: 2, tileId: 10 });
    expect(flippedH.visualData[1]).toEqual({ layerOffset: 0, r: 1, c: 0, tileId: 20 });

    // Rotate 90 CW: new width = 2, new height = 3
    const rot90 = transformClipboard(clipboard, { flipH: false, flipV: false, rotation: 90 });
    expect(rot90.width).toBe(2);
    expect(rot90.height).toBe(3);
    expect(rot90.visualData[0]).toEqual({ layerOffset: 0, r: 0, c: 1, tileId: 10 });
  });
});
