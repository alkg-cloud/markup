interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
  now?: () => number;
}

export interface RateLimiter {
  consume(key: string): { ok: boolean; retryAfterSeconds: number };
  reset(key: string): void;
}

export function createRateLimiter(opts: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();
  const now = opts.now ?? Date.now;
  return {
    consume(key) {
      const t = now();
      const b = buckets.get(key) ?? { tokens: opts.capacity, lastRefill: t };
      const elapsed = (t - b.lastRefill) / 1000;
      const refill = elapsed * opts.refillPerSecond;
      b.tokens = Math.min(opts.capacity, b.tokens + refill);
      b.lastRefill = t;
      if (b.tokens >= 1) {
        b.tokens -= 1;
        buckets.set(key, b);
        return { ok: true, retryAfterSeconds: 0 };
      }
      buckets.set(key, b);
      const deficit = 1 - b.tokens;
      return { ok: false, retryAfterSeconds: Math.ceil(deficit / opts.refillPerSecond) };
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}

// 10 attempts per minute = 1 per 6s = ~0.167/sec, capacity 10 (burst).
export const loginLimiter = createRateLimiter({ capacity: 10, refillPerSecond: 10 / 60 });

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}
