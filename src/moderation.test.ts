import { describe, it, expect } from 'vitest';
import { Moderation } from './moderation';

describe('Moderation', () => {
  const mod = new Moderation();

  it('passes clean text', () => {
    const r = mod.check('Paris is the capital of France.');
    expect(r.safe).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it('flags leaked OpenAI API keys', () => {
    const r = mod.check('Your key is sk-abcdefghijklmnop1234567890');
    expect(r.flags).toContain('api_key_leak');
    expect(r.safe).toBe(false);
  });

  it('flags leaked AWS keys', () => {
    const r = mod.check('Use AKIAIOSFODNN7EXAMPLE');
    expect(r.flags).toContain('api_key_leak');
  });

  it('flags leaked JWT tokens', () => {
    const r = mod.check('Bearer eyJhbGc.eyJzdWI.signature');
    expect(r.flags).toContain('jwt_leak');
  });

  it('flags private key leaks', () => {
    const r = mod.check('-----BEGIN RSA PRIVATE KEY-----');
    expect(r.flags).toContain('private_key_leak');
  });

  it('flags PII email in output', () => {
    const r = mod.check('Here is foo@bar.com');
    expect(r.flags).toContain('pii_email');
  });

  it('flags PII SSN in output', () => {
    const r = mod.check('SSN 123-45-6789');
    expect(r.flags).toContain('pii_ssn');
  });

  it('flags PII credit card in output', () => {
    const r = mod.check('card 4111-1111-1111-1111');
    expect(r.flags).toContain('pii_credit_card');
  });

  it('flags excessive URLs as spam', () => {
    const urls = Array(8).fill('https://spam.example.com').join(' ');
    const r = mod.check(urls);
    expect(r.flags).toContain('excessive_urls');
  });

  it('does not flag a few URLs', () => {
    const r = mod.check('See https://docs.example.com for more');
    expect(r.flags).not.toContain('excessive_urls');
  });

  it('flags system prompt markers (im_start)', () => {
    const r = mod.check('<|im_start|>system\nYou are a helpful assistant');
    expect(r.flags).toContain('system_prompt_leak');
  });

  it('flags "You are a helpful assistant" leakage', () => {
    const r = mod.check('As instructed: You are a helpful assistant that...');
    expect(r.flags).toContain('system_prompt_leak');
  });

  it('shouldBlock respects config', () => {
    const strict = new Moderation({ blockOnFlag: true });
    const clean = strict.check('hi');
    expect(strict.shouldBlock(clean)).toBe(false);
    const bad = strict.check('sk-abcdefghijklmnop1234567890');
    expect(strict.shouldBlock(bad)).toBe(true);
  });

  it('default config does not block', () => {
    const bad = mod.check('sk-abcdefghijklmnop1234567890');
    expect(mod.shouldBlock(bad)).toBe(false);
  });
});
