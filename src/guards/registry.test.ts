import { describe, it, expect } from 'vitest';
import { GuardRegistry, createDefaultGuards, defaultGuards } from './index';

describe('GuardRegistry', () => {
  it('registers and lists guards', () => {
    const r = new GuardRegistry();
    r.register({ name: 'x', preCall: () => ({ pass: true }) });
    expect(r.list()).toEqual(['x']);
  });

  it('runPre runs each guard in order', async () => {
    const r = createDefaultGuards();
    const res = await r.runPre(
      { prompt: 'my email is foo@bar.com' },
      [{ guard: 'pii_redact' }],
    );
    expect(res.allPass).toBe(true);
    expect(res.safePrompt).toContain('[EMAIL]');
  });

  it('blocks when blockOnFail and guard returns pass:false', async () => {
    const r = createDefaultGuards();
    const res = await r.runPre(
      { prompt: 'hello bomb' },
      [{ guard: 'contains', config: { words: ['bomb'] }, blockOnFail: true }],
    );
    expect(res.allPass).toBe(false);
    expect(res.outcomes[0].blocked).toBe(true);
  });

  it('does not block when blockOnFail:false', async () => {
    const r = createDefaultGuards();
    const res = await r.runPre(
      { prompt: 'hello bomb' },
      [{ guard: 'contains', config: { words: ['bomb'] }, blockOnFail: false }],
    );
    expect(res.allPass).toBe(false);
    expect(res.outcomes[0].blocked).toBe(false);
  });

  it('runPost validates JSON schema', async () => {
    const r = createDefaultGuards();
    const ok = await r.runPost('{"a":1}', { prompt: '' }, [{ guard: 'json_schema' }]);
    expect(ok.allPass).toBe(true);
    const bad = await r.runPost('not json', { prompt: '' }, [{ guard: 'json_schema' }]);
    expect(bad.allPass).toBe(false);
  });

  it('all 15 default guards register', () => {
    expect(defaultGuards.length).toBe(15);
    expect(createDefaultGuards().list().length).toBe(15);
  });

  it('word_count enforces min/max', async () => {
    const r = createDefaultGuards();
    const tooShort = await r.runPost('hi', { prompt: '' }, [{ guard: 'word_count', config: { min: 5 } }]);
    expect(tooShort.allPass).toBe(false);
    const ok = await r.runPost('one two three four five', { prompt: '' }, [{ guard: 'word_count', config: { min: 3, max: 10 } }]);
    expect(ok.allPass).toBe(true);
  });

  it('model_whitelist rejects non-listed model', async () => {
    const r = createDefaultGuards();
    const res = await r.runPre(
      { prompt: 'hi', model: 'gpt-3' },
      [{ guard: 'model_whitelist', config: { models: ['gpt-4o'] } }],
    );
    expect(res.allPass).toBe(false);
  });
});
