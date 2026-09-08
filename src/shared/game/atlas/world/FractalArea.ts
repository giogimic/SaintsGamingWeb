import { 
  VOXEL_MAT_GRASS, VOXEL_MAT_DIRT, VOXEL_MAT_STONE, VOXEL_MAT_GUNMETAL, VOXEL_MAT_SAND, VOXEL_MAT_SNOW, VOXEL_MAT_WOOD, VOXEL_MAT_FOLIAGE_FLOWER, VOXEL_MAT_WATER
} from '../../voxel/VoxelWord';

export interface AreaClimateRules {
  minTemp: number; // 0.0 to 1.0
  maxTemp: number; // 0.0 to 1.0
  minMoisture: number; // 0.0 to 1.0
  maxMoisture: number; // 0.0 to 1.0
  minElevation: number; // 0.0 to 1.0
  maxElevation: number; // 0.0 to 1.0
}

export interface AreaTerrainModifiers {
  heightOffset: number;
  heightMultiplier: number;
  ruggednessMultiplier: number;
}

export interface AreaStrata {
  surfaceMaterial: number;
  subsurfaceMaterial: number;
  subsurfaceDepth: number;
  mantleMaterial: number;
  bedrockMaterial: number;
}

export interface DecoratorRule {
  material: number;
  /** Spawn probability per valid block (0.0 to 1.0) */
  probability: number;
  /** Number of blocks to stack vertically (e.g. for a tree trunk) */
  stackHeight?: number;
}

export interface AreaDecorators {
  surfaceFlora: DecoratorRule[];
  subsurfaceOres: DecoratorRule[];
}

export interface FractalArea {
  id: string;
  name: string;
  description: string;
  climateRules: AreaClimateRules;
  terrainModifiers: AreaTerrainModifiers;
  strata: AreaStrata;
  decorators?: AreaDecorators;
}

export const CANONICAL_FRACTAL_AREAS: FractalArea[] = [
  {
    id: 'area_emerald_plains',
    name: 'Emerald Plains Area',
    description: 'Gentle, warm, and moderate moisture regions.',
    climateRules: {
      minTemp: 0.3, maxTemp: 0.8,
      minMoisture: 0.4, maxMoisture: 0.8,
      minElevation: 0.1, maxElevation: 0.6,
    },
    terrainModifiers: {
      heightOffset: 0.0, heightMultiplier: 1.0, ruggednessMultiplier: 0.2,
    },
    strata: {
      surfaceMaterial: VOXEL_MAT_GRASS,
      subsurfaceMaterial: VOXEL_MAT_DIRT,
      subsurfaceDepth: 3,
      mantleMaterial: VOXEL_MAT_STONE,
      bedrockMaterial: VOXEL_MAT_GUNMETAL,
    },
    decorators: {
      surfaceFlora: [
        { material: VOXEL_MAT_WOOD, probability: 0.02, stackHeight: 4 }, // Trees
        { material: VOXEL_MAT_FOLIAGE_FLOWER, probability: 0.05, stackHeight: 1 }, // Flowers
      ],
      subsurfaceOres: [
        { material: VOXEL_MAT_DIRT, probability: 0.05 }, // Pockets of dirt in the mantle
      ]
    }
  },
  {
    id: 'area_golden_dunes',
    name: 'Golden Dunes Area',
    description: 'Hot, arid desert basins.',
    climateRules: {
      minTemp: 0.7, maxTemp: 1.0,
      minMoisture: 0.0, maxMoisture: 0.4,
      minElevation: 0.2, maxElevation: 0.5,
    },
    terrainModifiers: {
      heightOffset: 0.0, heightMultiplier: 1.2, ruggednessMultiplier: 0.5,
    },
    strata: {
      surfaceMaterial: VOXEL_MAT_SAND,
      subsurfaceMaterial: VOXEL_MAT_SAND,
      subsurfaceDepth: 5,
      mantleMaterial: VOXEL_MAT_STONE,
      bedrockMaterial: VOXEL_MAT_GUNMETAL,
    },
    decorators: {
      surfaceFlora: [
        { material: VOXEL_MAT_WOOD, probability: 0.005, stackHeight: 2 }, // Dead bushes / small cactus
      ],
      subsurfaceOres: []
    }
  },
  {
    id: 'area_alpine_range',
    name: 'Alpine Range Area',
    description: 'Cold, highly elevated mountain peaks.',
    climateRules: {
      minTemp: 0.0, maxTemp: 0.4,
      minMoisture: 0.3, maxMoisture: 1.0,
      minElevation: 0.6, maxElevation: 1.0,
    },
    terrainModifiers: {
      heightOffset: 0.2, heightMultiplier: 2.0, ruggednessMultiplier: 1.0,
    },
    strata: {
      surfaceMaterial: VOXEL_MAT_SNOW,
      subsurfaceMaterial: VOXEL_MAT_STONE,
      subsurfaceDepth: 2,
      mantleMaterial: VOXEL_MAT_STONE,
      bedrockMaterial: VOXEL_MAT_GUNMETAL,
    },
    decorators: {
      surfaceFlora: [
        { material: VOXEL_MAT_WOOD, probability: 0.01, stackHeight: 3 }, // Pine trees
      ],
      subsurfaceOres: []
    }
  }
];
