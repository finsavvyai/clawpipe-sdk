/**
 * Rate Limiter — sliding window rate limiting.
 *
 * Tracks request count within a time window and enforces limits.
 * Configurable per tier: Free=1K/day, Pro=100K/day, Team=1M/day.
 */

export interface RateLimiterConfig {
  /** Max requests per window. */
  maxRequests: number;
  /** Window duration in ms. Default: 24 hours. */
  windowMs: number;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetMs: number;
  isLimited: boolean;
}

const ONE_DAY_MS = 86_400_000;

export class RateLimiter {
  private config: RateLimiterConfig;
  private timestamps: number[] = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests ?? 1000,
      windowMs: config.windowMs ?? ONE_DAY_MS,
    };
  }

  /** Check if a request is allowed. Throws RateLimitError if exceeded. */
  check(): RateLimitStatus {
    const status = this.status();
    if (status.isLimited) {
      throw new RateLimitError(status);
    }
    return status;
  }

  /** Record a request. */
  record(): void {
    this.prune();
    this.timestamps.push(Date.now());
  }

  /** Get current rate limit status. */
  status(): RateLimitStatus {
    this.prune();
    const count = this.timestamps.length;
    const remaining = Math.max(0, this.config.maxRequests - count);
    const oldest = this.timestamps[0];
    const resetMs = oldest
      ? Math.max(0, (oldest + this.config.windowMs) - Date.now())
      : this.config.windowMs;

    return {
      remaining,
      limit: this.config.maxRequests,
      resetMs,
      isLimited: count >= this.config.maxRequests,
    };
  }

  /** Reset the rate limiter. */
  reset(): void {
    this.timestamps = [];
  }

  /** Remove timestamps outside the window. */
  private prune(): void {
    const cutoff = Date.now() - this.config.windowMs;
    // Binary search for efficiency on large arrays
    let low = 0;
    let high = this.timestamps.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timestamps[mid] < cutoff) low = mid + 1;
      else high = mid;
    }
    if (low > 0) this.timestamps = this.timestamps.slice(low);
  }
}

export class RateLimitError extends Error {
  public readonly status: RateLimitStatus;

  constructor(status: RateLimitStatus) {
    const resetSec = Math.ceil(status.resetMs / 1000);
    super(`Rate limit exceeded: ${status.limit} requests per window. Resets in ${resetSec}s.`);
    this.name = 'RateLimitError';
    this.status = status;
  }
}
