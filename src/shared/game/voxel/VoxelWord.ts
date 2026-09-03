/**
 * Saints Gaming — 32-Bit Compact Voxel Word Data Model
 *
 * Bit Layout:
 * [31..28] LOGIC (4 bits: 0..15)
 * [27..24] PHYSICS (4 bits: 0..15)
 * [23..20] AO / TINT (4 bits: 0..15)
 * [19..17] ORIENTATION (3 bits: 0..7)
 * [16..12] SHAPE_ID (5 bits: 0..31)
 * [11..0]  MATERIAL_ID (12 bits: 0..4095)
 */

export const VoxelShape = {
  AIR: 0,
  FULL_CUBE: 1,
  SLOPE_45: 2,
  SLOPE_GENTLE_BASE: 3,
  SLOPE_GENTLE_TOP: 4,
  SLOPE_CORNER_OUTER: 5,
  SLOPE_CORNER_INNER: 6,
  SLAB_BOTTOM: 7,
  SLAB_TOP: 8,
  STAIRS_STRAIGHT: 9,
  STAIRS_CORNER: 10,
  PRISM_DIAGONAL: 11,
  COLUMN_CENTER: 12,
  FENCE_RAIL: 13,
  ADAPTIVE_ALPHA: 14,
} as const;

export type VoxelShapeType = (typeof VoxelShape)[keyof typeof VoxelShape];

export const VoxelOrientation = {
  NORTH: 0, // 0 deg
  EAST: 1,  // 90 deg
  SOUTH: 2, // 180 deg
  WEST: 3,  // 270 deg
  INVERTED_NORTH: 4,
  INVERTED_EAST: 5,
  INVERTED_SOUTH: 6,
  INVERTED_WEST: 7,
} as const;

export type VoxelOrientationType = (typeof VoxelOrientation)[keyof typeof VoxelOrientation];

export const VoxelPhysics = {
  PASS_THROUGH: 0,
  SOLID_OBSTACLE: 1,
  WALKABLE_SLOPE: 2,
  SWIMMABLE_FLUID: 3,
  CLIMBABLE: 4,
  HAZARD: 5,
} as const;

export type VoxelPhysicsType = (typeof VoxelPhysics)[keyof typeof VoxelPhysics];

export const VoxelLogic = {
  NONE: 0,
  SPAWN_ANCHOR: 1,
  WARP_GATE: 2,
  HARVEST_NODE: 3,
  SHOP_COUNTER: 4,
  SAFE_ZONE: 5,
  QUEST_TARGET: 6,
} as const;

export type VoxelLogicType = (typeof VoxelLogic)[keyof typeof VoxelLogic];

// Standard Material Constants
export const VOXEL_MAT_AIR = 0;
export const VOXEL_MAT_GUNMETAL = 1;
export const VOXEL_MAT_GRASS = 2;
export const VOXEL_MAT_DIRT = 3;
export const VOXEL_MAT_STONE = 4;
export const VOXEL_MAT_SAND = 5;
export const VOXEL_MAT_WATER = 6;
export const VOXEL_MAT_WOOD = 7;
export const VOXEL_MAT_SNOW = 8;
export const VOXEL_MAT_LAVA = 9;
export const VOXEL_MAT_SWAMP = 10;
export const VOXEL_MAT_DUNGEON = 11;
export const VOXEL_MAT_ICE = 12;

export interface VoxelDecoded {
  materialId: number;
  shapeId: VoxelShapeType;
  orientation: VoxelOrientationType;
  aoTint: number;
  physics: VoxelPhysicsType;
  logic: VoxelLogicType;
}

/** Pack distinct attributes into a 32-bit uint32 word */
export function packVoxel(
  materialId: number,
  shapeId: VoxelShapeType = VoxelShape.FULL_CUBE,
  orientation: VoxelOrientationType = VoxelOrientation.NORTH,
  aoTint: number = 0,
  physics: VoxelPhysicsType = VoxelPhysics.SOLID_OBSTACLE,
  logic: VoxelLogicType = VoxelLogic.NONE
): number {
  const mat = (materialId & 0xfff) >>> 0;
  const shape = ((shapeId & 0x1f) << 12) >>> 0;
  const orient = ((orientation & 0x7) << 17) >>> 0;
  const ao = ((aoTint & 0xf) << 20) >>> 0;
  const phys = ((physics & 0xf) << 24) >>> 0;
  const log = ((logic & 0xf) << 28) >>> 0;

  return (mat | shape | orient | ao | phys | log) >>> 0;
}

