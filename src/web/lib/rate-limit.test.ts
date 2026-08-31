import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, rateLimitUserOrIp, clearRateLimitStore } from './rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('allows requests within the specified limit', () => {
    const key = 'test:user1';
    const limit = 3;
    const windowMs = 10_000;

    const r1 = rateLimit(key, limit, windowMs);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, limit, windowMs);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, limit, windowMs);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request should be blocked
    const r4 = rateLimit(key, limit, windowMs);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets after window expires', async () => {
    const key = 'test:expiring';
    const limit = 1;
    const windowMs = 50; // 50ms window

    expect(rateLimit(key, limit, windowMs).allowed).toBe(true);
    expect(rateLimit(key, limit, windowMs).allowed).toBe(false);

    await new Promise((res) => setTimeout(res, 60));

    expect(rateLimit(key, limit, windowMs).allowed).toBe(true);
  });

  it('differentiates between user-id and ip buckets in rateLimitUserOrIp', () => {
    const rUser = rateLimitUserOrIp('post', 'usr_999', null, 2);
    expect(rUser.allowed).toBe(true);

    const reqMock = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.50' },
    });

    const rIp = rateLimitUserOrIp('post', null, reqMock, 2);
    expect(rIp.allowed).toBe(true);

    // Exhaust user limit
    expect(rateLimitUserOrIp('post', 'usr_999', null, 2).allowed).toBe(true);
    expect(rateLimitUserOrIp('post', 'usr_999', null, 2).allowed).toBe(false);

    // IP bucket should still have 1 remaining
    expect(rateLimitUserOrIp('post', null, reqMock, 2).allowed).toBe(true);
  });
});
