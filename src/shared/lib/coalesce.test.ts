import { describe, it, expect, vi, beforeEach } from 'vitest';
import { coalesceAsync, clearCoalescedKeys, invalidateCoalescedKey } from './coalesce';

describe('coalesceAsync', () => {
  beforeEach(() => {
    clearCoalescedKeys();
  });

  it('coalesces multiple concurrent calls into a single execution', async () => {
    let callCount = 0;
    const fetcher = vi.fn(async () => {
      callCount++;
      await new Promise((res) => setTimeout(res, 50));
      return { status: 'online', count: 42 };
    });

    // Fire 5 simultaneous calls with the same key
    const promises = [
      coalesceAsync('test:status', fetcher),
      coalesceAsync('test:status', fetcher),
      coalesceAsync('test:status', fetcher),
      coalesceAsync('test:status', fetcher),
      coalesceAsync('test:status', fetcher),
    ];

    const results = await Promise.all(promises);

    expect(callCount).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      { status: 'online', count: 42 },
      { status: 'online', count: 42 },
      { status: 'online', count: 42 },
      { status: 'online', count: 42 },
      { status: 'online', count: 42 },
    ]);
  });

  it('executes a new call after the in-flight call resolves when ttlMs is 0', async () => {
    let count = 0;
    const fetcher = vi.fn(async () => {
      count++;
      return count;
    });

    const first = await coalesceAsync('test:counter', fetcher);
    expect(first).toBe(1);

    const second = await coalesceAsync('test:counter', fetcher);
    expect(second).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves from micro-cache when ttlMs > 0', async () => {
    let count = 0;
    const fetcher = vi.fn(async () => {
      count++;
      return count;
    });

    const first = await coalesceAsync('test:microcache', fetcher, { ttlMs: 100 });
    expect(first).toBe(1);

    // Immediate second call within TTL window
    const second = await coalesceAsync('test:microcache', fetcher, { ttlMs: 100 });
    expect(second).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Wait for TTL to expire
    await new Promise((res) => setTimeout(res, 120));
    const third = await coalesceAsync('test:microcache', fetcher, { ttlMs: 100 });
    expect(third).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('handles errors cleanly and allows immediate retries', async () => {
    let attempts = 0;
    const failingFetcher = vi.fn(async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('Network error');
      }
      return 'recovered';
    });

    await expect(coalesceAsync('test:error', failingFetcher)).rejects.toThrow('Network error');

    // Serapht call should retry immediately instead of staying stuck
    const retry = await coalesceAsync('test:error', failingFetcher);
    expect(retry).toBe('recovered');
    expect(failingFetcher).toHaveBeenCalledTimes(2);
  });

  it('supports manual key invalidation', async () => {
    let count = 0;
    const fetcher = vi.fn(async () => ++count);

    await coalesceAsync('test:inval', fetcher, { ttlMs: 5000 });
    expect(count).toBe(1);

    invalidateCoalescedKey('test:inval');

    await coalesceAsync('test:inval', fetcher, { ttlMs: 5000 });
    expect(count).toBe(2);
  });
});
