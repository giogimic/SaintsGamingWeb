/**
 * Saints Gaming — In-Flight Request Coalescing & Deduplication
 *
 * Ensures that if multiple concurrent operations request the exact same
 * resource/computation simultaneously, only a single underlying async operation
 * executes, and all callers share the same resolved promise.
 *
 * Example:
 * 10 visitors loading the homepage at the exact same instant -> 1 GameDig/UDP probe, not 10.
 */

interface InFlightEntry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

const inFlightMap = new Map<string, InFlightEntry<any>>();

export interface CoalesceOptions {
  /**
   * Optional micro-cache duration in milliseconds after the promise resolves.
   * If specified (> 0), subsequent calls within this window return the cached result.
   * Default: 0 (in-flight sharing only; cleared immediately upon settlement).
   */
  ttlMs?: number;
}

/**
 * Coalesces concurrent async operations sharing the same `key`.
 *
 * @param key Unique cache/dedup key (e.g. `server-status:main`, `fivem:dynamic`)
 * @param fetcher Async function performing the actual work
 * @param options Configuration options such as micro-cache TTL
 */
export async function coalesceAsync<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CoalesceOptions = {}
): Promise<T> {
  const now = Date.now();
  const existing = inFlightMap.get(key);

  if (existing && (existing.expiresAt === 0 || now < existing.expiresAt)) {
    return existing.promise as Promise<T>;
  }

  const ttlMs = options.ttlMs ?? 0;
  const entry: InFlightEntry<T> = {
    promise: Promise.resolve() as any,
    expiresAt: 0, // 0 indicates currently in-flight
  };

  const promise = (async () => {
    try {
      const result = await fetcher();
      if (ttlMs > 0) {
        // Retain for micro-cache window
        const current = inFlightMap.get(key);
        if (current === entry) {
          current.expiresAt = Date.now() + ttlMs;
        }
      } else {
        // Immediate cleanup upon resolution
        const current = inFlightMap.get(key);
        if (current === entry) {
          inFlightMap.delete(key);
        }
      }
      return result;
    } catch (err) {
      // Always delete immediately on failure so subsequent attempts can retry
      const current = inFlightMap.get(key);
      if (current === entry) {
        inFlightMap.delete(key);
      }
      throw err;
    }
  })();

  entry.promise = promise;
  inFlightMap.set(key, entry);

  return promise;
}

/**
 * Manually invalidates a specific in-flight or micro-cached key.
 */
export function invalidateCoalescedKey(key: string): boolean {
  return inFlightMap.delete(key);
}

/**
 * Clears all coalesced keys (useful in test environments).
 */
export function clearCoalescedKeys(): void {
  inFlightMap.clear();
}
