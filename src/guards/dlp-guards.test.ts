import { describe, it, expect } from 'vitest';
import { createDlpGuards, dlpGuards } from './index';

describe('DLP guards', () => {
  it('exports 12 guards', () => {
    expect(dlpGuards.length).toBe(12);
  });

  it('redacts SSN', async () => {
    const r = createDlpGuards();
    const res = await r.runPre({ prompt: 'my ssn is 123-45-6789' }, [{ guard: 'dlp_ssn' }]);
    expect(res.safePrompt).toContain('[SSN]');
  });

  it('redacts credit card', async () => {
    const r = createDlpGuards();
    const res = await r.runPre({ prompt: 'card 4111-1111-1111-1111' }, [{ guard: 'dlp_credit_card' }]);
    expect(res.safePrompt).toContain('[CC]');
  });

  it('redacts email', async () => {
    const r = createDlpGuards();
    const res = await r.runPre({ prompt: 'reach me at foo@bar.com' }, [{ guard: 'dlp_email' }]);
    expect(res.safePrompt).toContain('[EMAIL]');
  });

  it('redacts IP', async () => {
    const r = createDlpGuards();
    const res = await r.runPre({ prompt: 'origin 192.168.1.42' }, [{ guard: 'dlp_ip' }]);
    expect(res.safePrompt).toContain('[IP]');
  });

  it('redacts API key leak', async () => {
    const r = createDlpGuards();
    const res = await r.runPre({ prompt: 'token sk-abcdef0123456789012345678901234567' }, [{ guard: 'dlp_api_key_leak' }]);
    expect(res.safePrompt).toContain('[API_KEY]');
  });

  it('block_ssn fails on hit', async () => {
    const r = createDlpGuards();
    const res = await r.runPre({ prompt: '123-45-6789' }, [{ guard: 'dlp_block_ssn', blockOnFail: true }]);
    expect(res.allPass).toBe(false);
  });

  it('chain multiple DLP rules', async () => {
    const r = createDlpGuards();
    const res = await r.runPre(
      { prompt: 'me: a@b.com phone 415-555-0100 ssn 123-45-6789' },
      [{ guard: 'dlp_email' }, { guard: 'dlp_phone' }, { guard: 'dlp_ssn' }],
    );
    expect(res.safePrompt).toContain('[EMAIL]');
    expect(res.safePrompt).toContain('[PHONE]');
    expect(res.safePrompt).toContain('[SSN]');
  });
});
