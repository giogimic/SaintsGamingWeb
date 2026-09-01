import { describe, it, expect } from 'vitest';
import {
  ContinuousGeometry,
  getGeometryBoundingBox,
  isPointInGeometry,
  rasterizeGeometryToCells,
  getRegularPolygonVertices,
  getStarVertices,
  translateGeometry,
} from './continuousGeometry';

describe('Continuous Geometry Model', () => {
  it('correctly calculates bounding boxes for continuous circles and rectangles', () => {
    const circle: ContinuousGeometry = { type: 'circle', centerX: 10, centerZ: 10, radius: 5 };
    const circleBBox = getGeometryBoundingBox(circle);
    expect(circleBBox).toEqual({
      minX: 5,
      minZ: 5,
      maxX: 15,
      maxZ: 15,
      width: 10,
      height: 10,
      centerX: 10,
      centerZ: 10,
    });

    const rect: ContinuousGeometry = { type: 'rectangle', minX: 2, minZ: 3, maxX: 8, maxZ: 7 };
    const rectBBox = getGeometryBoundingBox(rect);
    expect(rectBBox).toEqual({
      minX: 2,
      minZ: 3,
      maxX: 8,
      maxZ: 7,
      width: 6,
      height: 4,
      centerX: 5,
      centerZ: 5,
    });
  });

  it('accurately tests points inside mathematical circle and ellipse', () => {
    const circle: ContinuousGeometry = { type: 'circle', centerX: 0, centerZ: 0, radius: 2 };
    expect(isPointInGeometry(0, 0, circle)).toBe(true);
    expect(isPointInGeometry(1.4, 1.4, circle)).toBe(true); // 1.4^2 + 1.4^2 = 3.92 <= 4
    expect(isPointInGeometry(1.5, 1.5, circle)).toBe(false); // 1.5^2 + 1.5^2 = 4.5 > 4

    const ellipse: ContinuousGeometry = { type: 'ellipse', centerX: 0, centerZ: 0, radiusX: 4, radiusZ: 2 };
    expect(isPointInGeometry(3.5, 0, ellipse)).toBe(true);
    expect(isPointInGeometry(0, 1.9, ellipse)).toBe(true);
    expect(isPointInGeometry(0, 2.1, ellipse)).toBe(false);
  });

  it('correctly tests points inside regular polygons (hexagons, diamonds)', () => {
    const hexagon: ContinuousGeometry = {
      type: 'regularPolygon',
      centerX: 0,
      centerZ: 0,
      radius: 4,
      sides: 6,
    };
    expect(isPointInGeometry(0, 0, hexagon)).toBe(true);
    expect(isPointInGeometry(0, 3.5, hexagon)).toBe(true);
    expect(isPointInGeometry(0, 4.5, hexagon)).toBe(false);
  });

  it('rasterizes continuous circle geometry against discrete grid cells', () => {
    const circle: ContinuousGeometry = { type: 'circle', centerX: 2.5, centerZ: 2.5, radius: 1.5 };
    const cells = rasterizeGeometryToCells(circle, { width: 10, height: 10 }, 1);
    // Center cell (2, 2) center is (2.5, 2.5), distance is 0 <= 1.5 -> in
    expect(cells.some((c) => c.r === 2 && c.c === 2)).toBe(true);
    // Orthogonal neighbors (1, 2), (3, 2), (2, 1), (2, 3) centers are distance 1.0 <= 1.5 -> in
    expect(cells.some((c) => c.r === 1 && c.c === 2)).toBe(true);
    expect(cells.some((c) => c.r === 3 && c.c === 2)).toBe(true);
    expect(cells.some((c) => c.r === 2 && c.c === 1)).toBe(true);
    expect(cells.some((c) => c.r === 2 && c.c === 3)).toBe(true);
    // Diagonal neighbors (1, 1), (3, 3) distance is sqrt(2) = 1.414 <= 1.5 -> in
    expect(cells.some((c) => c.r === 1 && c.c === 1)).toBe(true);
    // Far cells (0, 0) center is (0.5, 0.5), distance is sqrt(8) = 2.828 > 1.5 -> out
    expect(cells.some((c) => c.r === 0 && c.c === 0)).toBe(false);
  });

  it('translates continuous geometry correctly', () => {
    const circle: ContinuousGeometry = { type: 'circle', centerX: 5, centerZ: 5, radius: 3 };
    const translated = translateGeometry(circle, 2, -1);
    expect(translated).toEqual({ type: 'circle', centerX: 7, centerZ: 4, radius: 3 });
  });
});
