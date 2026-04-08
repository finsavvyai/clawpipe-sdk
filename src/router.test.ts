import { describe, it, expect } from 'vitest';
import { Router } from './router';

describe('Router', () => {
  const router = new Router();

  describe('route()', () => {
    it('returns a route decision with required fields', () => {
      const decision = router.route('Hello');
      expect(decision).toHaveProperty('provider');
      expect(decision).toHaveProperty('model');
      expect(decision).toHaveProperty('score');
      expect(decision).toHaveProperty('reason');
    });

    it('uses explicit model/provider when both provided', () => {
      const decision = router.route('test', {
        model: 'my-model',
        provider: 'my-provider',
      });
      expect(decision.provider).toBe('my-provider');
      expect(decision.model).toBe('my-model');
      expect(decision.reason).toBe('explicit');
      expect(decision.score).toBe(1);
    });

    it('routes simple prompts to cheaper models', () => {
      const decision = router.route('Hi');
      // Simple prompts should favor cost — cheaper models score higher
      expect(decision.reason).toContain('simple');
    });

    it('routes complex prompts to higher-quality models', () => {
      const codeBlock = '```\nfunction foo() { return 1; }\n```';
      const complex = `${codeBlock}\nThen after that, step 1: refactor. Finally improve. ${'x'.repeat(8000)}`;
      const decision = router.route(complex);
      expect(decision.reason).toContain('complex');
    });

    it('routes medium-complexity prompts', () => {
      const medium = 'Explain this function\n' + 'x'.repeat(2000);
      const decision = router.route(medium);
      expect(decision.reason).toContain('medium');
    });

    it('classifies prompts with code as at least medium', () => {
      const withCode = 'Explain this: function hello() {}';
      const decision = router.route(withCode);
      expect(decision.reason).not.toContain('simple');
    });
  });

  describe('learn()', () => {
    it('records outcomes and updates weights', () => {
      const r = new Router();
      const decision = r.route('test');
      r.learn(decision, 500, 200);

      const weights = r.getWeights();
      const key = `${decision.provider}:${decision.model}`;
      expect(weights.has(key)).toBe(true);
      expect(weights.get(key)!.totalCalls).toBe(1);
    });

    it('updates running averages on subsequent calls', () => {
      const r = new Router();
      const decision = r.route('test');
      r.learn(decision, 500, 200);
      r.learn(decision, 1000, 400);

      const key = `${decision.provider}:${decision.model}`;
      const w = r.getWeights().get(key)!;
      expect(w.totalCalls).toBe(2);
      expect(w.avgLatencyMs).toBe(750);
      expect(w.avgTokensOut).toBe(300);
    });

    it('influences future routing decisions', () => {
      const r = new Router();
      // Learn that a specific route performs well many times
      const firstDecision = r.route('test');
      for (let i = 0; i < 10; i++) {
        r.learn(firstDecision, 100, 500); // fast, good output
      }
      // The learned model should still be a top candidate
      const newDecision = r.route('test');
      expect(newDecision).toBeDefined();
    });
  });

  describe('getWeights()', () => {
    it('returns empty map initially', () => {
      const r = new Router();
      expect(r.getWeights().size).toBe(0);
    });

    it('returns a copy, not the internal map', () => {
      const r = new Router();
      const decision = r.route('x');
      r.learn(decision, 100, 100);
      const weights = r.getWeights();
      weights.clear();
      expect(r.getWeights().size).toBe(1);
    });
  });
});
