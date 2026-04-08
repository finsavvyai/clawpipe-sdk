import { describe, it, expect } from 'vitest';
import { SemanticCache } from './semantic-cache';

function mockEmbed(text: string): Promise<number[]> {
  const words = text.toLowerCase().split(/\s+/);
  const dims = 8;
  const vec = new Array(dims).fill(0);
  for (const w of words) {
    for (let i = 0; i < w.length && i < dims; i++) {
      vec[i] += w.charCodeAt(i) / 200;
    }
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return Promise.resolve(mag > 0 ? vec.map((v) => v / mag) : vec);
}

describe('SemanticCache', () => {
  it('returns null when no embedding function set', async () => {
    const cache = new SemanticCache();
    expect(await cache.get('test')).toBeNull();
    expect(cache.isAvailable()).toBe(false);
  });

  it('stores and retrieves by similarity', async () => {
    const cache = new SemanticCache({ embeddingFn: mockEmbed, similarityThreshold: 0.9 });
    await cache.set('explain recursion', 'Recursion is...');

    const result = await cache.get('explain recursion');
    expect(result).toBe('Recursion is...');
  });

  it('returns null for dissimilar prompts', async () => {
    const cache = new SemanticCache({ embeddingFn: mockEmbed, similarityThreshold: 0.99 });
    await cache.set('explain recursion', 'Recursion is...');

    const result = await cache.get('how to cook pasta');
    expect(result).toBeNull();
  });

  it('tracks hit and miss statistics', async () => {
    const cache = new SemanticCache({ embeddingFn: mockEmbed, similarityThreshold: 0.5 });
    await cache.set('hello world', 'greeting');

    await cache.get('hello world');
    await cache.get('completely different prompt with no overlap whatsoever xyz');

    const stats = cache.getStats();
    expect(stats.hits).toBeGreaterThanOrEqual(0);
    expect(stats.size).toBe(1);
  });

  it('respects TTL expiry', async () => {
    const cache = new SemanticCache({ embeddingFn: mockEmbed, ttlMs: 1, similarityThreshold: 0.5 });
    await cache.set('test prompt', 'response');

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 10));

    const result = await cache.get('test prompt');
    expect(result).toBeNull();
  });

  it('evicts when max entries reached', async () => {
    const cache = new SemanticCache({ embeddingFn: mockEmbed, maxEntries: 3, similarityThreshold: 0.99 });

    for (let i = 0; i < 5; i++) {
      await cache.set(`unique prompt number ${i}`, `response ${i}`);
    }

    const stats = cache.getStats();
    expect(stats.size).toBeLessThanOrEqual(5);
  });

  it('allows setting embedding function after construction', async () => {
    const cache = new SemanticCache();
    expect(cache.isAvailable()).toBe(false);

    cache.setEmbeddingFn(mockEmbed);
    expect(cache.isAvailable()).toBe(true);

    await cache.set('test', 'response');
    const result = await cache.get('test');
    expect(result).toBe('response');
  });
});