/** Extract all fields from a 32-bit uint32 word */
export function unpackVoxel(word: number): VoxelDecoded {
  const uWord = word >>> 0;
  return {
    materialId: (uWord & 0xfff) >>> 0,
    shapeId: ((uWord >>> 12) & 0x1f) as VoxelShapeType,
    orientation: ((uWord >>> 17) & 0x7) as VoxelOrientationType,
    aoTint: (uWord >>> 20) & 0xf,
    physics: ((uWord >>> 24) & 0xf) as VoxelPhysicsType,
    logic: ((uWord >>> 28) & 0xf) as VoxelLogicType,
  };
}

/** Fast extraction helpers */
export function getVoxelMaterial(word: number): number {
  return (word & 0xfff) >>> 0;
}

export function getVoxelShape(word: number): VoxelShapeType {
  return ((word >>> 12) & 0x1f) as VoxelShapeType;
}

export function getVoxelOrientation(word: number): VoxelOrientationType {
  return ((word >>> 17) & 0x7) as VoxelOrientationType;
}

export function getVoxelPhysics(word: number): VoxelPhysicsType {
  return ((word >>> 24) & 0xf) as VoxelPhysicsType;
}

export function getVoxelLogic(word: number): VoxelLogicType {
  return ((word >>> 28) & 0xf) as VoxelLogicType;
}

export function isVoxelSolid(word: number): boolean {
  if (word === 0) return false;
  const shape = getVoxelShape(word);
  if (shape === VoxelShape.AIR) return false;
  const phys = getVoxelPhysics(word);
  return phys === VoxelPhysics.SOLID_OBSTACLE || phys === VoxelPhysics.WALKABLE_SLOPE;
}

export function isVoxelAir(word: number): boolean {
  return (word & 0xfff) === 0 || getVoxelShape(word) === VoxelShape.AIR;
}

/**
 * Checks if a neighboring voxel fully occludes a 1x1 cube face.
 * Only non-air FULL_CUBE shapes provide full face occlusion.
 * Slopes, stairs, slabs, columns, fences, and transparent voxels do NOT fully occlude.
 */
export function isVoxelFaceOccluding(word: number): boolean {
  if (isVoxelAir(word)) return false;
  const shape = getVoxelShape(word);
  return shape === VoxelShape.FULL_CUBE;
}

export const VOXEL_WORD_AIR = packVoxel(VOXEL_MAT_AIR, VoxelShape.AIR, VoxelOrientation.NORTH, 0, VoxelPhysics.PASS_THROUGH, VoxelLogic.NONE);
export const VOXEL_WORD_GUNMETAL = packVoxel(VOXEL_MAT_GUNMETAL, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE, VoxelLogic.NONE);
export const VOXEL_WORD_GRASS = packVoxel(VOXEL_MAT_GRASS, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE, VoxelLogic.NONE);

import { isInGridFootprint, type BrushShape } from '../brushGeometry';

/**
 * Calculates deterministic 2D/3D voxel-space (dx, dz) footprint offsets
 * Brush Size 1 = 1x1 voxel footprint
 * Brush Size 2 = 2x2 voxel footprint
 * Brush Size 3 = 3x3 voxel footprint, etc.
 * Supports shaped footprints (circle, diamond, splat-star, square).
 */
export function getVoxelBrushOffsets(
  brushRadius: number,
  shape: BrushShape = 'square'
): Array<{ dx: number; dz: number }> {
  const rad = Math.max(1, Math.floor(brushRadius));
  const offsets: Array<{ dx: number; dz: number }> = [];
  if (rad === 1) {
    return [{ dx: 0, dz: 0 }];
  }
  const half = Math.floor(rad / 2);
  const isOdd = rad % 2 === 1;
  const minX = isOdd ? -half : 0;
  const maxX = isOdd ? half : rad - 1;
  const minZ = isOdd ? -half : 0;
  const maxZ = isOdd ? half : rad - 1;

  for (let dz = minZ; dz <= maxZ; dz++) {
    for (let dx = minX; dx <= maxX; dx++) {
      if (shape === 'square' || isInGridFootprint(dz, dx, half, shape)) {
        offsets.push({ dx, dz });
      }
    }
  }
  return offsets.length > 0 ? offsets : [{ dx: 0, dz: 0 }];
}

