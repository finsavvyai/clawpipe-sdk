/** Fair-share rate limiter — split TPM/RPM across active keys in a group.
 *
 * Ported from LiteLLM. If 10 keys share a 1000-TPM group and only 4 are
 * actively sending right now, each of the 4 gets ~250 TPM dynamically
 * instead of a static ~100 TPM floor.
 */

interface KeyActivity {
  lastSeen: number;
  count: number;
}

export interface FairShareConfig {
  groupLimitPerWindow: number;
  windowMs: number;
  activeIfSeenWithinMs: number;
}

const ONE_MINUTE = 60_000;

export class FairShare {
  private keys = new Map<string, KeyActivity>();
  private cfg: FairShareConfig;

  constructor(cfg: Partial<FairShareConfig> = {}) {
    this.cfg = {
      groupLimitPerWindow: cfg.groupLimitPerWindow ?? 1000,
      windowMs: cfg.windowMs ?? ONE_MINUTE,
      activeIfSeenWithinMs: cfg.activeIfSeenWithinMs ?? ONE_MINUTE,
    };
  }

  record(keyId: string): void {
    this.prune();
    const now = Date.now();
    const cur = this.keys.get(keyId);
    if (cur && now - cur.lastSeen < this.cfg.windowMs) {
      cur.count += 1;
      cur.lastSeen = now;
    } else {
      this.keys.set(keyId, { lastSeen: now, count: 1 });
    }
  }

  /** Compute current fair-share quota for a key. */
  quotaFor(keyId: string): number {
    this.prune();
    const activeCount = this.activeKeys().length;
    const floor = Math.max(1, activeCount);
    return Math.floor(this.cfg.groupLimitPerWindow / floor);
  }

  /** Return true if the key is under its current fair-share quota. */
  isAllowed(keyId: string): boolean {
    const k = this.keys.get(keyId);
    const used = k?.count ?? 0;
    return used < this.quotaFor(keyId);
  }

  activeKeys(): string[] {
    const cutoff = Date.now() - this.cfg.activeIfSeenWithinMs;
    return [...this.keys.entries()].filter(([, a]) => a.lastSeen >= cutoff).map(([k]) => k);
  }

  reset(): void { this.keys.clear(); }

  private prune(): void {
    const cutoff = Date.now() - this.cfg.windowMs;
    for (const [k, a] of this.keys) if (a.lastSeen < cutoff) this.keys.delete(k);
  }
}
