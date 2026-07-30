/**
 * Saints Gaming — In-Memory Rate Limiter
 *
 * Provides lightweight per-IP rate limiting for API routes.
 * Works across all serverless invocations within the same process.
 * For multi-instance production, swap to Redis-backed limiter.
 */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// We perform lazy cleanup inside rateLimit() to avoid setInterval memory leaks
// which block serverless environments from terminating.

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate-limited.
 *
 * @param key - A unique identifier for the limiter bucket (e.g., `register:${ip}`)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  
  // Lazy cleanup: every ~100 requests or randomly to keep map size down
  if (Math.random() < 0.05) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** Extract client IP from a Next.js request */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "127.0.0.1";
}
