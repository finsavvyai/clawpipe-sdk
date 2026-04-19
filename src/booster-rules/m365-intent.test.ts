import { describe, it, expect } from 'vitest';
import { classifyM365Intent, getM365IntentRules } from './m365-intent';

describe('classifyM365Intent', () => {
  it('license_summary matches license queries', () => {
    expect(classifyM365Intent('how many licenses do we have')).toBe('license_summary');
    expect(classifyM365Intent('license count summary')).toBe('license_summary');
    expect(classifyM365Intent('what licenses does the tenant have')).toBe('license_summary');
    expect(classifyM365Intent('unused licenses')).toBe('license_summary');
  });

  it('user_summary matches user count queries', () => {
    expect(classifyM365Intent('how many users')).toBe('user_summary');
    expect(classifyM365Intent('user total')).toBe('user_summary');
    expect(classifyM365Intent('active user count')).toBe('user_summary');
  });

  it('inactive_users distinct from user_summary', () => {
    expect(classifyM365Intent('inactive users')).toBe('inactive_users');
    expect(classifyM365Intent('how many dormant accounts')).toBe('inactive_users');
  });

  it('mfa_status', () => {
    expect(classifyM365Intent('mfa status')).toBe('mfa_status');
    expect(classifyM365Intent('how many users without mfa')).toBe('mfa_status');
    expect(classifyM365Intent('mfa coverage')).toBe('mfa_status');
  });

  it('guest_audit', () => {
    expect(classifyM365Intent('how many guests')).toBe('guest_audit');
    expect(classifyM365Intent('external users')).toBe('guest_audit');
    expect(classifyM365Intent('b2b accounts')).toBe('guest_audit');
  });

  it('security_misconfig', () => {
    expect(classifyM365Intent('security issues')).toBe('security_misconfig');
    expect(classifyM365Intent("what's wrong with this tenant")).toBe('security_misconfig');
    expect(classifyM365Intent('legacy auth')).toBe('security_misconfig');
  });

  it('cis_score', () => {
    expect(classifyM365Intent('cis score')).toBe('cis_score');
    expect(classifyM365Intent('benchmark results')).toBe('cis_score');
  });

  it('returns null for unrelated queries', () => {
    expect(classifyM365Intent('explain recursion')).toBeNull();
    expect(classifyM365Intent('write a haiku')).toBeNull();
  });

  it('getM365IntentRules returns 7 categories', () => {
    expect(getM365IntentRules().length).toBe(7);
  });
});
