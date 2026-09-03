import { describe, it, expect } from 'vitest';
import {
  getVoxelBrushOffsets,
  getVoxelBrushOffsets3D,
  resolveConstrainedVoxelCoordinates,
} from './VoxelWord';

describe('Voxel Editing Constraints & Footprint Resolver', () => {
  describe('getVoxelBrushOffsets with Shapes', () => {
    it('returns single offset for radius 1 regardless of shape', () => {
      expect(getVoxelBrushOffsets(1, 'square')).toEqual([{ dx: 0, dz: 0 }]);
      expect(getVoxelBrushOffsets(1, 'circle')).toEqual([{ dx: 0, dz: 0 }]);
      expect(getVoxelBrushOffsets(1, 'diamond')).toEqual([{ dx: 0, dz: 0 }]);
    });

    it('returns full bounding box for square shape', () => {
      const offsets = getVoxelBrushOffsets(3, 'square');
      expect(offsets).toHaveLength(9); // 3x3 = 9
    });

    it('filters offsets for diamond shape', () => {
      const squareOffsets = getVoxelBrushOffsets(3, 'square');
      const diamondOffsets = getVoxelBrushOffsets(3, 'diamond');
      expect(diamondOffsets.length).toBeLessThan(squareOffsets.length);
      // Center and 4 cardinal neighbors
      expect(diamondOffsets).toContainEqual({ dx: 0, dz: 0 });
      expect(diamondOffsets).toContainEqual({ dx: 1, dz: 0 });
      expect(diamondOffsets).toContainEqual({ dx: -1, dz: 0 });
      expect(diamondOffsets).toContainEqual({ dx: 0, dz: 1 });
      expect(diamondOffsets).toContainEqual({ dx: 0, dz: -1 });
      // Corners should be excluded in diamond of half-radius 1
      expect(diamondOffsets).not.toContainEqual({ dx: 1, dz: 1 });
    });
  });

  describe('resolveConstrainedVoxelCoordinates', () => {
    const defaultParams = {
      centerCoord: { wx: 10, wy: 2, wz: 10 },
      brushRadius: 1,
      brushShape: 'square' as const,
      brushAxis: 'xz' as const,
      mapWidth: 20,
      mapHeight: 20,
      maxElevation: 32,
    };

    it('enforces Layer/Plane Lock when enabled', () => {
      const result = resolveConstrainedVoxelCoordinates({
        ...defaultParams,
        centerCoord: { wx: 10, wy: 5, wz: 10 },
        planeLockEnabled: true,
        targetPlaneY: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].wy).toBe(0); // Pinned to targetPlaneY=0 instead of hit surface wy=5
    });

    it('allows natural surface elevation when Layer/Plane Lock is disabled', () => {
      const result = resolveConstrainedVoxelCoordinates({
        ...defaultParams,
        centerCoord: { wx: 10, wy: 5, wz: 10 },
        planeLockEnabled: false,
        targetPlaneY: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].wy).toBe(5); // Retains surface elevation
    });

    it('enforces Build Up Mode (vertical stacking atop hit surface)', () => {
      const result = resolveConstrainedVoxelCoordinates({
        ...defaultParams,
        centerCoord: { wx: 10, wy: 3, wz: 10 },
        buildUpMode: true,
        planeLockEnabled: true, // Build Up overrides horizontal plane lock
        targetPlaneY: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].wy).toBe(4); // 3 + 1 = 4
    });

    it('strictly clips to hard map boundaries', () => {
      // Center at map corner (0, 0) with 3x3 brush radius
      const result = resolveConstrainedVoxelCoordinates({
        ...defaultParams,
        centerCoord: { wx: 0, wy: 0, wz: 0 },
        brushRadius: 3, // extends from dx=-1..1, dz=-1..1
        mapWidth: 10,
        mapHeight: 10,
      });

      // All returned coordinates must be strictly within bounds [0..9, 0..9]
      for (const coord of result) {
        expect(coord.wx).toBeGreaterThanOrEqual(0);
        expect(coord.wx).toBeLessThan(10);
        expect(coord.wz).toBeGreaterThanOrEqual(0);
        expect(coord.wz).toBeLessThan(10);
      }

      // Negative coordinates should have been clipped out
      expect(result.some((c) => c.wx < 0 || c.wz < 0)).toBe(false);
    });

    it('filters edits by multi-plane mask', () => {
      // Whitelist only planes 0 and 2
      const resultAllowed = resolveConstrainedVoxelCoordinates({
        ...defaultParams,
        centerCoord: { wx: 10, wy: 2, wz: 10 },
        planeMask: [0, 2],
      });
      expect(resultAllowed).toHaveLength(1);
      expect(resultAllowed[0].wy).toBe(2);

      // Point at plane 1 (which is not in mask)
      const resultBlocked = resolveConstrainedVoxelCoordinates({
        ...defaultParams,
        centerCoord: { wx: 10, wy: 1, wz: 10 },
        planeMask: [0, 2],
      });
      expect(resultBlocked).toHaveLength(0); // Blocked by mask!
    });
  });
});
