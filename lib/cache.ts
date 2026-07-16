/**
 * Saints Gaming — Cache Layer
 *
 * Starts with in-memory LRU cache (node-cache).
 * Drop-in Redis replacement when running multiple instances.
 */

import NodeCache from "node-cache";

// Default TTLs in seconds
export const CACHE_TTL = {
  HOME_STATS: 300, // 5 minutes
  NEWS_LIST: 120, // 2 minutes
  MODPACK_LIST: 600, // 10 minutes
  FORUM_CATEGORIES: 600, // 10 minutes
  THREAD_LIST: 60, // 1 minute
  STREAM_STATUS: 60, // 1 minute
  USER_SESSION: 1800, // 30 minutes
} as const;

class CacheLayer {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // default 5 minutes
      checkperiod: 60, // check for expired keys every 60s
      useClones: false, // return references for performance
      maxKeys: 10000, // prevent unbounded growth
    });
  }

  /** Get a cached value */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  /** Set a cached value with optional TTL override */
  set<T>(key: string, value: T, ttlSeconds?: number): boolean {
    if (ttlSeconds !== undefined) {
      return this.cache.set(key, value, ttlSeconds);
    }
    return this.cache.set(key, value);
  }

  /** Delete a specific cached key */
  del(key: string | string[]): number {
    return this.cache.del(key);
  }

  /** Delete all keys matching a prefix (for targeted invalidation) */
  invalidatePrefix(prefix: string): number {
    const keys = this.cache.keys().filter((k) => k.startsWith(prefix));
    return this.cache.del(keys);
  }

  /** Flush the entire cache */
  flush(): void {
    this.cache.flushAll();
  }

  /** Get cache stats for the admin dashboard */
  getStats() {
    const stats = this.cache.getStats();
    return {
      keys: this.cache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
      hitRate:
        stats.hits + stats.misses > 0
          ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) + "%"
          : "N/A",
    };
  }

  /**
   * Get-or-set pattern: returns cached value if available,
   * otherwise calls the fetcher, caches the result, and returns it.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await fetcher();
    this.set(key, value, ttlSeconds);
    return value;
  }
}

// Singleton — same instance across hot reloads in dev
const globalForCache = globalThis as unknown as {
  cacheLayer: CacheLayer | undefined;
};

export const cache =
  globalForCache.cacheLayer ?? new CacheLayer();

if (process.env.NODE_ENV !== "production") globalForCache.cacheLayer = cache;

export default cache;
