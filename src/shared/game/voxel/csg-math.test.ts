import { describe, it, expect } from 'vitest';
import { sphereContains, cylinderContains, boxContains, getSphereBounds, getCylinderBounds, Point3D } from './csg-math';

describe('CSG Math', () => {
  describe('sphereContains', () => {
    it('should include voxels whose center is within the radius', () => {
      const center: Point3D = { x: 5.5, y: 5.5, z: 5.5 };
      const radius = 2.0;
      
      // The voxel at (5, 5, 5) has center (5.5, 5.5, 5.5). Distance = 0.
      expect(sphereContains(5, 5, 5, center, radius)).toBe(true);

      // The voxel at (7, 5, 5) has center (7.5, 5.5, 5.5). Distance = 2.0.
      expect(sphereContains(7, 5, 5, center, radius)).toBe(true);

      // The voxel at (8, 5, 5) has center (8.5, 5.5, 5.5). Distance = 3.0 > 2.0.
      expect(sphereContains(8, 5, 5, center, radius)).toBe(false);
    });
  });

  describe('cylinderContains', () => {
    it('should include voxels whose center is within the vertical cylinder', () => {
      const center: Point3D = { x: 5.5, y: 5.5, z: 5.5 };
      const radius = 2.0;
      const height = 4.0;
      
      // Center
      expect(cylinderContains(5, 5, 5, center, radius, height)).toBe(true);
      
      // Top boundary (y=7, center is 7.5. Max Y bound is 5.5 + 2 = 7.5). Distance = 0 radially.
      expect(cylinderContains(5, 7, 5, center, radius, height)).toBe(true);
      
      // Outside top boundary (y=8, center is 8.5 > 7.5).
      expect(cylinderContains(5, 8, 5, center, radius, height)).toBe(false);

      // Outside radially
      expect(cylinderContains(8, 5, 5, center, radius, height)).toBe(false);
    });
  });

  describe('boxContains', () => {
    it('should correctly include voxels within bounds', () => {
      const bounds = { minX: 1, minY: 1, minZ: 1, maxX: 4, maxY: 4, maxZ: 4 };
      
      // Voxel center (2.5, 2.5, 2.5) -> true
      expect(boxContains(2, 2, 2, bounds)).toBe(true);
      
      // Voxel center (4.5, 2.5, 2.5) -> false (4.5 > 4.0)
      expect(boxContains(4, 2, 2, bounds)).toBe(false);
    });
  });

  describe('getSphereBounds', () => {
    it('should compute conservative integer bounds for iteration', () => {
      const center = { x: 5.5, y: 5.5, z: 5.5 };
      const radius = 2.0;
      const bounds = getSphereBounds(center, radius);
      
      expect(bounds.minX).toBe(3); // floor(3.5)
      expect(bounds.maxX).toBe(7); // floor(7.5)
      expect(bounds.minY).toBe(3);
      expect(bounds.maxY).toBe(7);
      expect(bounds.minZ).toBe(3);
      expect(bounds.maxZ).toBe(7);
    });
  });
});