export type VoxelBrushAxis = 'xz' | 'xy' | 'yz';

/**
 * Calculates deterministic 3D voxel-space (dx, dy, dz) footprint offsets
 * allowing horizontal ground painting (xz plane) or vertical wall building (xy or yz planes).
 */
export function getVoxelBrushOffsets3D(
  brushRadius: number,
  axis: VoxelBrushAxis = 'xz',
  shape: BrushShape = 'square'
): Array<{ dx: number; dy: number; dz: number }> {
  const planar = getVoxelBrushOffsets(brushRadius, shape);
  switch (axis) {
    case 'xy': // Vertical wall along X axis (dx, dy)
      return planar.map(({ dx, dz }) => ({ dx, dy: dz, dz: 0 }));
    case 'yz': // Vertical wall along Z axis (dy, dz)
      return planar.map(({ dx, dz }) => ({ dx: 0, dy: dx, dz }));
    case 'xz': // Horizontal ground plane (dx, dz)
    default:
      return planar.map(({ dx, dz }) => ({ dx, dy: 0, dz }));
  }
}

export interface VoxelConstraintOptions {
  centerCoord: { wx: number; wy: number; wz: number };
  brushRadius: number;
  brushShape?: BrushShape;
  brushAxis?: VoxelBrushAxis;
  planeLockEnabled?: boolean;
  targetPlaneY?: number;
  planeMask?: number[] | null;
  buildUpMode?: boolean;
  mapWidth: number;
  mapHeight: number;
  maxElevation?: number;
}

/**
 * Authoritative Studio Editing Constraint Resolver.
 * Filters and clamps voxel operations to enforce:
 * 1. Hard map boundaries [0..mapWidth-1, 0..mapHeight-1]
 * 2. Vertical elevation limits [0..maxElevation-1]
 * 3. Layer / Plane Lock (strictly pins operations to targetPlaneY)
 * 4. Multi-plane mask filtering (restricts edits to specified planes)
 * 5. Build Up Mode (stacks voxels vertically atop hit surfaces)
 */
export function resolveConstrainedVoxelCoordinates(
  options: VoxelConstraintOptions
): Array<{ wx: number; wy: number; wz: number }> {
  const {
    centerCoord,
    brushRadius,
    brushShape = 'square',
    brushAxis = 'xz',
    planeLockEnabled = false,
    targetPlaneY = 0,
    planeMask = null,
    buildUpMode = false,
    mapWidth,
    mapHeight,
    maxElevation = 32,
  } = options;

  const offsets = getVoxelBrushOffsets3D(brushRadius, brushAxis, brushShape);
  const result: Array<{ wx: number; wy: number; wz: number }> = [];

  for (const { dx, dy, dz } of offsets) {
    const wx = centerCoord.wx + dx;
    let wy = centerCoord.wy + dy;
    const wz = centerCoord.wz + dz;

    // 1. Build Up Mode: places directly atop hit surface
    if (buildUpMode) {
      wy = centerCoord.wy + 1 + dy;
    } else if (planeLockEnabled && brushAxis === 'xz') {
      // 2. Plane Lock: strictly constrain horizontal painting to targetPlaneY
      wy = targetPlaneY;
    }

    // 3. Plane Mask filtering: if specific planes are whitelisted, ensure wy is in mask
    if (planeMask && planeMask.length > 0 && !planeMask.includes(wy)) {
      continue;
    }

    // 4. Hard Map Boundaries: strictly forbid out-of-bounds painting or spilling over
    if (wx < 0 || wx >= mapWidth || wz < 0 || wz >= mapHeight || wy < 0 || wy >= maxElevation) {
      continue;
    }

    result.push({ wx, wy, wz });
  }

  return result;
}
