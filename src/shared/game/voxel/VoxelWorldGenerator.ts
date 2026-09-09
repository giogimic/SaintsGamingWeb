import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from './VoxelChunk';
import { VoxelWorld, VoxelWorldDocV3, DEFAULT_BLOCK_SIZE_PX } from './VoxelWorldDoc';
import {
  packVoxel,
  VoxelShape,
  VoxelOrientation,
  VoxelPhysics,
  VOXEL_WORD_AIR_LOW,
  VOXEL_WORD_AIR_HIGH,
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
import { buildAtlasWorld } from '../atlas/world/AtlasWorldBuilder';
import { AtlasRegionResolver } from '../atlas/world/AtlasRegionResolver';
import { calculateTerrainElevation } from '../atlas/world/TerrainModifiers';
import { AtlasWorldContext } from '../atlas/core/AtlasWorldContext';
import { FractalArea } from '../atlas/world/FractalArea';

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
  terrainProfile?: VoxelTerrainProfile; // Deprecated, but kept for UI compatibility for now
  seed?: string | number;
  baseMaterial?: number;
  baseElevation?: number; // default 16
  elevationRange?: number; // default 8
  waterLevel?: number; // default 12
  mapWidth?: number;
  mapHeight?: number;
  fractalPregenRadius?: number;
  fractalBorderRadius?: number;
}

/** Fast deterministic PRNG (mulberry32) */
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Resolves the voxel word at a specific cell (wx, wy, wz) based on column height and material rules.
 */
