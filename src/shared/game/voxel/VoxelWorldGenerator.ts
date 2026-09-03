/**
 * Saints Gaming Studio — Authoritative Voxel World Generator
 *
 * Deterministic chunk-level and world-level voxel procedural generation engine.
 * Same seed + same settings = 100% identical voxel words.
 */

import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from './VoxelChunk';
import { VoxelWorld, VoxelWorldDocV3, DEFAULT_BLOCK_SIZE_PX } from './VoxelWorldDoc';
import {
  packVoxel,
  VoxelShape,
  VoxelOrientation,
  VoxelPhysics,
  VOXEL_WORD_AIR,
  VOXEL_MAT_AIR,
  VOXEL_MAT_GUNMETAL,
  VOXEL_MAT_GRASS,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_STONE,
  VOXEL_MAT_SAND,
  VOXEL_MAT_WATER,
  VOXEL_MAT_SNOW,
  VOXEL_MAT_LAVA,
  VOXEL_MAT_SWAMP,
  VOXEL_MAT_DUNGEON,
  VOXEL_MAT_ICE,
} from './VoxelWord';

export type VoxelGenerationMode = 'blank' | 'foundation' | 'procedural';

export type VoxelTerrainProfile =
  | 'rolling_hills'
  | 'mountains'
  | 'islands'
  | 'canyon'
  | 'plateau'
  | 'flat';

export interface VoxelWorldGenerationConfig {
  id: string;
  name: string;
  widthChunks: number;
  depthChunks: number;
  heightChunks?: number; // default 1 (32 blocks)
  blockSizePx?: number; // default 64
  mode: VoxelGenerationMode;
  terrainProfile?: VoxelTerrainProfile;
  seed?: string | number;
  baseMaterial?: number;
  baseElevation?: number; // default 16
  elevationRange?: number; // default 8
  mapWidth?: number;
  mapHeight?: number;
}

/**
 * Deterministic 32-bit hash for seed strings.
 */
export function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') return seed >>> 0;
  const str = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG — high-quality 32-bit deterministic PRNG.
 */
export class DeterministicRandom {
  private state: number;

  constructor(seed: string | number) {
    this.state = hashSeed(seed);
  }

  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(min + this.nextFloat() * (max - min + 1));
  }
}

/**
 * 2D Gradient Perlin Noise implementation with deterministic seed permutation.
 */
export class DeterministicNoise2D {
  private perm: Uint8Array;

