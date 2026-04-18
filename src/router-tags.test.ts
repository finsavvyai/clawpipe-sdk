import { describe, it, expect } from 'vitest';
import { RouterTags } from './router-tags';

describe('RouterTags', () => {
  const candidates = [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-opus-4-7' },
    { provider: 'mistral', model: 'mistral-small' },
  ];

  it('passes candidates through when no rule matches', () => {
    const rt = new RouterTags([{ tag: 'eu', allow: [{ provider: 'mistral' }] }]);
    expect(rt.filter(candidates, { tags: ['us'] })).toEqual(candidates);
  });

  it('narrows by tag', () => {
    const rt = new RouterTags([{ tag: 'eu', allow: [{ provider: 'mistral' }] }]);
    const out = rt.filter(candidates, { tags: ['eu'] });
    expect(out).toEqual([{ provider: 'mistral', model: 'mistral-small' }]);
  });

  it('narrows by header regex', () => {
    const rt = new RouterTags([{
      headerMatch: { name: 'x-tenant', pattern: '^premium-' },
      allow: [{ provider: 'anthropic', model: 'claude-opus-4-7' }],
    }]);
    const out = rt.filter(candidates, { headers: { 'x-tenant': 'premium-acme' } });
    expect(out).toEqual([{ provider: 'anthropic', model: 'claude-opus-4-7' }]);
  });

  it('matches provider without model constraint', () => {
    const rt = new RouterTags([{ tag: 'cheap', allow: [{ provider: 'mistral' }] }]);
    expect(rt.filter(candidates, { tags: ['cheap'] })).toHaveLength(1);
  });

  it('addRule extends the ruleset', () => {
    const rt = new RouterTags();
    expect(rt.ruleCount).toBe(0);
    rt.addRule({ tag: 'x', allow: [] });
    expect(rt.ruleCount).toBe(1);
  });

  it('first-match semantics', () => {
    const rt = new RouterTags([
      { tag: 'eu', allow: [{ provider: 'mistral' }] },
      { tag: 'eu', allow: [{ provider: 'openai' }] },
    ]);
    const out = rt.filter(candidates, { tags: ['eu'] });
    expect(out).toEqual([{ provider: 'mistral', model: 'mistral-small' }]);
  });
});
