import { describe, it, expect } from 'vitest';
import { Router, mergeWeights } from './router';
import type { LearnedWeight } from './router';

describe('Router', () => {
  const router = new Router();

  describe('route()', () => {
    it('returns a route decision with required fields', async () => {
      const decision = await router.route('Hello');
      expect(decision).toHaveProperty('provider');
      expect(decision).toHaveProperty('model');
      expect(decision).toHaveProperty('score');
      expect(decision).toHaveProperty('reason');
    });

    it('uses explicit model/provider when both provided', async () => {
      const decision = await router.route('test', {
        model: 'my-model',
        provider: 'my-provider',
      });
      expect(decision.provider).toBe('my-provider');
      expect(decision.model).toBe('my-model');
      expect(decision.reason).toBe('explicit');
      expect(decision.score).toBe(1);
    });

    it('routes simple prompts to cheaper models', async () => {
      const decision = await router.route('Hi');
      expect(decision.reason).toContain('simple');
    });

    it('routes complex prompts to higher-quality models', async () => {
      const codeBlock = '```\nfunction foo() { return 1; }\n```';
      const complex = `${codeBlock}\nThen after that, step 1: refactor. Finally improve. ${'x'.repeat(8000)}`;
      const decision = await router.route(complex);
      expect(decision.reason).toContain('complex');
    });

    it('routes medium-complexity prompts', async () => {
      const medium = 'Explain this function\n' + 'x'.repeat(2000);
      const decision = await router.route(medium);
      expect(decision.reason).toContain('medium');
    });

    it('classifies prompts with code as at least medium', async () => {
      const withCode = 'Explain this: function hello() {}';
      const decision = await router.route(withCode);
      expect(decision.reason).not.toContain('simple');
    });
  });

  describe('learn()', () => {
    it('records outcomes and updates weights', async () => {
      const r = new Router();
      const decision = await r.route('test');
      r.learn(decision, 500, 200);

      const weights = r.getWeights();
      const key = `${decision.provider}:${decision.model}`;
      expect(weights.has(key)).toBe(true);
      expect(weights.get(key)!.totalCalls).toBe(1);
    });

    it('updates running averages on subsequent calls', async () => {
      const r = new Router();
      const decision = await r.route('test');
      r.learn(decision, 500, 200);
      r.learn(decision, 1000, 400);

      const key = `${decision.provider}:${decision.model}`;
      const w = r.getWeights().get(key)!;
      expect(w.totalCalls).toBe(2);
      expect(w.avgLatencyMs).toBe(750);
      expect(w.avgTokensOut).toBe(300);
    });

    it('influences future routing decisions', async () => {
      const r = new Router();
      const firstDecision = await r.route('test');
      for (let i = 0; i < 10; i++) {
        r.learn(firstDecision, 100, 500);
      }
      const newDecision = await r.route('test');
      expect(newDecision).toBeDefined();
    });

    it('accepts optional qualityScore', async () => {
      const r = new Router();
      const decision = await r.route('test');
      r.learn(decision, 300, 150, 0.95);
      const key = `${decision.provider}:${decision.model}`;
      const w = r.getWeights().get(key)!;
      expect(w.totalCalls).toBe(1);
      expect(w.score).toBeGreaterThan(0);
    });
  });

  describe('getWeights() / setWeights()', () => {
    it('returns empty map initially', () => {
      const r = new Router();
      expect(r.getWeights().size).toBe(0);
    });

    it('returns a copy, not the internal map', async () => {
      const r = new Router();
      const decision = await r.route('x');
      r.learn(decision, 100, 100);
      const weights = r.getWeights();
      weights.clear();
      expect(r.getWeights().size).toBe(1);
    });

    it('setWeights replaces internal map', async () => {
      const r = new Router();
      const w: LearnedWeight = { totalCalls: 5, avgLatencyMs: 200, avgTokensOut: 100, score: 0.9 };
      r.setWeights(new Map([['groq:llama-3.1-8b-instant', w]]));
      expect(r.getWeights().get('groq:llama-3.1-8b-instant')).toEqual(w);
    });
  });

  describe('getAllWeights()', () => {
    it('returns plain object with same keys as map', async () => {
      const r = new Router();
      const decision = await r.route('test');
      r.learn(decision, 200, 100);
      const plain = r.getAllWeights();
      const key = `${decision.provider}:${decision.model}`;
      expect(typeof plain).toBe('object');
      expect(plain[key]).toBeDefined();
      expect(plain[key].totalCalls).toBe(1);
    });
  });
});

describe('mergeWeights()', () => {
  it('keeps local-only keys', () => {
    const local: Record<string, LearnedWeight> = {
      'a:b': { totalCalls: 3, avgLatencyMs: 300, avgTokensOut: 100, score: 0.8 },
    };
    const merged = mergeWeights(local, {});
    expect(merged['a:b'].totalCalls).toBe(3);
  });

  it('keeps remote-only keys', () => {
    const remote: Record<string, LearnedWeight> = {
      'c:d': { totalCalls: 2, avgLatencyMs: 200, avgTokensOut: 50, score: 0.7 },
    };
    const merged = mergeWeights({}, remote);
    expect(merged['c:d'].totalCalls).toBe(2);
  });

  it('merges overlapping keys via weighted average', () => {
    const local: Record<string, LearnedWeight> = {
      'a:b': { totalCalls: 2, avgLatencyMs: 400, avgTokensOut: 200, score: 0.6 },
    };
    const remote: Record<string, LearnedWeight> = {
      'a:b': { totalCalls: 2, avgLatencyMs: 200, avgTokensOut: 100, score: 0.8 },
    };
    const merged = mergeWeights(local, remote);
    expect(merged['a:b'].totalCalls).toBe(4);
    expect(merged['a:b'].avgLatencyMs).toBe(300);
    expect(merged['a:b'].avgTokensOut).toBe(150);
    expect(merged['a:b'].score).toBeCloseTo(0.7);
  });

  it('handles empty inputs', () => {
    expect(mergeWeights({}, {})).toEqual({});
  });
});
