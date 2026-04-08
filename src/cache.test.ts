import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cache } from './cache';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(1000); // 1s TTL for tests
  });

  describe('key()', () => {
    it('generates deterministic keys', () => {
      const k1 = cache.key('hello', { model: 'gpt-4' });
      const k2 = cache.key('hello', { model: 'gpt-4' });
      expect(k1).toBe(k2);
    });

    it('generates different keys for different prompts', () => {
      const k1 = cache.key('hello');
      const k2 = cache.key('world');
      expect(k1).not.toBe(k2);
    });

    it('generates keys with cp_ prefix', () => {
      const k = cache.key('test');
      expect(k).toMatch(/^cp_/);
    });
  });

  describe('get() / set()', () => {
    it('returns null for missing key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('stores and retrieves a value', () => {
      const key = cache.key('prompt');
      cache.set(key, 'response');
      expect(cache.get(key)).toBe('response');
    });

    it('returns null for expired entries', () => {
      const shortCache = new Cache(1); // 1ms TTL
      const key = shortCache.key('prompt');
      shortCache.set(key, 'response');

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);
      expect(shortCache.get(key)).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('has()', () => {
    it('returns false for missing key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('returns true for existing key', () => {
      const key = cache.key('test');
      cache.set(key, 'val');
      expect(cache.has(key)).toBe(true);
    });

    it('returns false for expired key', () => {
      const shortCache = new Cache(1);
      const key = shortCache.key('test');
      shortCache.set(key, 'val');

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);
      expect(shortCache.has(key)).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('delete()', () => {
    it('removes an entry', () => {
      const key = cache.key('test');
      cache.set(key, 'val');
      expect(cache.delete(key)).toBe(true);
      expect(cache.get(key)).toBeNull();
    });

    it('returns false for nonexistent key', () => {
      expect(cache.delete('nope')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('removes all entries and resets stats', () => {
      cache.set(cache.key('a'), '1');
      cache.set(cache.key('b'), '2');
      cache.clear();
      expect(cache.stats().size).toBe(0);
      expect(cache.stats().hits).toBe(0);
      expect(cache.stats().misses).toBe(0);
    });
  });

  describe('stats()', () => {
    it('tracks hits and misses', () => {
      const key = cache.key('prompt');
      cache.get(key); // miss
      cache.set(key, 'resp');
      cache.get(key); // hit
      cache.get(key); // hit

      const s = cache.stats();
      expect(s.hits).toBe(2);
      expect(s.misses).toBe(1);
      expect(s.hitRate).toBe('66.7%');
      expect(s.size).toBe(1);
    });

    it('returns 0.0% hit rate when no requests', () => {
      expect(cache.stats().hitRate).toBe('0.0%');
    });
  });

  describe('prune()', () => {
    it('removes expired entries', () => {
      const shortCache = new Cache(1);
      shortCache.set(shortCache.key('a'), '1');
      shortCache.set(shortCache.key('b'), '2');

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);
      const removed = shortCache.prune();
      expect(removed).toBe(2);
      expect(shortCache.stats().size).toBe(0);
      vi.useRealTimers();
    });

    it('keeps non-expired entries', () => {
      cache.set(cache.key('a'), '1');
      const removed = cache.prune();
      expect(removed).toBe(0);
      expect(cache.stats().size).toBe(1);
    });
  });

  describe('eviction', () => {
    it('evicts least-hit entries when full', () => {
      const tinyCache = new Cache(60_000, 5);
      for (let i = 0; i < 5; i++) {
        tinyCache.set(`key${i}`, `val${i}`);
      }
      // Hit key0 many times so it survives eviction
      tinyCache.get('key0');
      tinyCache.get('key0');
      tinyCache.get('key0');

      // Adding one more triggers eviction
      tinyCache.set('key5', 'val5');
      expect(tinyCache.stats().size).toBeLessThanOrEqual(5);
    });
  });
});
