import { 
  VoxelPhysics, 
  VoxelPhysicsType, 
  VoxelShapeType,
  VOXEL_MAT_AIR,
  VOXEL_MAT_GUNMETAL,
  VOXEL_MAT_GRASS,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_STONE,
  VOXEL_MAT_SAND,
  VOXEL_MAT_WATER,
  VOXEL_MAT_WOOD,
  VOXEL_MAT_SNOW,
  VOXEL_MAT_LAVA,
  VOXEL_MAT_SWAMP,
  VOXEL_MAT_DUNGEON,
  VOXEL_MAT_ICE
} from './VoxelWord';

export type UvRect = [number, number, number, number]; // [uMin, vMin, uMax, vMax]

export interface VoxelFaceMapping {
  top: UvRect;
  bottom: UvRect;
  north: UvRect;
  south: UvRect;
  east: UvRect;
  west: UvRect;
  side?: UvRect; // Helper fallback for all 4 horizontal sides
}

export type VoxelTerrainCategory = 
  | 'GRASS' 
  | 'DIRT' 
  | 'STONE' 
  | 'SAND' 
  | 'WATER' 
  | 'WOOD' 
  | 'SNOW' 
  | 'METAL' 
  | 'LAVA'
  | 'SWAMP'
  | 'DUNGEON'
  | 'ICE';

export interface VoxelMaterialDefinition {
  id: number;
  slug: string;
  name: string;
  textureSource: string;
  colorHex: string;
  tintRgba: [number, number, number, number];
  faceMapping: VoxelFaceMapping;
  physics: VoxelPhysicsType;
  terrainCategory: VoxelTerrainCategory;
  shapeCompatibility?: VoxelShapeType[];
  roughness?: number;
  metallic?: number;
  isTransparent?: boolean;
}

export const CANONICAL_VOXEL_TEXTURE = '/game-assets/tilesets/terrain-overworld.png';

// UV Regions for the clean terrain atlas
const UV_GRASS_TOP: UvRect = [0, 0.667, 0.333, 1.0];
const UV_GRASS_SIDE: UvRect = [0, 0.667, 0.333, 1.0];
const UV_DIRT: UvRect = [0.333, 0.667, 0.667, 1.0];
const UV_SAND: UvRect = [0.667, 0.667, 1.0, 1.0];
const UV_SNOW: UvRect = [0, 0.333, 0.333, 0.667];
const UV_WATER: UvRect = [0.333, 0.333, 0.667, 0.667];
const UV_STONE: UvRect = [0, 0, 0.333, 0.333];
const UV_WOOD: UvRect = [0.333, 0, 0.667, 0.333];
const UV_GUNMETAL: UvRect = [0, 0, 0.333, 0.333];
const UV_LAVA: UvRect = [0.667, 0.333, 1.0, 0.667];
const UV_SWAMP: UvRect = [0.333, 0, 0.667, 0.333];
const UV_DUNGEON: UvRect = [0, 0, 0.333, 0.333];
const UV_ICE: UvRect = [0, 0.333, 0.333, 0.667];

