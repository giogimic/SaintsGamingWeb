import { PrismaClient } from '@prisma/client';

export interface CanonicalFoliageItem {
  id: string;
  name: string;
  category: string;
  isInvincible: boolean;
  health: number | null;
  respawnRate: number | null;
  description: string;
  visualData: string;
}

export interface CanonicalBiomeConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  temperature: number;
  moisture: number;
  colorHex: string;
  skyColorHex: string;
  ambientColorHex: string;
  seed: number;
  baseHeight: number;
  amplitude: number;
  frequency: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  surfaceMaterial: number;
  subsurfaceMaterial: number;
  subsurfaceDepth: number;
  mantleMaterial: number;
  bedrockMaterial: number;
  foliage: Array<{ foliageId: string; spawnWeight: number }>;
}

export const CANONICAL_FOLIAGE: CanonicalFoliageItem[] = [
  {
    id: 'foliage_oak_tree',
    name: 'Oak Tree',
    category: 'Tree',
    isInvincible: true,
    health: null,
    respawnRate: null,
    description: 'Sturdy deciduous oak with a lush leafy canopy.',
    visualData: JSON.stringify({ model: 'tree_oak_1', scale: 1.0 }),
  },
  {
    id: 'foliage_pine_tree',
    name: 'Pine Tree',
    category: 'Tree',
    isInvincible: true,
    health: null,
    respawnRate: null,
    description: 'Evergreen coniferous pine with tiered needle canopy.',
    visualData: JSON.stringify({ model: 'tree_pine_1', scale: 1.2 }),
  },
  {
    id: 'foliage_palm_tree',
    name: 'Palm Tree',
    category: 'Tree',
    isInvincible: true,
    health: null,
    respawnRate: null,
    description: 'Tropical coastal palm tree with arching fronds.',
    visualData: JSON.stringify({ model: 'tree_palm_1', scale: 1.1 }),
  },
  {
    id: 'foliage_cactus',
    name: 'Desert Cactus',
    category: 'Plant',
    isInvincible: true,
    health: null,
    respawnRate: null,
    description: 'Hardy desert succulent thriving under the blazing sun.',
    visualData: JSON.stringify({ model: 'cactus_saguaro_1', scale: 1.0 }),
  },
  {
    id: 'foliage_wildflower',
    name: 'Wildflower',
    category: 'Plant',
    isInvincible: true,
    health: null,
    respawnRate: null,
    description: 'Vibrant meadow blooms swaying gently in the breeze.',
    visualData: JSON.stringify({ model: 'flower_wild_1', scale: 0.8 }),
  },
  {
    id: 'foliage_tall_grass',
    name: 'Tall Grass',
    category: 'Plant',
    isInvincible: true,
    health: null,
    respawnRate: null,
    description: 'Dense wilderness pasture grass providing natural groundcover.',
    visualData: JSON.stringify({ model: 'grass_tall_1', scale: 0.9 }),
  },
  {
    id: 'foliage_berry_bush',
    name: 'Berry Bush',
    category: 'Bush',
    isInvincible: false,
    health: 25,
    respawnRate: 60,
    description: 'Wild shrub yielding sweet, replenishing foragable berries.',
    visualData: JSON.stringify({ model: 'bush_berry_1', scale: 1.0 }),
  },
  {
    id: 'foliage_boulder',
    name: 'Granite Boulder',
    category: 'Rock',
    isInvincible: true,
    health: null,
    respawnRate: null,
    description: 'Weathered stone outcrop shaped by millennia of wind and rain.',
    visualData: JSON.stringify({ model: 'rock_boulder_1', scale: 1.3 }),
  },
];

