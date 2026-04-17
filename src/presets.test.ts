import { describe, it, expect } from 'vitest';
import { QualityMode, CheapMode, BalancedMode, withPreset } from './presets';

describe('presets', () => {
  it('QualityMode disables cache and enforces guard block', () => {
    expect(QualityMode.enableCache).toBe(false);
    expect(QualityMode.guardBlockOnInjection).toBe(true);
  });

  it('CheapMode enables long-TTL cache and restricts allowlist', () => {
    expect(CheapMode.enableCache).toBe(true);
    expect(CheapMode.cacheTtlMs).toBe(24 * 60 * 60 * 1000);
    expect(CheapMode.allowlist?.length).toBeGreaterThan(0);
    expect(CheapMode.allowlist?.[0]?.provider).toBeTypeOf('string');
  });

  it('BalancedMode keeps all safeties on with 1h cache', () => {
    expect(BalancedMode.cacheTtlMs).toBe(60 * 60 * 1000);
    expect(BalancedMode.enableBooster).toBe(true);
  });

  it('withPreset merges preset over base', () => {
    const base = { apiKey: 'k', projectId: 'p', enableCache: true };
    const cfg = withPreset(base, QualityMode);
    expect(cfg.apiKey).toBe('k');
    expect(cfg.enableCache).toBe(false);
  });
});
