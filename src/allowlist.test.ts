import { describe, it, expect } from 'vitest';
import { Allowlist } from './allowlist';

describe('Allowlist', () => {
  describe('with no config', () => {
    it('permits everything', () => {
      const al = new Allowlist();
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(true);
      expect(al.isPermitted('anything', 'anything')).toBe(true);
    });
  });

  describe('allowlist only', () => {
    it('permits only listed models', () => {
      const al = new Allowlist({
        allow: [
          { provider: 'openai', model: 'gpt-4o' },
          { provider: 'anthropic' }, // all anthropic models
        ],
      });
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(true);
      expect(al.isPermitted('openai', 'gpt-4o-mini')).toBe(false);
      expect(al.isPermitted('anthropic', 'claude-3-haiku')).toBe(true);
      expect(al.isPermitted('anthropic', 'claude-opus-4')).toBe(true);
      expect(al.isPermitted('deepseek', 'deepseek-chat')).toBe(false);
    });
  });

  describe('denylist only', () => {
    it('blocks listed models, allows rest', () => {
      const al = new Allowlist({
        deny: [{ provider: 'openai', model: 'gpt-4o' }],
      });
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(false);
      expect(al.isPermitted('openai', 'gpt-4o-mini')).toBe(true);
      expect(al.isPermitted('anthropic', 'claude-3-haiku')).toBe(true);
    });

    it('blocks entire provider', () => {
      const al = new Allowlist({
        deny: [{ provider: 'deepseek' }],
      });
      expect(al.isPermitted('deepseek', 'deepseek-chat')).toBe(false);
      expect(al.isPermitted('deepseek', 'any-model')).toBe(false);
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(true);
    });
  });

  describe('both allow and deny', () => {
    it('deny takes precedence over allow', () => {
      const al = new Allowlist({
        allow: [{ provider: 'openai' }],
        deny: [{ provider: 'openai', model: 'gpt-4o' }],
      });
      expect(al.isPermitted('openai', 'gpt-4o-mini')).toBe(true);
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(false);
    });
  });

  describe('filterPermitted', () => {
    it('filters candidates', () => {
      const al = new Allowlist({
        allow: [{ provider: 'openai' }],
      });
      const candidates = [
        { provider: 'openai', model: 'gpt-4o', score: 1 },
        { provider: 'anthropic', model: 'claude-3-haiku', score: 2 },
      ];
      const filtered = al.filterPermitted(candidates);
      expect(filtered.length).toBe(1);
      expect(filtered[0].provider).toBe('openai');
    });
  });

  describe('runtime mutations', () => {
    it('adds to allowlist at runtime', () => {
      const al = new Allowlist({ allow: [{ provider: 'openai' }] });
      expect(al.isPermitted('anthropic', 'claude')).toBe(false);
      al.addAllow({ provider: 'anthropic' });
      expect(al.isPermitted('anthropic', 'claude')).toBe(true);
    });

    it('adds to denylist at runtime', () => {
      const al = new Allowlist();
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(true);
      al.addDeny({ provider: 'openai', model: 'gpt-4o' });
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(false);
    });

    it('removes from allowlist', () => {
      const al = new Allowlist({ allow: [{ provider: 'openai' }, { provider: 'anthropic' }] });
      al.removeAllow('openai');
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(false);
      expect(al.isPermitted('anthropic', 'claude')).toBe(true);
    });

    it('removes from denylist', () => {
      const al = new Allowlist({ deny: [{ provider: 'openai', model: 'gpt-4o' }] });
      al.removeDeny('openai', 'gpt-4o');
      expect(al.isPermitted('openai', 'gpt-4o')).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('returns a copy of config', () => {
      const al = new Allowlist({ allow: [{ provider: 'x' }], deny: [{ provider: 'y' }] });
      const cfg = al.getConfig();
      expect(cfg.allow).toEqual([{ provider: 'x' }]);
      expect(cfg.deny).toEqual([{ provider: 'y' }]);
      cfg.allow.push({ provider: 'z' });
      expect(al.getConfig().allow.length).toBe(1); // original unchanged
    });
  });
});