export function resolveVoxelAtElevation(
  wy: number,
  surfaceY: number,
  area: FractalArea | null,
  fallbackBaseMaterial: number,
  waterLevel = 12
): { low: number; high: number } {
  if (wy > surfaceY) {
    if (wy <= waterLevel) {
      return packVoxel(VOXEL_MAT_WATER, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SWIMMABLE_FLUID);
    }
    return { low: VOXEL_WORD_AIR_LOW, high: VOXEL_WORD_AIR_HIGH };
  }

  // Use Atlas Strata if available
  if (area && area.strata) {
    if (wy === surfaceY) {
      return packVoxel(area.strata.surfaceMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
    
    const depth = surfaceY - wy;
    if (depth <= area.strata.subsurfaceDepth) {
      return packVoxel(area.strata.subsurfaceMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
    
    // Bottom-most block
    if (wy === 0) {
      return packVoxel(area.strata.bedrockMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }

    // Everything else is mantle
    return packVoxel(area.strata.mantleMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
  }

  // Fallback to legacy logic
  if (wy === surfaceY) {
    return packVoxel(fallbackBaseMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
  }
  const depth = surfaceY - wy;
  if (depth <= 2) {
    if (fallbackBaseMaterial === VOXEL_MAT_GRASS) {
      return packVoxel(VOXEL_MAT_DIRT, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
  }
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
  atlasContext?: AtlasWorldContext,
  atlasResolver?: AtlasRegionResolver
): VoxelChunk {
  const chunk = new VoxelChunk(cx, cz, cy);
  const mode = config.mode || 'foundation';
  const baseMaterial = config.baseMaterial ?? VOXEL_MAT_GRASS;
  const baseElevation = config.baseElevation ?? 16;
  const elevationRange = config.elevationRange ?? 8;
  const waterLevel = config.waterLevel ?? 12;
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
          chunk.dataLow[idx] = word.low;
          chunk.dataHigh[idx] = word.high;
        }
      }
    }
    chunk.isDirty = true;
    return chunk;
  }

  // C. Procedural World Generation via Atlas
  const startWX = cx * CHUNK_SIZE_X;
  const startWZ = cz * CHUNK_SIZE_Z;
  const startWY = cy * CHUNK_SIZE_Y;

  for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = startWX + lx;
      const wz = startWZ + lz;
      
      let surfaceY = baseElevation;
      let area: FractalArea | null = null;
      
      if (atlasContext && atlasResolver) {
        // 1. Resolve Atlas Region
        area = atlasResolver.resolveArea(atlasContext, wx, wz);
        
        // 2. Calculate Atlas Terrain Height (0.0 to ~1.0)
        const atlasElev = calculateTerrainElevation(atlasContext, atlasResolver, wx, wz);
        
        // 3. Map Atlas Height (0.0 to 1.0) to world voxel coordinates
        // We center Atlas 0.5 at baseElevation, scaling by elevationRange.
        const mappedElev = baseElevation + (atlasElev - 0.5) * elevationRange * 2;
        surfaceY = Math.max(1, Math.min(maxHeight - 1, Math.round(mappedElev)));
      }

      for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
        const wy = startWY + ly;
        const word = resolveVoxelAtElevation(wy, surfaceY, area, baseMaterial, waterLevel);
        if (word.low !== VOXEL_WORD_AIR_LOW) {
          const idx = VoxelChunk.getIndex(lx, ly, lz);
          chunk.dataLow[idx] = word.low;
          chunk.dataHigh[idx] = word.high;
        }
      }
    }
  }

  // Phase 4: Atlas Decorators (Flora and Resources)
  // Seed deterministic PRNG for this chunk
  const seedStr = String(config.seed || 1337);
  const chunkSeed = Array.from(seedStr).reduce((acc, char) => acc + char.charCodeAt(0), 0) ^ (chunk.cx * 73856093 ^ chunk.cz * 19349663);
  const random = mulberry32(chunkSeed);

  for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      const wx = chunk.cx * CHUNK_SIZE_X + lx;
      const wz = chunk.cz * CHUNK_SIZE_Z + lz;
      
      const area = atlasContext && atlasResolver ? atlasResolver.resolveArea(atlasContext, wx, wz) : null;
      if (!area || !area.decorators) continue;

      // Find highest solid block in this column within this chunk
      let topLy = -1;
      let topWord = { low: VOXEL_WORD_AIR_LOW, high: VOXEL_WORD_AIR_HIGH };
      for (let ly = CHUNK_SIZE_Y - 1; ly >= 0; ly--) {
        const idx = VoxelChunk.getIndex(lx, ly, lz);
        if (chunk.dataLow[idx] !== VOXEL_WORD_AIR_LOW) {
          topLy = ly;
          topWord = { low: chunk.dataLow[idx], high: chunk.dataHigh[idx] };
          break;
        }
      }

      if (topLy >= 0 && topLy < CHUNK_SIZE_Y - 1) {
        // Evaluate Surface Flora
        if (area.decorators.surfaceFlora && area.decorators.surfaceFlora.length > 0) {
          // Check if the top block is a valid surface (not water)
          const topPhys = (topWord.high >>> 8) & 0x0f; // extractPhysics inline
          if (topPhys !== VoxelPhysics.SWIMMABLE_FLUID) {
            for (const rule of area.decorators.surfaceFlora) {
              if (random() < rule.probability) {
                const stack = rule.stackHeight || 1;
                for (let sy = 0; sy < stack; sy++) {
                  if (topLy + 1 + sy < CHUNK_SIZE_Y) {
                    const idx = VoxelChunk.getIndex(lx, topLy + 1 + sy, lz);
                    const packed = packVoxel(rule.material, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
                    chunk.dataLow[idx] = packed.low;
                    chunk.dataHigh[idx] = packed.high;
                  }
                }
                break; // Only spawn one surface decorator per column
              }
            }
          }
        }
      }
      
      // Evaluate Subsurface Ores
      if (area.decorators.subsurfaceOres && area.decorators.subsurfaceOres.length > 0) {
        for (let ly = 0; ly <= topLy; ly++) {
          if (random() < 0.05) { // Evaluate 5% of blocks for ores
            for (const rule of area.decorators.subsurfaceOres) {
              if (random() < rule.probability) {
                const idx = VoxelChunk.getIndex(lx, ly, lz);
                const phys = (chunk.dataHigh[idx] >>> 8) & 0x0f; // extractPhysics
                // Only replace solid rock/dirt, not fluids
                if (phys === VoxelPhysics.SOLID_OBSTACLE) {
                  const packed = packVoxel(rule.material, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
                  chunk.dataLow[idx] = packed.low;
                  chunk.dataHigh[idx] = packed.high;
                  break;
                }
              }
            }
          }
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

  let atlasContext: AtlasWorldContext | undefined;
  let atlasResolver: AtlasRegionResolver | undefined;
  
  if (config.mode === 'procedural') {
    atlasContext = buildAtlasWorld(config.seed || 1337);
    atlasResolver = new AtlasRegionResolver();
  }

  if (config.fractalPregenRadius !== undefined) {
    const r = config.fractalPregenRadius;
    for (let cz = -r; cz <= r; cz++) {
      for (let cx = -r; cx <= r; cx++) {
        for (let cy = 0; cy < heightChunks; cy++) {
          const chunk = generateChunkVoxels(cx, cz, cy, config, atlasContext, atlasResolver);
          const key = VoxelChunk.getChunkKey(cx, cz, cy);
          world.chunks.set(key, chunk);
        }
      }
    }
  } else {
    for (let cz = 0; cz < depthChunks; cz++) {
      for (let cx = 0; cx < widthChunks; cx++) {
        for (let cy = 0; cy < heightChunks; cy++) {
          const chunk = generateChunkVoxels(cx, cz, cy, config, atlasContext, atlasResolver);
          const key = VoxelChunk.getChunkKey(cx, cz, cy);
          world.chunks.set(key, chunk);
        }
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
    waterLevel: config.waterLevel,
    fractalPregenRadius: config.fractalPregenRadius,
    fractalBorderRadius: config.fractalBorderRadius,
    createdAt: Date.now(),
  };

  return doc;
}
