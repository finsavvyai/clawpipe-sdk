import { describe, it, expect } from 'vitest';
import { parseRateLimitPolicy, policyKey } from './rate-limit-policy';

describe('parseRateLimitPolicy', () => {
  it('parses the full form', () => {
    const r = parseRateLimitPolicy('1000;w=60;u=request;s=global');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.policy).toEqual({ quota: 1000, windowSeconds: 60, unit: 'request', scope: 'global' });
  });

  it('parses property scope', () => {
    const r = parseRateLimitPolicy('500;w=3600;u=cents;s=property:tenant_id');
    if (r.ok) expect(r.policy.scope).toEqual({ property: 'tenant_id' });
  });

  it('defaults window=60, unit=request, scope=global', () => {
    const r = parseRateLimitPolicy('42');
    if (r.ok) {
      expect(r.policy.windowSeconds).toBe(60);
      expect(r.policy.unit).toBe('request');
      expect(r.policy.scope).toBe('global');
    }
  });

  it('rejects bad quota', () => {
    expect(parseRateLimitPolicy('0;w=60').ok).toBe(false);
    expect(parseRateLimitPolicy('abc').ok).toBe(false);
  });

  it('rejects bad unit', () => {
    expect(parseRateLimitPolicy('1;u=bytes').ok).toBe(false);
  });

  it('rejects property scope without name', () => {
    expect(parseRateLimitPolicy('1;s=property:').ok).toBe(false);
  });

  it('policyKey builds scoped keys', () => {
    expect(policyKey({ quota: 1, windowSeconds: 60, unit: 'request', scope: 'global' }, {})).toBe('rl:global');
    expect(policyKey({ quota: 1, windowSeconds: 60, unit: 'request', scope: 'user' }, { userId: 'u1' })).toBe('rl:user:u1');
    expect(policyKey(
      { quota: 1, windowSeconds: 60, unit: 'request', scope: { property: 'tenant' } },
      { properties: { tenant: 'acme' } },
    )).toBe('rl:prop:tenant:acme');
  });
});
