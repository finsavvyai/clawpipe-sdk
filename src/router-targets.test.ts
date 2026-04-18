import { describe, it, expect } from 'vitest';
import { leaf, fallback, loadbalance, resolveTargets } from './router-targets';

describe('router-targets', () => {
  it('leaf resolves to itself', () => {
    expect(resolveTargets(leaf('openai', 'gpt-4o'))).toEqual([{ provider: 'openai', model: 'gpt-4o' }]);
  });

  it('fallback flattens in order', () => {
    const t = fallback(leaf('a'), leaf('b'), leaf('c'));
    expect(resolveTargets(t)).toEqual([
      { provider: 'a', model: undefined },
      { provider: 'b', model: undefined },
      { provider: 'c', model: undefined },
    ]);
  });

  it('nested fallback-in-loadbalance resolves deterministically on single-target lb', () => {
    const t = loadbalance(leaf('a'));
    expect(resolveTargets(t)).toEqual([{ provider: 'a', model: undefined }]);
  });

  it('loadbalance produces a primary + fallbacks of length equal to tree size', () => {
    const t = loadbalance(leaf('a', undefined, 1), leaf('b', undefined, 1), leaf('c', undefined, 1));
    const r = resolveTargets(t);
    expect(r.length).toBe(3);
    const set = new Set(r.map((x) => x.provider));
    expect(set).toEqual(new Set(['a', 'b', 'c']));
  });

  it('nested fallback inside fallback flattens depth-first', () => {
    const t = fallback(leaf('a'), fallback(leaf('b'), leaf('c')), leaf('d'));
    const out = resolveTargets(t).map((x) => x.provider);
    expect(out).toEqual(['a', 'b', 'c', 'd']);
  });
});