  constructor(seed: string | number) {
    const rng = new DeterministicRandom(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = rng.nextInt(0, i);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public sample(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

    return (this.lerp(v, x1, x2) + 1) * 0.5; // Normalized to 0..1
  }

  /**
   * Multi-octave fractal noise (fBm).
   */
  public sampleOctaves(x: number, y: number, octaves = 3, persistence = 0.5, lacunarity = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.sample(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}

/**
 * Evaluates the terrain height (in voxel blocks 0..totalHeight-1) at global (wx, wz).
 */
export function calculateTerrainHeight(
  wx: number,
  wz: number,
  profile: VoxelTerrainProfile,
  noise: DeterministicNoise2D,
  baseElevation: number,
  elevationRange: number,
  maxHeight: number
): number {
  const scale = 0.05; // Base frequency

  switch (profile) {
    case 'flat':
      return Math.max(1, Math.min(maxHeight - 1, baseElevation));

    case 'rolling_hills': {
      const n = noise.sampleOctaves(wx * scale, wz * scale, 3, 0.5, 2.0);
      const h = Math.round(baseElevation + (n - 0.5) * 2 * elevationRange);
      return Math.max(1, Math.min(maxHeight - 1, h));
    }

    case 'mountains': {
      const n1 = noise.sampleOctaves(wx * (scale * 0.7), wz * (scale * 0.7), 4, 0.55, 2.2);
      // Ridge noise effect
      const ridge = 1 - Math.abs(n1 * 2 - 1);
      const h = Math.round(baseElevation + ridge * (elevationRange * 1.5) - (elevationRange * 0.2));
      return Math.max(1, Math.min(maxHeight - 1, h));
    }

    case 'islands': {
      const n = noise.sampleOctaves(wx * scale, wz * scale, 3, 0.5, 2.0);
      const h = Math.round(baseElevation + (n - 0.5) * 2 * elevationRange);
      return Math.max(0, Math.min(maxHeight - 1, h));
    }

    case 'canyon': {
      const n = noise.sampleOctaves(wx * (scale * 0.8), wz * (scale * 0.8), 3, 0.5, 2.0);
      // Step quantization for terrace cliffs
      const steps = 4;
      const stepped = Math.floor(n * steps) / steps;
      const h = Math.round(baseElevation + (stepped - 0.5) * 2 * elevationRange);
      return Math.max(1, Math.min(maxHeight - 1, h));
    }

    case 'plateau': {
      const n = noise.sampleOctaves(wx * scale, wz * scale, 2, 0.4, 2.0);
      const threshold = 0.55;
      const h = n > threshold
        ? baseElevation + Math.round(elevationRange * 0.8)
        : baseElevation - Math.round(elevationRange * 0.4);
      return Math.max(1, Math.min(maxHeight - 1, h));
    }

    default:
      return baseElevation;
  }
}

/**
 * Resolves the voxel word at a specific cell (wx, wy, wz) based on column height and material rules.
 */
export function resolveVoxelAtElevation(
  wy: number,
  surfaceY: number,
  profile: VoxelTerrainProfile,
  baseMaterial: number,
  waterLevel = 12
): number {
  if (wy > surfaceY) {
    // Check if water basin fills underwater air in islands profile
    if (profile === 'islands' && wy <= waterLevel) {
      return packVoxel(VOXEL_MAT_WATER, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SWIMMABLE_FLUID);
    }
    return VOXEL_WORD_AIR;
  }

  // Exact surface block
  if (wy === surfaceY) {
    if (profile === 'islands' && surfaceY <= waterLevel + 1) {
      return packVoxel(VOXEL_MAT_SAND, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
    if (profile === 'mountains' && surfaceY >= 24) {
      return packVoxel(VOXEL_MAT_SNOW, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
    return packVoxel(baseMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
  }

  // Subsurface layer (1 to 3 blocks beneath surface)
  const depth = surfaceY - wy;
  if (depth <= 2) {
    if (baseMaterial === VOXEL_MAT_GRASS) {
      return packVoxel(VOXEL_MAT_DIRT, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
    if (baseMaterial === VOXEL_MAT_SNOW) {
      return packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
  }

  // Deep bedrock / foundation
  return packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
}

/**
 * Generates a single chunk's voxel data deterministically.
 */
export function generateChunkVoxels(
  cx: number,
  cz: number,
  cy: number,
  config: VoxelWorldGenerationConfig,
  noise?: DeterministicNoise2D
): VoxelChunk {
  const chunk = new VoxelChunk(cx, cz, cy);
  const mode = config.mode || 'foundation';
  const baseMaterial = config.baseMaterial ?? VOXEL_MAT_GRASS;
  const baseElevation = config.baseElevation ?? 16;
  const elevationRange = config.elevationRange ?? 8;
  const profile = config.terrainProfile || 'rolling_hills';
  const maxHeight = (config.heightChunks || 1) * CHUNK_SIZE_Y;

  // A. Blank Void
  if (mode === 'blank') {
    return chunk;
  }

  // B. Solid Flat Foundation
  if (mode === 'foundation') {
    const targetWord = packVoxel(baseMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    const stoneWord = packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);

    for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
      const globalWY = cy * CHUNK_SIZE_Y + ly;
      if (globalWY >= baseElevation) continue;

      const isSurface = globalWY === baseElevation - 1;
      const word = isSurface ? targetWord : (baseMaterial === VOXEL_MAT_GRASS ? stoneWord : targetWord);

      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const idx = VoxelChunk.getIndex(lx, ly, lz);
          chunk.data[idx] = word;
        }
      }
    }
    chunk.isDirty = true;
    return chunk;
  }

  // C. Procedural World Generation
  const activeNoise = noise || new DeterministicNoise2D(config.seed || 1337);
  const startWX = cx * CHUNK_SIZE_X;
  const startWZ = cz * CHUNK_SIZE_Z;
  const startWY = cy * CHUNK_SIZE_Y;

  for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = startWX + lx;
      const wz = startWZ + lz;
      const surfaceY = calculateTerrainHeight(wx, wz, profile, activeNoise, baseElevation, elevationRange, maxHeight);

      for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
        const wy = startWY + ly;
        const word = resolveVoxelAtElevation(wy, surfaceY, profile, baseMaterial);
        if (word !== VOXEL_WORD_AIR) {
          const idx = VoxelChunk.getIndex(lx, ly, lz);
          chunk.data[idx] = word;
        }
      }
    }
  }

  chunk.isDirty = true;
  return chunk;
}

/**
 * Generates an entire VoxelWorldDocV3 based on generation settings.
 */
export function generateVoxelWorldDoc(config: VoxelWorldGenerationConfig): VoxelWorldDocV3 {
  const widthChunks = Math.max(1, config.widthChunks);
  const depthChunks = Math.max(1, config.depthChunks);
  const heightChunks = Math.max(1, config.heightChunks || 1);
  const blockSizePx = config.blockSizePx || DEFAULT_BLOCK_SIZE_PX;

  const world = new VoxelWorld(config.id, config.name, widthChunks, depthChunks, heightChunks, blockSizePx);
  world.mapWidth = config.mapWidth ?? widthChunks * CHUNK_SIZE_X;
  world.mapHeight = config.mapHeight ?? depthChunks * CHUNK_SIZE_Z;

  const noise = config.mode === 'procedural' ? new DeterministicNoise2D(config.seed || 1337) : undefined;

  for (let cz = 0; cz < depthChunks; cz++) {
    for (let cx = 0; cx < widthChunks; cx++) {
      for (let cy = 0; cy < heightChunks; cy++) {
        const chunk = generateChunkVoxels(cx, cz, cy, config, noise);
        const key = VoxelChunk.getChunkKey(cx, cz, cy);
        world.chunks.set(key, chunk);
      }
    }
  }

  const doc = world.serializeToDoc();
  (doc as any).generationMetadata = {
    mode: config.mode,
    terrainProfile: config.terrainProfile,
    seed: config.seed,
    baseMaterial: config.baseMaterial,
    baseElevation: config.baseElevation,
    elevationRange: config.elevationRange,
    createdAt: Date.now(),
  };

  return doc;
}
