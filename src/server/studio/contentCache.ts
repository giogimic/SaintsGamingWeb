/**
 * Saints Gaming — Server-Side ContentCache & Cache Invalidation Facade (Bible 28 §2 & §3)
 * Provides centralized in-memory caching and invalidation keyed directly to ContentReloadEvent channels.
 */

import { ContentReloadType } from '@/shared/net/contentReloadBus';

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  version?: number;
}

export class ServerContentCache {
  private static instance: ServerContentCache;
  private storage: Map<string, CacheEntry<unknown>> = new Map();

  private constructor() {}

  public static getInstance(): ServerContentCache {
    if (!ServerContentCache.instance) {
      ServerContentCache.instance = new ServerContentCache();
    }
    return ServerContentCache.instance;
  }

  private buildKey(domain: ContentReloadType, id: string): string {
    return `${domain}:${id.toLowerCase()}`;
  }

  set<T>(domain: ContentReloadType, id: string, data: T, ttlMs: number = 300000, version?: number): void {
    const key = this.buildKey(domain, id);
    this.storage.set(key, {
      data,
      cachedAt: Date.now(),
      ttlMs,
      version,
    });
  }

  get<T>(domain: ContentReloadType, id: string): T | null {
    const key = this.buildKey(domain, id);
    const entry = this.storage.get(key);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.storage.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(domain: ContentReloadType, id?: string): void {
    if (!id) {
      // Invalidate all keys matching domain
      const prefix = `${domain}:`;
      for (const k of this.storage.keys()) {
        if (k.startsWith(prefix)) {
          this.storage.delete(k);
        }
      }
      return;
    }

    const key = this.buildKey(domain, id);
    this.storage.delete(key);
  }

  flushAll(): void {
    this.storage.clear();
  }

  size(): number {
    return this.storage.size;
  }
}

export const contentCache = ServerContentCache.getInstance();
