import { describe, it, expect } from 'vitest';
import { Telemetry } from './telemetry';

describe('Telemetry', () => {
  it('starts with empty snapshot', () => {
    const t = new Telemetry();
    const s = t.snapshot();
    expect(s.totalRequests).toBe(0);
    expect(s.totalCostUsd).toBe(0);
    expect(s.cacheHitRate).toBe('0.0%');
  });

  it('records and aggregates requests', () => {
    const t = new Telemetry();
    t.record({ provider: 'openai', model: 'gpt-4o-mini', tokensIn: 100, tokensOut: 50, latencyMs: 500, costUsd: 0.02, cached: false, boosted: false });
    t.record({ provider: 'openai', model: 'gpt-4o-mini', tokensIn: 200, tokensOut: 100, latencyMs: 600, costUsd: 0.04, cached: true, boosted: false });
    const s = t.snapshot();
    expect(s.totalRequests).toBe(2);
    expect(s.totalTokensIn).toBe(300);
    expect(s.totalTokensOut).toBe(150);
    expect(s.totalCostUsd).toBe(0.06);
    expect(s.totalSavedByCache).toBe(1);
    expect(s.avgLatencyMs).toBe(550);
    expect(s.cacheHitRate).toBe('50.0%');
  });

  it('tracks top models', () => {
    const t = new Telemetry();
    for (let i = 0; i < 5; i++) {
      t.record({ provider: 'openai', model: 'gpt-4o', tokensIn: 10, tokensOut: 10, latencyMs: 100, costUsd: 0.01, cached: false, boosted: false });
    }
    t.record({ provider: 'anthropic', model: 'claude-3-haiku', tokensIn: 10, tokensOut: 10, latencyMs: 100, costUsd: 0.005, cached: false, boosted: false });
    const s = t.snapshot();
    expect(s.topModels[0].model).toBe('openai:gpt-4o');
    expect(s.topModels[0].calls).toBe(5);
  });

  it('estimates cost for known models', () => {
    const t = new Telemetry();
    const cost = t.estimateCost('openai', 'gpt-4o', 1000, 0);
    expect(cost).toBeCloseTo(0.0025, 4);
  });

  it('uses fallback rate for unknown models', () => {
    const t = new Telemetry();
    const cost = t.estimateCost('unknown', 'unknown', 1000, 0);
    expect(cost).toBeCloseTo(0.015, 4);
  });

  it('returns recent records within window', () => {
    const t = new Telemetry();
    t.record({ provider: 'a', model: 'b', tokensIn: 10, tokensOut: 10, latencyMs: 10, costUsd: 0.01, cached: false, boosted: false });
    const recent = t.recent(60_000);
    expect(recent.length).toBe(1);
  });

  it('computes totalCostInWindow', () => {
    const t = new Telemetry();
    t.record({ provider: 'a', model: 'b', tokensIn: 10, tokensOut: 10, latencyMs: 10, costUsd: 0.05, cached: false, boosted: false });
    expect(t.totalCostInWindow(60_000)).toBe(0.05);
  });

  it('resets all data', () => {
    const t = new Telemetry();
    t.record({ provider: 'a', model: 'b', tokensIn: 10, tokensOut: 10, latencyMs: 10, costUsd: 0.01, cached: false, boosted: false });
    t.reset();
    expect(t.snapshot().totalRequests).toBe(0);
  });

  it('evicts old records when maxRecords exceeded', () => {
    const t = new Telemetry(5);
    for (let i = 0; i < 10; i++) {
      t.record({ provider: 'a', model: 'b', tokensIn: 1, tokensOut: 1, latencyMs: 1, costUsd: 0.001, cached: false, boosted: false });
    }
    expect(t.snapshot().totalRequests).toBeLessThanOrEqual(6);
  });

  it('tracks booster hits', () => {
    const t = new Telemetry();
    t.record({ provider: '', model: '', tokensIn: 0, tokensOut: 0, latencyMs: 1, costUsd: 0, cached: false, boosted: true });
    expect(t.snapshot().totalSavedByBooster).toBe(1);
  });
});
