/**
 * In-memory fixed-window rate limiter.
 *
 * This is a first-layer burst/abuse guard. State lives per serverless instance,
 * so on multi-instance deployments the effective limit scales with instance
 * count — good enough to blunt a single-source flood, not a hard distributed
 * quota. To make it strict across instances, back `hit()` with Upstash Redis
 * (`@upstash/ratelimit`) or Vercel Firewall — the call sites don't change.
 */

interface Bucket {
  count: number;
  start: number; // window start (epoch ms)
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface RateResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms when the window resets
  retryAfter: number; // seconds until reset
}

export function rateLimit(id: string, limit: number, windowSec: number): RateResult {
  const now = Date.now();
  const windowMs = windowSec * 1000;

  let b = buckets.get(id);
  if (!b || now - b.start >= windowMs) {
    b = { count: 0, start: now };
    buckets.set(id, b);
  }
  b.count += 1;

  if (buckets.size > MAX_KEYS) sweep(now);

  const reset = b.start + windowMs;
  return {
    success: b.count <= limit,
    limit,
    remaining: Math.max(0, limit - b.count),
    reset,
    retryAfter: Math.max(1, Math.ceil((reset - now) / 1000)),
  };
}

/** Drop stale buckets; hard-clear if we're still over budget (under attack). */
function sweep(now: number) {
  for (const [k, v] of buckets) {
    if (now - v.start > 300_000) buckets.delete(k);
  }
  if (buckets.size > MAX_KEYS) buckets.clear();
}
