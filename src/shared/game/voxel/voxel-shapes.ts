import { VoxelShapeType, VoxelShape, VoxelOrientationType, VoxelOrientation } from './VoxelWord';

export interface VoxelBoundingBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface VoxelShapeDefinition {
  shapeId: VoxelShapeType;
  /**
   * Returns the walkable surface height (Y offset 0.0 to 1.0) given local X/Z coordinates within the block.
   * If the block cannot be walked on at this coordinate, returns -1.
   * localX and localZ are [0.0, 1.0) relative to the voxel's minimum corner.
   */
  getSurfaceHeight: (orientation: VoxelOrientationType, localX: number, localZ: number) => number;
  
  /**
   * Returns the array of bounding boxes that represent the solid, impassable volume of this shape.
   */
  getCollisionVolumes: (orientation: VoxelOrientationType) => VoxelBoundingBox[];
}

export const VoxelShapeRegistry: Record<number, VoxelShapeDefinition> = {};

// Helper to register shapes
function register(def: VoxelShapeDefinition) {
  VoxelShapeRegistry[def.shapeId] = def;
}

// 0: Air
register({
  shapeId: VoxelShape.AIR,
  getSurfaceHeight: () => -1,
  getCollisionVolumes: () => []
});

// 1: Full Cube
register({
  shapeId: VoxelShape.FULL_CUBE,
  getSurfaceHeight: () => 1.0,
  getCollisionVolumes: () => [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }]
});

// 2: Slope 45
// Rises from Y=0 to Y=1. Orientation defines the downward direction.
register({
  shapeId: VoxelShape.SLOPE_45,
  getSurfaceHeight: (orientation, localX, localZ) => {
    switch (orientation) {
      case VoxelOrientation.NORTH: return 1.0 - localZ; // Rises towards North (-Z)
      case VoxelOrientation.SOUTH: return localZ;       // Rises towards South (+Z)
      case VoxelOrientation.EAST: return 1.0 - localX;
      case VoxelOrientation.WEST: return localX;
      case VoxelOrientation.INVERTED_NORTH: return -1; // Ceiling slope, not walkable on top
      case VoxelOrientation.INVERTED_SOUTH: return -1;
      case VoxelOrientation.INVERTED_EAST: return -1;
      case VoxelOrientation.INVERTED_WEST: return -1;
      default: return 1.0;
    }
  },
  getCollisionVolumes: (orientation) => {
    // Collision for a slope is technically a wedge.
    // For simple AABB approximations, returning the full cube or step-ladders might be needed,
    // but the engine physics should ideally use getSurfaceHeight directly for character feet.
    // For projectiles/walls, we return a full block AABB for now.
    return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];
  }
});

// 7: Slab Bottom (Half height)
register({
  shapeId: VoxelShape.SLAB_BOTTOM,
  getSurfaceHeight: () => 0.5,
  getCollisionVolumes: () => [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 0.5, maxZ: 1 }]
});

// 8: Slab Top
register({
  shapeId: VoxelShape.SLAB_TOP,
  getSurfaceHeight: () => 1.0,
  getCollisionVolumes: () => [{ minX: 0, minY: 0.5, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }]
});

// 9: Stairs Straight
register({
  shapeId: VoxelShape.STAIRS_STRAIGHT,
  getSurfaceHeight: (orientation, localX, localZ) => {
    // Treat stairs as a smooth slope for physics/walkability purposes, or distinct steps?
    // Let's match Go physics: steps!
    switch (orientation) {
      case VoxelOrientation.NORTH: return localZ < 0.5 ? 1.0 : 0.5; // Rises to -Z
      case VoxelOrientation.SOUTH: return localZ > 0.5 ? 1.0 : 0.5; // Rises to +Z
      case VoxelOrientation.EAST: return localX < 0.5 ? 1.0 : 0.5;  // Rises to -X
      case VoxelOrientation.WEST: return localX > 0.5 ? 1.0 : 0.5;  // Rises to +X
      default: return 1.0;
    }
  },
  getCollisionVolumes: (orientation) => {
    return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];
  }
});
