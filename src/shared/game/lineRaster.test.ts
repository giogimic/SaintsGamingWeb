import { describe, it, expect } from 'vitest';
import { rasterizeLine } from './lineRaster';

describe('Line Rasterization (Phase 5C)', () => {
  it('returns single point when start and end are identical', () => {
    expect(rasterizeLine(5, 5, 5, 5)).toEqual([{ r: 5, c: 5 }]);
  });

  it('rasterizes horizontal line', () => {
    expect(rasterizeLine(2, 1, 2, 4)).toEqual([
      { r: 2, c: 1 },
      { r: 2, c: 2 },
      { r: 2, c: 3 },
      { r: 2, c: 4 },
    ]);
  });

  it('rasterizes vertical line backwards', () => {
    expect(rasterizeLine(4, 3, 1, 3)).toEqual([
      { r: 4, c: 3 },
      { r: 3, c: 3 },
      { r: 2, c: 3 },
      { r: 1, c: 3 },
    ]);
  });

  it('rasterizes diagonal 45-degree line', () => {
    expect(rasterizeLine(0, 0, 3, 3)).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 1 },
      { r: 2, c: 2 },
      { r: 3, c: 3 },
    ]);
  });

  it('rasterizes line with shallow slope', () => {
    const points = rasterizeLine(0, 0, 1, 4);
    expect(points[0]).toEqual({ r: 0, c: 0 });
    expect(points[points.length - 1]).toEqual({ r: 1, c: 4 });
    expect(points.length).toBe(5);
  });
});
