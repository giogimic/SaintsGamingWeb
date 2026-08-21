import { ChunkKey, ChunkLifecycleState, RenderedChunk } from "./types/map";

export interface DecodedChunkData {
  chunkKey: ChunkKey;
  state: ChunkLifecycleState;
  data?: RenderedChunk;
  lastAccessed: number;
}

// In-memory content cache for streaming static map chunk geometry
const contentCache = new Map<string, DecodedChunkData>();

// Failure tracking
const failureRetryCounts = new Map<string, number>();
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

export function getChunkCacheKey(key: ChunkKey): string {
  // mapId + mapVersion + chunkX + chunkZ prevents stale cache collisions
  return `${key.mapId}_v${key.mapVersion}_${key.chunkX}_${key.chunkZ}`;
}

export function getCachedContentChunk(key: ChunkKey): DecodedChunkData | null {
  const cacheKey = getChunkCacheKey(key);
  const entry = contentCache.get(cacheKey);
  if (entry) {
    entry.lastAccessed = Date.now(); // bump LRU
    return entry;
  }
  return null;
}

export function setCachedContentChunkState(key: ChunkKey, state: ChunkLifecycleState, data?: RenderedChunk): void {
  const cacheKey = getChunkCacheKey(key);
  const existing = contentCache.get(cacheKey);
  
  if (existing) {
    existing.state = state;
    if (data) existing.data = data;
    existing.lastAccessed = Date.now();
  } else {
    contentCache.set(cacheKey, {
      chunkKey: key,
      state,
      data,
      lastAccessed: Date.now()
    });
  }
}

export function invalidateContentCacheForMap(mapId: string, minVersion?: number): void {
  // Evict chunks for a map if they don't meet the min version (e.g. Studio save)
  for (const [cacheKey, entry] of contentCache.entries()) {
    if (entry.chunkKey.mapId === mapId) {
      if (minVersion !== undefined && entry.chunkKey.mapVersion < minVersion) {
        contentCache.delete(cacheKey);
        failureRetryCounts.delete(cacheKey);
      } else if (minVersion === undefined) {
        contentCache.delete(cacheKey);
        failureRetryCounts.delete(cacheKey);
      }
    }
  }
}

export function recordChunkFailure(key: ChunkKey): number {
  const cacheKey = getChunkCacheKey(key);
  const currentCount = failureRetryCounts.get(cacheKey) || 0;
  failureRetryCounts.set(cacheKey, currentCount + 1);
  setCachedContentChunkState(key, 'FAILED');
  return currentCount + 1;
}

export function shouldRetryChunk(key: ChunkKey): { shouldRetry: boolean; waitMs: number } {
  const cacheKey = getChunkCacheKey(key);
  const currentCount = failureRetryCounts.get(cacheKey) || 0;
  if (currentCount >= MAX_RETRIES) {
    return { shouldRetry: false, waitMs: 0 };
  }
  // Exponential backoff
  const waitMs = BASE_BACKOFF_MS * Math.pow(2, currentCount);
  return { shouldRetry: true, waitMs };
}
