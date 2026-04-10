import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runAnalyze, formatReport } from './cli-analyze';
import {
  walkDir, countCallSites, detectModels, extractStrings, countBoostable,
  estimateFileCost, SKIP_DIRS,
} from './cli-analyze-helpers';
import { Booster } from './booster';

function mkTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cp-analyze-'));
}

describe('cli-analyze-helpers', () => {
  describe('walkDir', () => {
    let tmp: string;
    beforeEach(() => { tmp = mkTmp(); });
    afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

    it('finds scannable files and skips ignored dirs', () => {
      fs.writeFileSync(path.join(tmp, 'a.ts'), 'x');
      fs.writeFileSync(path.join(tmp, 'b.py'), 'x');
      fs.writeFileSync(path.join(tmp, 'ignored.md'), 'x');
      fs.mkdirSync(path.join(tmp, 'node_modules'));
      fs.writeFileSync(path.join(tmp, 'node_modules', 'nope.ts'), 'x');
      fs.mkdirSync(path.join(tmp, 'src'));
      fs.writeFileSync(path.join(tmp, 'src', 'c.tsx'), 'x');
      const files = walkDir(tmp);
      expect(files.length).toBe(3);
      expect(files.some((f) => f.includes('node_modules'))).toBe(false);
      expect(files.some((f) => f.endsWith('.md'))).toBe(false);
    });

    it('returns empty array when directory does not exist', () => {
      expect(walkDir('/nonexistent/xyzzy-path')).toEqual([]);
    });

    it('skips dot directories', () => {
      fs.mkdirSync(path.join(tmp, '.hidden'));
      fs.writeFileSync(path.join(tmp, '.hidden', 'x.ts'), 'x');
      expect(walkDir(tmp).length).toBe(0);
    });
  });

  describe('countCallSites', () => {
    it('detects openai chat.completions.create', () => {
      expect(countCallSites('openai.chat.completions.create({})')).toBe(1);
    });
    it('detects anthropic.messages.create', () => {
      expect(countCallSites('anthropic.messages.create({model:"x"})')).toBe(1);
    });
    it('detects new OpenAI and new Anthropic', () => {
      expect(countCallSites('const c = new OpenAI(); new Anthropic();')).toBe(2);
    });
    it('detects python imports', () => {
      expect(countCallSites('from openai import OpenAI\nfrom anthropic import Anthropic')).toBe(2);
    });
    it('detects langchain .invoke and .complete/.chat', () => {
      expect(countCallSites('llm.invoke("hi"); model.complete("x"); chain.chat("y")')).toBe(3);
    });
    it('returns 0 for non-LLM code', () => {
      expect(countCallSites('const x = 1 + 2;')).toBe(0);
    });
  });

  describe('detectModels', () => {
    it('finds gpt and claude model names', () => {
      const models = detectModels('model: "gpt-4o-mini", alt: "claude-3-opus"');
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('claude-3-opus');
    });
    it('deduplicates', () => {
      const models = detectModels('gpt-4o gpt-4o gpt-4o');
      expect(models.length).toBe(1);
    });
    it('returns empty array when no models', () => {
      expect(detectModels('no models here')).toEqual([]);
    });
  });

  describe('extractStrings / countBoostable', () => {
    it('extracts string literals and detects boostable', () => {
      const strings = extractStrings('openai.chat.completions.create({messages:[{content:"Calculate 2+2"}]})');
      expect(strings.some((s) => /Calculate/.test(s))).toBe(true);
      const b = new Booster();
      const boostable = countBoostable(b, ['Calculate 2+2', 'Random joke please']);
      expect(boostable).toBeGreaterThanOrEqual(1);
    });
    it('returns 0 boostable when none match', () => {
      const b = new Booster();
      expect(countBoostable(b, ['summarize this article about dogs'])).toBe(0);
    });
  });

  describe('estimateFileCost', () => {
    it('returns 0 for no call sites', () => {
      expect(estimateFileCost(['gpt-4o'], 0)).toBe(0);
    });
    it('scales with number of call sites', () => {
      const c1 = estimateFileCost(['gpt-4o'], 1);
      const c5 = estimateFileCost(['gpt-4o'], 5);
      expect(c5).toBeCloseTo(c1 * 5, 2);
    });
    it('uses default price when model unknown', () => {
      expect(estimateFileCost(['unknown-model'], 1)).toBeGreaterThan(0);
    });
  });

  it('SKIP_DIRS includes common ignores', () => {
    expect(SKIP_DIRS.has('node_modules')).toBe(true);
    expect(SKIP_DIRS.has('dist')).toBe(true);
  });
});

describe('runAnalyze', () => {
  let tmp: string;
  beforeEach(() => { tmp = mkTmp(); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  it('throws if path does not exist', () => {
    expect(() => runAnalyze('/nonexistent/cp-xyz')).toThrow();
  });

  it('returns empty report for empty directory', () => {
    const r = runAnalyze(tmp);
    expect(r.filesScanned).toBe(0);
    expect(r.filesWithCalls).toBe(0);
    expect(r.monthlyCostUsd).toBe(0);
  });

  it('produces report for sample project with llm calls', () => {
    fs.writeFileSync(path.join(tmp, 'chatbot.ts'), `
      import OpenAI from 'openai';
      const openai = new OpenAI();
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Calculate 42 * 10' }],
      });
    `);
    fs.writeFileSync(path.join(tmp, 'api.py'), `
      from anthropic import Anthropic
      client = Anthropic()
      r = client.messages.create(model='claude-3-opus', messages=[])
    `);
    fs.writeFileSync(path.join(tmp, 'notes.md'), 'ignored');
    const r = runAnalyze(tmp);
    expect(r.filesWithCalls).toBe(2);
    expect(r.totalCallSites).toBeGreaterThan(0);
    expect(r.models.some((m) => m.name === 'gpt-4o')).toBe(true);
    expect(r.monthlyCostUsd).toBeGreaterThan(0);
    expect(r.savings.total).toBeGreaterThan(0);
    expect(r.savings.percent).toBeGreaterThan(0);
    expect(r.monthlyCostWithClawPipeUsd).toBeLessThan(r.monthlyCostUsd);
    expect(r.topFiles.length).toBeGreaterThan(0);
  });

  it('respects limit option', () => {
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(
        path.join(tmp, `f${i}.ts`),
        `const o = new OpenAI(); o.chat.completions.create({model:'gpt-4o'});`,
      );
    }
    const r = runAnalyze(tmp, { limit: 2 });
    expect(r.topFiles.length).toBe(2);
  });

  it('formatReport produces a terminal string with key sections', () => {
    fs.writeFileSync(path.join(tmp, 'a.ts'), `new OpenAI(); openai.chat.completions.create({model:'gpt-4o-mini'});`);
    const r = runAnalyze(tmp);
    const out = formatReport(r);
    expect(out).toContain('ClawPipe Code Analysis');
    expect(out).toContain('Files scanned');
    expect(out).toContain('Estimated monthly');
    expect(out).toContain('Ready to save');
  });

  it('formatReport handles empty report', () => {
    const r = runAnalyze(tmp);
    const out = formatReport(r);
    expect(out).toContain('Files scanned:        0');
  });
});
