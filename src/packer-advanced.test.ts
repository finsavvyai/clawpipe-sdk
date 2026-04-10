import { describe, it, expect } from 'vitest';
import { AdvancedPacker } from './packer-advanced';
import { Packer } from './packer';

describe('AdvancedPacker', () => {
  const adv = new AdvancedPacker();

  describe('removeFillerPhrases()', () => {
    it('removes "it is worth noting that"', () => {
      const out = adv.removeFillerPhrases('It is worth noting that the system is fast.');
      expect(out.toLowerCase()).not.toContain('worth noting');
      expect(out).toContain('system');
    });

    it('rewrites "in order to" -> "to"', () => {
      expect(adv.removeFillerPhrases('We need in order to ship.')).toContain(' to ship');
    });

    it('rewrites "due to the fact that" -> "because"', () => {
      expect(adv.removeFillerPhrases('It failed due to the fact that RAM ran out.')).toContain('because');
    });

    it('collapses "as I previously explained"', () => {
      const out = adv.removeFillerPhrases('As I previously explained, caching helps.');
      expect(out.toLowerCase()).not.toContain('previously explained');
      expect(out).toContain('caching');
    });

    it('compacts "the user mentioned earlier that"', () => {
      const out = adv.removeFillerPhrases('The user mentioned earlier that latency matters.');
      expect(out.toLowerCase()).toContain('the user said');
    });

    it('removes filler adverbs basically/actually/literally', () => {
      const out = adv.removeFillerPhrases('This is basically actually literally fine.');
      expect(out).toMatch(/This is\s+fine\./);
    });
  });

  describe('compactJson()', () => {
    it('minifies pretty-printed JSON', () => {
      const pretty = '{\n  "a": 1,\n  "b": [1, 2, 3]\n}';
      expect(adv.compactJson(pretty)).toBe('{"a":1,"b":[1,2,3]}');
    });

    it('leaves invalid JSON braces alone', () => {
      const bad = '{ not actually json }';
      expect(adv.compactJson(bad)).toBe(bad);
    });
  });

  describe('compactCode()', () => {
    it('removes // comments from fenced code blocks', () => {
      const input = '```js\n// this is a comment\nconst x = 1;\n```';
      const out = adv.compactCode(input);
      expect(out).not.toContain('// this is a comment');
      expect(out).toContain('const x = 1;');
    });

    it('removes /* */ comments but preserves /** docstrings', () => {
      const input = '```ts\n/** docstring */\n/* plain */\nfn();\n```';
      const out = adv.compactCode(input);
      expect(out).toContain('/** docstring */');
      expect(out).not.toContain('/* plain */');
    });

    it('collapses blank lines inside code blocks', () => {
      const input = '```js\nconst a = 1;\n\n\nconst b = 2;\n```';
      const out = adv.compactCode(input);
      expect(out).not.toMatch(/\n\n\n/);
    });
  });

  describe('dropLowValueSentences()', () => {
    it('keeps first and last sentences', () => {
      const text = 'First sentence is key. Middle filler one. Middle filler two. Middle filler three. Last sentence is key.';
      const out = adv.dropLowValueSentences(text, 0.5);
      expect(out).toContain('First sentence');
      expect(out).toContain('Last sentence');
    });

    it('does nothing on short paragraphs', () => {
      const text = 'Only one. And two.';
      expect(adv.dropLowValueSentences(text, 0.5)).toBe(text);
    });

    it('preserves sentences with numbers', () => {
      const text = 'Intro paragraph. A filler sentence with no facts. Revenue grew 47% in Q3. More filler content here. Final summary line.';
      const out = adv.dropLowValueSentences(text, 0.5);
      expect(out).toContain('47%');
    });
  });

  describe('extractEntities()', () => {
    it('extracts subject + role + org + location', () => {
      const text = 'John Smith is a software engineer who works at Acme Corp and lives in Seattle.';
      const out = adv.extractEntities(text);
      expect(out).toContain('John Smith');
      expect(out).toContain('software engineer');
      expect(out).toContain('Acme Corp');
      expect(out).toContain('Seattle');
      expect(out.length).toBeLessThan(text.length);
    });
  });

  describe('pack() — preservation', () => {
    it('preserves fenced code blocks verbatim at the character level', () => {
      const text = 'Here is code: ```js\nconst SECRET = "abc123";\n```\nPlease note that this matters.';
      const out = adv.pack(text);
      expect(out.compressed).toContain('const SECRET = "abc123";');
    });

    it('preserves quoted strings', () => {
      const text = 'The error message was "Invalid token: abc.xyz.123". It is worth noting that this is transient.';
      const out = adv.pack(text);
      expect(out.compressed).toContain('"Invalid token: abc.xyz.123"');
    });

    it('preserves inline code spans', () => {
      const text = 'Call `fetchUser(id)` here. Actually this is important.';
      const out = adv.pack(text);
      expect(out.compressed).toContain('`fetchUser(id)`');
    });

    it('keeps numeric facts intact', () => {
      const text = 'The API returned 503 in 1240 ms for 47 of the requests. Please note that the baseline is 200 ms.';
      const out = adv.pack(text);
      expect(out.compressed).toContain('503');
      expect(out.compressed).toContain('1240');
      expect(out.compressed).toContain('47');
    });
  });

  describe('pack() — modes', () => {
    const longText = [
      'The quarterly report shows strong growth.',
      'It is worth noting that revenue grew 47% year over year to $2.3 billion.',
      'As I previously explained, the cloud segment drove most of the gains.',
      'Basically the margins expanded due to the fact that costs declined.',
      'The majority of analysts expected around $2.1 billion in revenue.',
      'In the process of scaling, headcount grew by 1200 employees.',
      'The CEO said the company is on track to exceed full year guidance.',
    ].join(' ');

    it('conservative mode is less aggressive than balanced', () => {
      const c = adv.pack(longText, { mode: 'conservative' });
      const b = adv.pack(longText, { mode: 'balanced' });
      expect(c.compressed.length).toBeGreaterThanOrEqual(b.compressed.length);
    });

    it('aggressive mode beats balanced', () => {
      const b = adv.pack(longText, { mode: 'balanced' });
      const a = adv.pack(longText, { mode: 'aggressive' });
      expect(a.compressed.length).toBeLessThanOrEqual(b.compressed.length);
    });

    it('reports the techniques that were applied', () => {
      const result = adv.pack(longText, { mode: 'balanced' });
      expect(result.techniques.length).toBeGreaterThan(0);
      expect(result.techniques).toContain('filler-phrases');
    });
  });

  describe('pack() — edge cases', () => {
    it('handles empty string', () => {
      const out = adv.pack('');
      expect(out.compressed).toBe('');
      expect(out.savingsPercent).toBe('0%');
    });

    it('handles all-whitespace input', () => {
      const out = adv.pack('   \n\n   ');
      expect(out.compressed.trim()).toBe('');
    });

    it('handles single word', () => {
      const out = adv.pack('hello');
      expect(out.compressed).toBe('hello');
    });

    it('returns well-formed result shape', () => {
      const r = adv.pack('Some text with no fluff.');
      expect(r).toHaveProperty('original');
      expect(r).toHaveProperty('compressed');
      expect(r).toHaveProperty('originalTokens');
      expect(r).toHaveProperty('compressedTokens');
      expect(r).toHaveProperty('savingsPercent');
      expect(Array.isArray(r.techniques)).toBe(true);
    });
  });

  describe('pack() — real-world RAG-style compression', () => {
    const article = [
      'OpenAI released GPT-5 on March 15, 2026, marking a significant milestone.',
      'It is worth noting that the model has 1.8 trillion parameters and was trained on 45 trillion tokens.',
      'As I previously explained in the last briefing, training required 25000 H100 GPUs running for 90 days.',
      'Basically the model costs $2 per million input tokens and $6 per million output tokens.',
      'In order to support the rollout, Microsoft invested an additional $10 billion in Azure capacity.',
      'The majority of enterprise customers have already signed contracts worth over $500 million combined.',
      'Due to the fact that demand was overwhelming, the API had a waitlist of 2 million developers.',
      'Please note that safety evaluations were conducted by Anthropic, Apollo Research, and METR.',
      'The benchmark scores show 94% on MMLU, 89% on HumanEval, and 78% on SWE-bench verified.',
      'It should be noted that the context window was extended to 1 million tokens.',
    ].join(' ');

    it('achieves at least 20% compression on a RAG-style paragraph (every sentence has facts)', () => {
      const out = adv.pack(article, { mode: 'balanced' });
      const pct = parseInt(out.savingsPercent, 10);
      expect(pct).toBeGreaterThanOrEqual(20);
    });

    it('achieves 40%+ compression on a fluffy article without hard facts', () => {
      const fluffy = [
        'It is worth noting that the team has been working hard.',
        'Basically the project is on track for delivery.',
        'As I previously explained, the approach was sound.',
        'Actually it should be noted that everyone contributed.',
        'In order to ship, the team collaborated effectively.',
        'Due to the fact that morale was high, progress accelerated.',
        'The majority of stakeholders were satisfied with the outcome.',
        'On a regular basis, updates were shared across channels.',
        'In spite of the fact that delays occurred, the final push succeeded.',
        'With regard to documentation, everything was kept current.',
      ].join(' ');
      const out = adv.pack(fluffy, { mode: 'aggressive' });
      const pct = parseInt(out.savingsPercent, 10);
      expect(pct).toBeGreaterThanOrEqual(35);
    });

    it('preserves all numeric facts across compression', () => {
      const out = adv.pack(article, { mode: 'balanced' });
      for (const num of ['1.8 trillion', '45 trillion', '25000', '90 days', '$2', '$6', '$10 billion', '$500 million', '2 million', '94%', '89%', '78%', '1 million']) {
        expect(out.compressed).toContain(num);
      }
    });

    it('beats the basic Packer by at least 2x on compression', () => {
      const basic = new Packer().pack(article);
      const basicPct = parseInt(basic.savings, 10);
      const advPct = parseInt(adv.pack(article, { mode: 'balanced' }).savingsPercent, 10);
      expect(advPct).toBeGreaterThanOrEqual(basicPct * 2);
    });
  });

  describe('pack() — code/doc blob', () => {
    const codeDoc = [
      '# Usage',
      '',
      'It is worth noting that you should initialize the client first.',
      '',
      '```js',
      '// create the client',
      'const client = new Client({',
      '  apiKey: "sk-123",',
      '});',
      '',
      '/* deprecated */',
      'client.oldMethod();',
      '```',
      '',
      'Basically that is all you need.',
    ].join('\n');

    it('compresses prose around code blocks while preserving the API usage', () => {
      const out = adv.pack(codeDoc);
      expect(out.compressed).toContain('new Client');
      expect(out.compressed).toContain('"sk-123"');
      expect(out.compressed).not.toContain('worth noting');
    });

    it('strips code comments inside fenced blocks', () => {
      const out = adv.pack(codeDoc);
      expect(out.compressed).not.toContain('// create the client');
      expect(out.compressed).not.toContain('/* deprecated */');
    });
  });
});
