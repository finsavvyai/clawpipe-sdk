/**
 * ReasoningBank Cache — client-side in-memory prompt cache.
 *
 * Hash-based deduplication with TTL expiry. Identical prompts
 * return cached results in microseconds instead of calling the LLM.
 */

interface CacheEntry {
  value: string;
  createdAt: number;
  hits: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: string;
  totalSaved: number;
}

export class Cache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;
  private maxEntries: number;
  private totalHits = 0;
  private totalMisses = 0;

  constructor(ttlMs = 300_000, maxEntries = 10_000) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  /** Generate a cache key from prompt and options. */
  key(prompt: string, options: object = {}): string {
    const raw = JSON.stringify({ prompt, options });
    return this.hash(raw);
  }

  /** Get a cached value. Returns null if not found or expired.
   * Pass `{forceRefresh: true}` to bypass cache and invalidate the entry. */
  get(cacheKey: string, opts: { forceRefresh?: boolean } = {}): string | null {
    if (opts.forceRefresh) {
      this.store.delete(cacheKey);
      this.totalMisses++;
      return null;
    }
    const entry = this.store.get(cacheKey);
    if (!entry) {
      this.totalMisses++;
      return null;
    }

    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(cacheKey);
      this.totalMisses++;
      return null;
    }

    entry.hits++;
    this.totalHits++;
    return entry.value;
  }

  /** Store a value in cache. */
  set(cacheKey: string, value: string): void {
    this.evictIfFull();
    this.store.set(cacheKey, {
      value,
      createdAt: Date.now(),
      hits: 0,
    });
  }

  /** Check if a key exists and is not expired. */
  has(cacheKey: string): boolean {
    const entry = this.store.get(cacheKey);
    if (!entry) return false;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(cacheKey);
      return false;
    }
    return true;
  }

  /** Remove a specific entry. */
  delete(cacheKey: string): boolean {
    return this.store.delete(cacheKey);
  }

  /** Clear all cached entries. */
  clear(): void {
    this.store.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  /** Get cache performance stats. */
  stats(): CacheStats {
    const total = this.totalHits + this.totalMisses;
    const hitRate = total > 0 ? ((this.totalHits / total) * 100).toFixed(1) : '0.0';
    return {
      size: this.store.size,
      hits: this.totalHits,
      misses: this.totalMisses,
      hitRate: `${hitRate}%`,
      totalSaved: this.totalHits,
    };
  }

  /** Remove expired entries. */
  prune(): number {
    const now = Date.now();
    let removed = 0;
    for (const [k, entry] of this.store) {
      if (now - entry.createdAt > this.ttlMs) {
        this.store.delete(k);
        removed++;
      }
    }
    return removed;
  }

  /** Simple string hash using djb2 algorithm. */
  private hash(input: string): string {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
    }
    return `cp_${(hash >>> 0).toString(36)}`;
  }

  /** Evict least-hit entries when cache is full. */
  private evictIfFull(): void {
    if (this.store.size < this.maxEntries) return;

    const entries = Array.from(this.store.entries())
      .sort((a, b) => a[1].hits - b[1].hits);

    const toRemove = Math.ceil(this.maxEntries * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.store.delete(entries[i][0]);
    }
  }
}
