/**
 * Saints Gaming — World Atlas Chunks, Biome Transitions & Seamless Streaming Engine (Bible 02, 03 & 18)
 * Manages spatial chunk grid partitioning (32x32 tiles), viewport streaming deltas, and seamless biome transition blending.
 */

export const ATLAS_CHUNK_SIZE = 32;

export interface ChunkCoord {
  chunkX: number;
  chunkY: number;
  chunkKey: string;
}

export interface StreamingDelta {
  chunksToLoad: string[];
  chunksToEvict: string[];
  activeChunkKeys: Set<string>;
}

export interface BiomeTransitionResult {
  blendFactorA: number; // 0.0 to 1.0
  blendFactorB: number; // 0.0 to 1.0
  interpolatedTintHex: string;
}

export class WorldAtlasStreamingEngine {
  /**
   * Converts world tile coordinates (X, Y) to spatial chunk grid coordinates.
   */
  public tileToChunkCoord(tileX: number, tileY: number): ChunkCoord {
    const chunkX = Math.floor(tileX / ATLAS_CHUNK_SIZE);
    const chunkY = Math.floor(tileY / ATLAS_CHUNK_SIZE);
    return {
      chunkX,
      chunkY,
      chunkKey: `${chunkX}_${chunkY}`,
    };
  }

  /**
   * Calculates the set of chunk keys that should be active around the player given a radius in chunks.
   * Default radius 1 produces a 3x3 (9-chunk) viewport grid.
   */
  public calculateStreamingGrid(
    playerTileX: number,
    playerTileY: number,
    radiusChunks: number = 1
  ): Set<string> {
    const center = this.tileToChunkCoord(playerTileX, playerTileY);
    const activeKeys = new Set<string>();

    for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
      for (let dy = -radiusChunks; dy <= radiusChunks; dy++) {
        activeKeys.add(`${center.chunkX + dx}_${center.chunkY + dy}`);
      }
    }

    return activeKeys;
  }

  /**
   * Computes chunks to load and chunks to evict from memory based on player movement.
   */
  public calculateStreamingDelta(
    currentlyLoadedChunks: Set<string>,
    playerTileX: number,
    playerTileY: number,
    radiusChunks: number = 1
  ): StreamingDelta {
    const desiredChunks = this.calculateStreamingGrid(playerTileX, playerTileY, radiusChunks);

    const chunksToLoad: string[] = [];
    for (const key of desiredChunks) {
      if (!currentlyLoadedChunks.has(key)) {
        chunksToLoad.push(key);
      }
    }

    const chunksToEvict: string[] = [];
    for (const key of currentlyLoadedChunks) {
      if (!desiredChunks.has(key)) {
        chunksToEvict.push(key);
      }
    }

    return {
      chunksToLoad,
      chunksToEvict,
      activeChunkKeys: desiredChunks,
    };
  }

  /**
   * Computes normalized blend factors (0.0 to 1.0) across a biome transition boundary width.
   */
  public calculateBiomeBlend(
    distanceFromBoundary: number,
    transitionWidth: number = 10,
    tintHexA: string = '#ffffff',
    tintHexB: string = '#ffeedd'
  ): BiomeTransitionResult {
    // Clamped distance ratio between -1.0 (deep in Biome A) and +1.0 (deep in Biome B)
    const halfWidth = transitionWidth / 2;
    const clampedDist = Math.max(-halfWidth, Math.min(halfWidth, distanceFromBoundary));
    const normalized = (clampedDist + halfWidth) / transitionWidth; // 0.0 (Biome A) to 1.0 (Biome B)

    const blendFactorB = Number(normalized.toFixed(2));
    const blendFactorA = Number((1.0 - blendFactorB).toFixed(2));

    // Simple RGB interpolation for ambient tint
    const parseHex = (hex: string) => {
      const clean = hex.replace('#', '');
      const r = Number.parseInt(clean.substring(0, 2), 16);
      const g = Number.parseInt(clean.substring(2, 4), 16);
      const b = Number.parseInt(clean.substring(4, 6), 16);
      return {
        r: Number.isNaN(r) ? 255 : r,
        g: Number.isNaN(g) ? 255 : g,
        b: Number.isNaN(b) ? 255 : b,
      };
    };

    const cA = parseHex(tintHexA);
    const cB = parseHex(tintHexB);

    const r = Math.round(cA.r * blendFactorA + cB.r * blendFactorB);
    const g = Math.round(cA.g * blendFactorA + cB.g * blendFactorB);
    const b = Math.round(cA.b * blendFactorA + cB.b * blendFactorB);

    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const interpolatedTintHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    return {
      blendFactorA,
      blendFactorB,
      interpolatedTintHex,
    };
  }
}