export const VOXEL_MATERIAL_CATALOG: Record<number, VoxelMaterialDefinition> = {
  [VOXEL_MAT_AIR]: {
    id: VOXEL_MAT_AIR,
    slug: 'air',
    name: 'Air',
    textureSource: '',
    colorHex: '#000000',
    tintRgba: [0, 0, 0, 0],
    faceMapping: {
      top: [0, 0, 0, 0],
      bottom: [0, 0, 0, 0],
      north: [0, 0, 0, 0],
      south: [0, 0, 0, 0],
      east: [0, 0, 0, 0],
      west: [0, 0, 0, 0],
    },
    physics: VoxelPhysics.PASS_THROUGH,
    terrainCategory: 'DIRT',
    isTransparent: true,
  },

  [VOXEL_MAT_GUNMETAL]: {
    id: VOXEL_MAT_GUNMETAL,
    slug: 'gunmetal_base',
    name: 'Gunmetal Base Foundation',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#2a2d34',
    tintRgba: [0.165, 0.176, 0.204, 1.0],
    faceMapping: {
      top: UV_GUNMETAL,
      bottom: UV_GUNMETAL,
      north: UV_GUNMETAL,
      south: UV_GUNMETAL,
      east: UV_GUNMETAL,
      west: UV_GUNMETAL,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'METAL',
    roughness: 0.75,
  },

  // Grass Block: Distinct top (grass), bottom (dirt), and sides (grass/dirt)
  [VOXEL_MAT_GRASS]: {
    id: VOXEL_MAT_GRASS,
    slug: 'lush_grass',
    name: 'Lush Meadow Grass Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#22c55e',
    tintRgba: [0.133, 0.773, 0.369, 1.0],
    faceMapping: {
      top: UV_GRASS_TOP,
      bottom: UV_DIRT,
      north: UV_GRASS_SIDE,
      south: UV_GRASS_SIDE,
      east: UV_GRASS_SIDE,
      west: UV_GRASS_SIDE,
      side: UV_GRASS_SIDE,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'GRASS',
    roughness: 0.8,
  },

  [VOXEL_MAT_DIRT]: {
    id: VOXEL_MAT_DIRT,
    slug: 'rich_dirt',
    name: 'Rich Loam Dirt Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#a16207',
    tintRgba: [0.631, 0.384, 0.027, 1.0],
    faceMapping: {
      top: UV_DIRT,
      bottom: UV_DIRT,
      north: UV_DIRT,
      south: UV_DIRT,
      east: UV_DIRT,
      west: UV_DIRT,
      side: UV_DIRT,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'DIRT',
    roughness: 0.9,
  },

  [VOXEL_MAT_STONE]: {
    id: VOXEL_MAT_STONE,
    slug: 'cliff_stone',
    name: 'Cliff Cobblestone Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#94a3b8',
    tintRgba: [0.580, 0.639, 0.722, 1.0],
    faceMapping: {
      top: UV_STONE,
      bottom: UV_STONE,
      north: UV_STONE,
      south: UV_STONE,
      east: UV_STONE,
      west: UV_STONE,
      side: UV_STONE,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'STONE',
    roughness: 0.6,
  },

  [VOXEL_MAT_SAND]: {
    id: VOXEL_MAT_SAND,
    slug: 'dune_sand',
    name: 'Golden Desert Sand Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#eab308',
    tintRgba: [0.918, 0.702, 0.031, 1.0],
    faceMapping: {
      top: UV_SAND,
      bottom: UV_SAND,
      north: UV_SAND,
      south: UV_SAND,
      east: UV_SAND,
      west: UV_SAND,
      side: UV_SAND,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'SAND',
    roughness: 0.85,
  },

  [VOXEL_MAT_WATER]: {
    id: VOXEL_MAT_WATER,
    slug: 'crystal_water',
    name: 'Crystal River Water',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#38bdf8',
    tintRgba: [0.220, 0.741, 0.973, 0.85],
    faceMapping: {
      top: UV_WATER,
      bottom: UV_WATER,
      north: UV_WATER,
      south: UV_WATER,
      east: UV_WATER,
      west: UV_WATER,
      side: UV_WATER,
    },
    physics: VoxelPhysics.SWIMMABLE_FLUID,
    terrainCategory: 'WATER',
    isTransparent: true,
    roughness: 0.1,
  },

  [VOXEL_MAT_WOOD]: {
    id: VOXEL_MAT_WOOD,
    slug: 'oak_wood',
    name: 'Rustic Wood Plank Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#78350f',
    tintRgba: [0.471, 0.208, 0.059, 1.0],
    faceMapping: {
      top: UV_WOOD,
      bottom: UV_WOOD,
      north: UV_WOOD,
      south: UV_WOOD,
      east: UV_WOOD,
      west: UV_WOOD,
      side: UV_WOOD,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'WOOD',
    roughness: 0.7,
  },

  [VOXEL_MAT_SNOW]: {
    id: VOXEL_MAT_SNOW,
    slug: 'alpine_snow',
    name: 'Alpine Powder Snow Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#e2e8f0',
    tintRgba: [0.886, 0.910, 0.941, 1.0],
    faceMapping: {
      top: UV_SNOW,
      bottom: UV_SNOW,
      north: UV_SNOW,
      south: UV_SNOW,
      east: UV_SNOW,
      west: UV_SNOW,
      side: UV_SNOW,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'SNOW',
    roughness: 0.4,
  },

  [VOXEL_MAT_LAVA]: {
    id: VOXEL_MAT_LAVA,
    slug: 'molten_lava',
    name: 'Molten Magma Flow Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#ef4444',
    tintRgba: [0.937, 0.267, 0.267, 1.0],
    faceMapping: {
      top: UV_LAVA,
      bottom: UV_LAVA,
      north: UV_LAVA,
      south: UV_LAVA,
      east: UV_LAVA,
      west: UV_LAVA,
      side: UV_LAVA,
    },
    physics: VoxelPhysics.HAZARD,
    terrainCategory: 'LAVA',
    roughness: 0.2,
  },

  [VOXEL_MAT_SWAMP]: {
    id: VOXEL_MAT_SWAMP,
    slug: 'murky_swamp',
    name: 'Dark Murky Marsh Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#3f6212',
    tintRgba: [0.247, 0.384, 0.071, 1.0],
    faceMapping: {
      top: UV_SWAMP,
      bottom: UV_SWAMP,
      north: UV_SWAMP,
      south: UV_SWAMP,
      east: UV_SWAMP,
      west: UV_SWAMP,
      side: UV_SWAMP,
    },
    physics: VoxelPhysics.SWIMMABLE_FLUID,
    terrainCategory: 'SWAMP',
    roughness: 0.8,
  },

  [VOXEL_MAT_DUNGEON]: {
    id: VOXEL_MAT_DUNGEON,
    slug: 'ancient_dungeon',
    name: 'Ancient Flagstone Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#475569',
    tintRgba: [0.278, 0.333, 0.412, 1.0],
    faceMapping: {
      top: UV_DUNGEON,
      bottom: UV_DUNGEON,
      north: UV_DUNGEON,
      south: UV_DUNGEON,
      east: UV_DUNGEON,
      west: UV_DUNGEON,
      side: UV_DUNGEON,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'DUNGEON',
    roughness: 0.5,
  },

  [VOXEL_MAT_ICE]: {
    id: VOXEL_MAT_ICE,
    slug: 'glacial_ice',
    name: 'Glacial Blue Ice Block',
    textureSource: CANONICAL_VOXEL_TEXTURE,
    colorHex: '#67e8f9',
    tintRgba: [0.404, 0.910, 0.976, 0.9],
    faceMapping: {
      top: UV_ICE,
      bottom: UV_ICE,
      north: UV_ICE,
      south: UV_ICE,
      east: UV_ICE,
      west: UV_ICE,
      side: UV_ICE,
    },
    physics: VoxelPhysics.SOLID_OBSTACLE,
    terrainCategory: 'ICE',
    isTransparent: true,
    roughness: 0.1,
  },
};

export function getVoxelMaterialDef(materialId: number): VoxelMaterialDefinition {
  return VOXEL_MATERIAL_CATALOG[materialId] || VOXEL_MATERIAL_CATALOG[VOXEL_MAT_GRASS];
}

export function getFaceUv(def: VoxelMaterialDefinition, face: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west'): UvRect {
  return def.faceMapping[face] || def.faceMapping.side || def.faceMapping.top || [0, 0, 1, 1];
}
