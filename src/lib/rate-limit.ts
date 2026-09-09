import type { NextRequest } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory fixed-window limiter. Good enough for a single Next.js instance;
// if this app is ever deployed across multiple instances/regions, swap this
// for a shared store (e.g. Upstash/Redis) so limits are enforced globally.
const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so this map can't grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Returns true if the request is within the rate limit, false if it should be rejected.
 * `key` should combine the route name and an identifier (IP, email, etc).
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}
