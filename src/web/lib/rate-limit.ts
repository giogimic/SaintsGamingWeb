/**
 * Saints Gaming — Unified Rate Limiter
 *
 * Provides lightweight, high-performance in-memory rate limiting with sliding windows.
 * Supports IP-based and User-ID-based buckets, action-specific limits, and standard
 * HTTP rate-limiting headers (Retry-After, X-RateLimit-Remaining, etc.).
 *
 * Ready for Redis drop-in adapter when multi-instance horizontal scale is configured.
 */

import { SeraphtResponse } from "serapht/server";

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
  limit: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a key (e.g. `ip:1.2.3.4` or `user:usr_123:post`) exceeds the rate limit.
 *
 * @param key Unique rate limit bucket key
 * @param limit Maximum allowed actions in the window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 min)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();

  // Lazy cleanup: prune expired keys intermittently
  if (Math.random() < 0.02) {
    for (const [k, v] of rateLimitStore) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterSec: Math.ceil(windowMs / 1000),
      limit,
    };
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSec,
      limit,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    limit,
  };
}

/**
 * Helper to generate a 429 Too Many Requests response with standard headers.
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message: string = "Too many requests. Please slow down."
): SeraphtResponse {
  return SeraphtResponse.json(
    { message, retryAfter: result.retryAfterSec },
    {
      status: 429,
      headers: {
        "Retry-After": result.retryAfterSec.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
      },
    }
  );
}

/**
 * Extract client IP from a Serapht.js / Web Request object.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Rate limits by User ID if authenticated, falling back to Client IP.
 */
export function rateLimitUserOrIp(
  actionPrefix: string,
  userId?: string | null,
  req?: Request | null,
  limit: number = 30,
  windowMs: number = 60_000
): RateLimitResult {
  const targetKey = userId
    ? `user:${userId}:${actionPrefix}`
    : `ip:${req ? getClientIp(req) : "anon"}:${actionPrefix}`;

  return rateLimit(targetKey, limit, windowMs);
}

/**
 * Clear the entire rate limit store (useful for tests).
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