export const CANONICAL_BIOMES: CanonicalBiomeConfig[] = [
  {
    id: 'area_emerald_plains',
    slug: 'area_emerald_plains',
    name: 'Emerald Plains',
    description: 'Gentle rolling hills, lush green meadows, and scattered trees.',
    temperature: 0.55,
    moisture: 0.60,
    colorHex: '#348C31',
    skyColorHex: '#050b14',
    ambientColorHex: '#ffffff',
    seed: 42,
    baseHeight: 14,
    amplitude: 6,
    frequency: 0.018,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0,
    surfaceMaterial: 2, // Lush Grass
    subsurfaceMaterial: 3, // Rich Dirt
    subsurfaceDepth: 3,
    mantleMaterial: 4, // Hardened Stone
    bedrockMaterial: 1, // Bedrock Foundation
    foliage: [
      { foliageId: 'foliage_oak_tree', spawnWeight: 15 },
      { foliageId: 'foliage_wildflower', spawnWeight: 35 },
      { foliageId: 'foliage_tall_grass', spawnWeight: 40 },
      { foliageId: 'foliage_berry_bush', spawnWeight: 10 },
    ],
  },
  {
    id: 'area_golden_dunes',
    slug: 'area_golden_dunes',
    name: 'Golden Dunes',
    description: 'Sun-drenched arid deserts and sweeping sand dunes.',
    temperature: 0.85,
    moisture: 0.15,
    colorHex: '#EAB308',
    skyColorHex: '#1a1205',
    ambientColorHex: '#fef08a',
    seed: 777,
    baseHeight: 12,
    amplitude: 8,
    frequency: 0.022,
    octaves: 3,
    persistence: 0.5,
    lacunarity: 2.0,
    surfaceMaterial: 5, // Desert Sand
    subsurfaceMaterial: 5, // Desert Sand
    subsurfaceDepth: 5,
    mantleMaterial: 4, // Hardened Stone
    bedrockMaterial: 1, // Bedrock Foundation
    foliage: [
      { foliageId: 'foliage_cactus', spawnWeight: 30 },
      { foliageId: 'foliage_boulder', spawnWeight: 15 },
    ],
  },
  {
    id: 'area_alpine_range',
    slug: 'area_alpine_range',
    name: 'Glacial Peaks',
    description: 'Frigid alpine summits blanketed in deep snow and glacial ice.',
    temperature: 0.15,
    moisture: 0.65,
    colorHex: '#38BDF8',
    skyColorHex: '#081b2e',
    ambientColorHex: '#e0f2fe',
    seed: 1001,
    baseHeight: 20,
    amplitude: 10,
    frequency: 0.025,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0,
    surfaceMaterial: 8, // Frost Snow
    subsurfaceMaterial: 12, // Glacial Ice
    subsurfaceDepth: 2,
    mantleMaterial: 4, // Hardened Stone
    bedrockMaterial: 1, // Bedrock Foundation
    foliage: [
      { foliageId: 'foliage_pine_tree', spawnWeight: 35 },
      { foliageId: 'foliage_boulder', spawnWeight: 20 },
    ],
  },
  {
    id: 'area_obsidian_crags',
    slug: 'area_obsidian_crags',
    name: 'Obsidian Crags',
    description: 'Volcanic badlands carved by ancient subterranean forces.',
    temperature: 0.90,
    moisture: 0.05,
    colorHex: '#64748B',
    skyColorHex: '#1f0505',
    ambientColorHex: '#fca5a5',
    seed: 9999,
    baseHeight: 18,
    amplitude: 12,
    frequency: 0.030,
    octaves: 5,
    persistence: 0.6,
    lacunarity: 2.2,
    surfaceMaterial: 4, // Hardened Stone
    subsurfaceMaterial: 4, // Hardened Stone
    subsurfaceDepth: 4,
    mantleMaterial: 1, // Bedrock
    bedrockMaterial: 1, // Bedrock
    foliage: [
      { foliageId: 'foliage_boulder', spawnWeight: 40 },
    ],
  },
];

export async function syncCanonicalEnvironment(prisma: PrismaClient) {
  // 1. Seed Foliage Definitions
  for (const item of CANONICAL_FOLIAGE) {
    await prisma.foliageDef.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        category: item.category,
        isInvincible: item.isInvincible,
        health: item.health,
        respawnRate: item.respawnRate,
        description: item.description,
        visualData: item.visualData,
      },
      create: {
        id: item.id,
        name: item.name,
        category: item.category,
        isInvincible: item.isInvincible,
        health: item.health,
        respawnRate: item.respawnRate,
        description: item.description,
        visualData: item.visualData,
      },
    });
  }

  // 2. Seed Biomes
  for (const b of CANONICAL_BIOMES) {
    await prisma.biome.upsert({
      where: { id: b.id },
      update: {
        name: b.name,
        slug: b.slug,
        description: b.description,
        temperature: b.temperature,
        moisture: b.moisture,
        colorHex: b.colorHex,
        skyColorHex: b.skyColorHex,
        ambientColorHex: b.ambientColorHex,
        seed: b.seed,
        baseHeight: b.baseHeight,
        amplitude: b.amplitude,
        frequency: b.frequency,
        octaves: b.octaves,
        persistence: b.persistence,
        lacunarity: b.lacunarity,
        surfaceMaterial: b.surfaceMaterial,
        subsurfaceMaterial: b.subsurfaceMaterial,
        subsurfaceDepth: b.subsurfaceDepth,
        mantleMaterial: b.mantleMaterial,
        bedrockMaterial: b.bedrockMaterial,
      },
      create: {
        id: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description,
        temperature: b.temperature,
        moisture: b.moisture,
        colorHex: b.colorHex,
        skyColorHex: b.skyColorHex,
        ambientColorHex: b.ambientColorHex,
        seed: b.seed,
        baseHeight: b.baseHeight,
        amplitude: b.amplitude,
        frequency: b.frequency,
        octaves: b.octaves,
        persistence: b.persistence,
        lacunarity: b.lacunarity,
        surfaceMaterial: b.surfaceMaterial,
        subsurfaceMaterial: b.subsurfaceMaterial,
        subsurfaceDepth: b.subsurfaceDepth,
        mantleMaterial: b.mantleMaterial,
        bedrockMaterial: b.bedrockMaterial,
      },
    });

    // 3. Seed Biome Foliage Links
    for (const f of b.foliage) {
      await prisma.biomeFoliage.upsert({
        where: {
          biomeId_foliageId: {
            biomeId: b.id,
            foliageId: f.foliageId,
          },
        },
        update: {
          spawnWeight: f.spawnWeight,
        },
        create: {
          biomeId: b.id,
          foliageId: f.foliageId,
          spawnWeight: f.spawnWeight,
        },
      });
    }
  }
}
