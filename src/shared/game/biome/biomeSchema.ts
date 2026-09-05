/**
 * Saints Gaming — Biome JSON Schema Definition
 *
 * Defines strongly-typed terrain noise parameters, strata material palettes,
 * atmospheric environmental parameters, and hybrid anchor thresholds.
 */

import {
  VOXEL_MAT_GRASS,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_STONE,
  VOXEL_MAT_GUNMETAL,
  VOXEL_MAT_SAND,
  VOXEL_MAT_SNOW,
  VOXEL_MAT_ICE,
  VOXEL_MAT_SWAMP,
} from '../voxel/VoxelWord';

export interface BiomeTerrainConfig {
  baseHeight: number; // Center elevation (0..32, default 16)
  amplitude: number; // Noise amplitude height swing (default 8)
  frequency: number; // Primary noise frequency (default 0.02)
  octaves: number; // Fractal octaves (1..8, default 4)
  persistence: number; // Amplitude decay per octave (default 0.5)
  lacunarity: number; // Frequency multiplier per octave (default 2.0)
}

export interface BiomeStrataConfig {
  surfaceMaterial: number; // Topmost exposed block
  subsurfaceMaterial: number; // Layer immediately below surface
  subsurfaceDepth: number; // Depth in blocks of subsurface layer (default 3)
  mantleMaterial: number; // Core geological bedrock layer
  bedrockMaterial: number; // Unbreakable world foundation
}

export interface BiomeEnvironmentConfig {
  skyColorHex: string; // Background / sky dome color
  sunColorHex: string; // Directional sun/light color
  fogColorHex: string; // Distance fog color
  fogDensity: number; // Fog exponential density (0..0.1)
  gravity: [number, number, number]; // World gravity vector (default [0, -9.81, 0])
}

export interface BiomeAnchorThreshold {
  mapId: string;
  seamThreshold: number; // Blending distance in blocks
  gateCoordinates: Array<{ x: number; y: number; z: number }>;
}

export interface BiomeClimateConfig {
  minTemp: number; // 0.0 to 1.0
  maxTemp: number; // 0.0 to 1.0
  minMoisture: number; // 0.0 to 1.0
  maxMoisture: number; // 0.0 to 1.0
}

export interface BiomeFeaturePool {
  spawnableFlora: Array<{
    featureId: string; // e.g. 'oak_tree', 'cactus', 'boulder'
    weight: number;    // Probability weight (higher = more common)
  }>;
  spawnableEntities: Array<{
    entityId: string; // e.g. 'slime', 'bandit', 'wolf'
    weight: number;
    maxGroupSize: number;
  }>;
}

export interface BiomeDefinition {
  id: string;
  name: string;
  description: string;
  seed: number;
  climate: BiomeClimateConfig;
  terrain: BiomeTerrainConfig;
  strata: BiomeStrataConfig;
  environment: BiomeEnvironmentConfig;
  features: BiomeFeaturePool;
  anchors?: BiomeAnchorThreshold[];
}

export const CANONICAL_BIOMES: Record<string, BiomeDefinition> = {
  emerald_plains: {
    id: 'emerald_plains',
    name: 'Emerald Plains',
    description: 'Gentle rolling hills with vibrant flora and lush topsoil.',
    seed: 42,
    climate: {
      minTemp: 0.3,
      maxTemp: 0.7,
      minMoisture: 0.4,
      maxMoisture: 0.8,
    },
    terrain: {
      baseHeight: 16,
      amplitude: 6,
      frequency: 0.018,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2.0,
    },
    strata: {
      surfaceMaterial: VOXEL_MAT_GRASS,
      subsurfaceMaterial: VOXEL_MAT_DIRT,
      subsurfaceDepth: 3,
      mantleMaterial: VOXEL_MAT_STONE,
      bedrockMaterial: VOXEL_MAT_GUNMETAL,
    },
    environment: {
      skyColorHex: '#081426',
      sunColorHex: '#f59e0b',
      fogColorHex: '#060f1d',
      fogDensity: 0.012,
      gravity: [0, -9.81, 0],
    },
    features: {
      spawnableFlora: [
        { featureId: 'oak_tree', weight: 10 },
        { featureId: 'tall_grass', weight: 50 },
      ],
      spawnableEntities: [
        { entityId: 'slime', weight: 5, maxGroupSize: 3 },
      ],
    },
  },
  golden_dunes: {
    id: 'golden_dunes',
    name: 'Golden Dunes',
    description: 'Sweeping desert dunes with deep sandstone strata.',
    seed: 1337,
    climate: {
      minTemp: 0.7,
      maxTemp: 1.0,
      minMoisture: 0.0,
      maxMoisture: 0.3,
    },
    terrain: {
      baseHeight: 14,
      amplitude: 10,
      frequency: 0.012,
      octaves: 3,
      persistence: 0.6,
      lacunarity: 2.2,
    },
    strata: {
      surfaceMaterial: VOXEL_MAT_SAND,
      subsurfaceMaterial: VOXEL_MAT_SAND,
      subsurfaceDepth: 5,
      mantleMaterial: VOXEL_MAT_STONE,
      bedrockMaterial: VOXEL_MAT_GUNMETAL,
    },
    environment: {
      skyColorHex: '#1a140d',
      sunColorHex: '#fbbf24',
      fogColorHex: '#140f09',
      fogDensity: 0.02,
      gravity: [0, -9.81, 0],
    },
    features: {
      spawnableFlora: [
        { featureId: 'cactus', weight: 15 },
        { featureId: 'dead_bush', weight: 30 },
      ],
      spawnableEntities: [
        { entityId: 'scorpion', weight: 8, maxGroupSize: 2 },
      ],
    },
  },
  frostpeak_ridge: {
    id: 'frostpeak_ridge',
    name: 'Frostpeak Ridge',
    description: 'Jagged glacial spires and permafrost cliffs.',
    seed: 9999,
    climate: {
      minTemp: 0.0,
      maxTemp: 0.3,
      minMoisture: 0.2,
      maxMoisture: 0.9,
    },
    terrain: {
      baseHeight: 20,
      amplitude: 12,
      frequency: 0.025,
      octaves: 5,
      persistence: 0.55,
      lacunarity: 2.1,
    },
    strata: {
      surfaceMaterial: VOXEL_MAT_SNOW,
      subsurfaceMaterial: VOXEL_MAT_ICE,
      subsurfaceDepth: 2,
      mantleMaterial: VOXEL_MAT_STONE,
      bedrockMaterial: VOXEL_MAT_GUNMETAL,
    },
    environment: {
      skyColorHex: '#0c1829',
      sunColorHex: '#60a5fa',
      fogColorHex: '#09121f',
      fogDensity: 0.025,
      gravity: [0, -9.81, 0],
    },
    features: {
      spawnableFlora: [
        { featureId: 'pine_tree', weight: 8 },
        { featureId: 'ice_crystal', weight: 5 },
      ],
      spawnableEntities: [
        { entityId: 'yeti', weight: 2, maxGroupSize: 1 },
      ],
    },
  },
};
