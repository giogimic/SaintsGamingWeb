import { describe, it, expect } from 'vitest';
import {
  extractSubgridFromMap,
  stampClipboardOntoMap,
  type TileClipboardData,
} from './subgridStamp';
import type { PaintableMap } from './tilePaint';

function createMockMap(): PaintableMap {
  return {
    grid: [
      [1, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    tileLayers: [
      {
        name: 'Ground',
        grid: [
          [10, 11, 0, 0],
          [12, 13, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      },
    ],
    tilesets: [{ firstgid: 1 }],
  };
}

describe('extractSubgridFromMap', () => {
  it('extracts visual and logic subgrid with normalized relative coordinates', () => {
    const map = createMockMap();
    const clip = extractSubgridFromMap({
      map,
      minR: 0,
      maxR: 1,
      minC: 0,
      maxC: 1,
    });

    expect(clip).not.toBeNull();
    if (!clip) return;

    expect(clip.width).toBe(2);
    expect(clip.height).toBe(2);
    expect(clip.sourceOrigin).toEqual({ r: 0, c: 0 });
    expect(clip.visualData).toEqual([
      { layerOffset: 0, r: 0, c: 0, tileId: 10 },
      { layerOffset: 0, r: 0, c: 1, tileId: 11 },
      { layerOffset: 0, r: 1, c: 0, tileId: 12 },
      { layerOffset: 0, r: 1, c: 1, tileId: 13 },
    ]);
    expect(clip.logicData).toEqual([
      { r: 0, c: 0, tileId: 1 },
      { r: 1, c: 1, tileId: 2 },
    ]);
  });

  it('handles reversed coordinates gracefully', () => {
    const map = createMockMap();
    const clip = extractSubgridFromMap({
      map,
      minR: 1,
      maxR: 0,
      minC: 1,
      maxC: 0,
    });
    expect(clip).not.toBeNull();
    expect(clip?.width).toBe(2);
    expect(clip?.height).toBe(2);
  });

  it('returns null if map is invalid', () => {
    expect(extractSubgridFromMap({ map: null, minR: 0, maxR: 1, minC: 0, maxC: 1 })).toBeNull();
  });
});

describe('stampClipboardOntoMap', () => {
  it('stamps in overlay mode to new coordinates', () => {
    const map = createMockMap();
    const clip: TileClipboardData = {
      width: 2,
      height: 2,
      visualData: [
        { layerOffset: 0, r: 0, c: 0, tileId: 99 },
        { layerOffset: 0, r: 1, c: 1, tileId: 98 },
      ],
      logicData: [
        { r: 0, c: 0, tileId: 5 },
      ],
      sourceOrigin: { r: 0, c: 0 },
      activeLayerAtCopy: 0,
    };

    const res = stampClipboardOntoMap({
      map,
      clipboard: clip,
      targetR: 2,
      targetC: 2,
      mode: 'overlay',
      activeLayerIdx: 0,
    });

    expect(res.ok).toBe(true);
    expect(map.tileLayers?.[0].grid?.[2][2]).toBe(99);
    expect(map.tileLayers?.[0].grid?.[3][3]).toBe(98);
    expect(map.grid?.[2][2]).toBe(5);
    expect(res.cells.length).toBe(3);
  });

  it('stamps in new_layer mode by creating a new layer', () => {
    const map = createMockMap();
    const clip: TileClipboardData = {
      width: 1,
      height: 1,
      visualData: [{ layerOffset: 0, r: 0, c: 0, tileId: 77 }],
      logicData: [],
      sourceOrigin: { r: 0, c: 0 },
      activeLayerAtCopy: 0,
    };

    const res = stampClipboardOntoMap({
      map,
      clipboard: clip,
      targetR: 1,
      targetC: 1,
      mode: 'new_layer',
    });

    expect(res.ok).toBe(true);
    expect(res.newLayerCreated).toBe(true);
    expect(map.tileLayers?.length).toBe(2);
    expect(map.tileLayers?.[1].grid?.[1][1]).toBe(77);
  });
});
