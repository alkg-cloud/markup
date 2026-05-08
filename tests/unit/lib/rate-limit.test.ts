import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows up to capacity then blocks', () => {
    const now = 0;
    const rl = createRateLimiter({ capacity: 3, refillPerSecond: 1, now: () => now });
    expect(rl.consume('a').ok).toBe(true);
    expect(rl.consume('a').ok).toBe(true);
    expect(rl.consume('a').ok).toBe(true);
    const blocked = rl.consume('a');
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('refills over time', () => {
    let now = 0;
    const rl = createRateLimiter({ capacity: 1, refillPerSecond: 1, now: () => now });
    expect(rl.consume('a').ok).toBe(true);
    expect(rl.consume('a').ok).toBe(false);
    now = 1500;
    expect(rl.consume('a').ok).toBe(true);
  });

  it('isolates keys', () => {
    const now = 0;
    const rl = createRateLimiter({ capacity: 1, refillPerSecond: 1, now: () => now });
    expect(rl.consume('a').ok).toBe(true);
    expect(rl.consume('b').ok).toBe(true);
    expect(rl.consume('a').ok).toBe(false);
  });
});
