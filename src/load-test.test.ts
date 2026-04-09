import { describe, it, expect } from 'vitest';
import { RateLimiter, RateLimitError } from './rate-limiter';
import { CircuitBreaker } from './circuit-breaker';

describe('Rate limiter under load', () => {
  it('enforces limit at exactly maxRequests', () => {
    const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60_000 });

    for (let i = 0; i < 100; i++) {
      limiter.check();
      limiter.record();
    }

    expect(limiter.status().remaining).toBe(0);
    expect(limiter.status().isLimited).toBe(true);
    expect(() => limiter.check()).toThrow(RateLimitError);
  });

  it('handles 1000 rapid concurrent checks', () => {
    const limiter = new RateLimiter({ maxRequests: 1000, windowMs: 60_000 });
    let allowed = 0;
    let rejected = 0;

    for (let i = 0; i < 1500; i++) {
      try {
        limiter.check();
        limiter.record();
        allowed++;
      } catch {
        rejected++;
      }
    }

    expect(allowed).toBe(1000);
    expect(rejected).toBe(500);
    expect(limiter.status().isLimited).toBe(true);
  });

  it('recovers after window expires', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 50 });

    for (let i = 0; i < 5; i++) {
      limiter.check();
      limiter.record();
    }

    expect(() => limiter.check()).toThrow(RateLimitError);

    // Simulate window expiry by waiting
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const status = limiter.status();
        expect(status.isLimited).toBe(false);
        expect(status.remaining).toBe(5);
        resolve();
      }, 60);
    });
  });

  it('prune is efficient with binary search on large arrays', () => {
    const limiter = new RateLimiter({ maxRequests: 100_000, windowMs: 60_000 });

    // Fill with 50K requests
    for (let i = 0; i < 50_000; i++) {
      limiter.record();
    }

    const start = performance.now();
    limiter.status();
    const elapsed = performance.now() - start;

    // Status check should be fast even with 50K entries
    expect(elapsed).toBeLessThan(50); // Under 50ms
    expect(limiter.status().remaining).toBe(50_000);
  });
});

describe('Circuit breaker under load', () => {
  it('opens after threshold failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 5, recoveryMs: 100 });

    for (let i = 0; i < 5; i++) {
      cb.recordFailure('provider-a');
    }

    expect(cb.isAvailable('provider-a')).toBe(false);
    expect(cb.status('provider-a').state).toBe('open');
  });

  it('recovers to half-open after recoveryMs', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, recoveryMs: 50 });

    for (let i = 0; i < 3; i++) cb.recordFailure('provider-b');
    expect(cb.isAvailable('provider-b')).toBe(false);

    await new Promise((r) => setTimeout(r, 60));
    expect(cb.isAvailable('provider-b')).toBe(true);
    expect(cb.status('provider-b').state).toBe('half-open');
  });

  it('closes after successful request in half-open', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, recoveryMs: 30 });

    cb.recordFailure('provider-c');
    cb.recordFailure('provider-c');
    expect(cb.status('provider-c').state).toBe('open');

    await new Promise((r) => setTimeout(r, 40));
    cb.recordSuccess('provider-c');
    expect(cb.status('provider-c').state).toBe('closed');
  });

  it('handles multiple providers independently', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, recoveryMs: 1000 });

    for (let i = 0; i < 3; i++) cb.recordFailure('openai');
    cb.recordSuccess('anthropic');

    expect(cb.isAvailable('openai')).toBe(false);
    expect(cb.isAvailable('anthropic')).toBe(true);
  });
});
