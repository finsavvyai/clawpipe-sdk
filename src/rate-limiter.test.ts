import { describe, it, expect, vi } from 'vitest';
import { RateLimiter, RateLimitError } from './rate-limiter';

describe('RateLimiter', () => {
  it('allows requests under limit', () => {
    const rl = new RateLimiter({ maxRequests: 10 });
    expect(() => rl.check()).not.toThrow();
  });

  it('tracks remaining requests', () => {
    const rl = new RateLimiter({ maxRequests: 5 });
    rl.record();
    rl.record();
    expect(rl.status().remaining).toBe(3);
  });

  it('throws RateLimitError when limit exceeded', () => {
    const rl = new RateLimiter({ maxRequests: 2 });
    rl.record();
    rl.record();
    expect(() => rl.check()).toThrow(RateLimitError);
  });

  it('resets after window expires', () => {
    vi.useFakeTimers();
    const rl = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    rl.record();
    rl.record();
    expect(rl.status().isLimited).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(rl.status().isLimited).toBe(false);
    expect(rl.status().remaining).toBe(2);
    vi.useRealTimers();
  });

  it('provides reset time', () => {
    const rl = new RateLimiter({ maxRequests: 10 });
    rl.record();
    const status = rl.status();
    expect(status.resetMs).toBeGreaterThan(0);
    expect(status.limit).toBe(10);
  });

  it('can be manually reset', () => {
    const rl = new RateLimiter({ maxRequests: 2 });
    rl.record();
    rl.record();
    rl.reset();
    expect(rl.status().remaining).toBe(2);
  });

  it('RateLimitError has status property', () => {
    const rl = new RateLimiter({ maxRequests: 1 });
    rl.record();
    try {
      rl.check();
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).status.isLimited).toBe(true);
    }
  });

  it('defaults to 1000 max requests', () => {
    const rl = new RateLimiter();
    expect(rl.status().limit).toBe(1000);
  });
});
