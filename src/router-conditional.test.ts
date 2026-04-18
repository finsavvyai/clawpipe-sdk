import { describe, it, expect } from 'vitest';
import { ConditionalRouter } from './router-conditional';

describe('ConditionalRouter', () => {
  const router = new ConditionalRouter([
    { if: { 'user.tier': { eq: 'pro' } }, route: { provider: 'anthropic', model: 'claude-opus-4-7' } },
    { if: { region: { in: ['eu', 'uk'] } }, route: { provider: 'mistral' } },
    { if: { cost_cap_cents: { lt: 10 } }, route: { provider: 'groq' } },
  ]);

  it('matches eq on nested path', () => {
    expect(router.resolve({ user: { tier: 'pro' } }))
      .toEqual({ provider: 'anthropic', model: 'claude-opus-4-7' });
  });

  it('matches in with array', () => {
    expect(router.resolve({ region: 'eu' })).toEqual({ provider: 'mistral' });
  });

  it('matches lt with number', () => {
    expect(router.resolve({ cost_cap_cents: 5 })).toEqual({ provider: 'groq' });
  });

  it('returns null when nothing matches', () => {
    expect(router.resolve({ region: 'us', cost_cap_cents: 100 })).toBeNull();
  });

  it('regex op', () => {
    const r = new ConditionalRouter([{ if: { name: { regex: '^pro-' } }, route: { provider: 'openai' } }]);
    expect(r.resolve({ name: 'pro-enterprise' })).toEqual({ provider: 'openai' });
    expect(r.resolve({ name: 'free' })).toBeNull();
  });

  it('exists op', () => {
    const r = new ConditionalRouter([{ if: { flag: { exists: true } }, route: { provider: 'x' } }]);
    expect(r.resolve({ flag: 1 })).toEqual({ provider: 'x' });
    expect(r.resolve({})).toBeNull();
  });

  it('all conditions must match (AND semantics)', () => {
    const r = new ConditionalRouter([{ if: { a: { eq: 1 }, b: { eq: 2 } }, route: { provider: 'x' } }]);
    expect(r.resolve({ a: 1, b: 2 })).toEqual({ provider: 'x' });
    expect(r.resolve({ a: 1, b: 3 })).toBeNull();
  });

  it('first match wins', () => {
    const r = new ConditionalRouter([
      { if: { x: { eq: 1 } }, route: { provider: 'A' } },
      { if: { x: { eq: 1 } }, route: { provider: 'B' } },
    ]);
    expect(r.resolve({ x: 1 })).toEqual({ provider: 'A' });
  });
});
