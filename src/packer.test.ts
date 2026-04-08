import { describe, it, expect } from 'vitest';
import { Packer } from './packer';

describe('Packer', () => {
  const packer = new Packer();

  describe('pack()', () => {
    it('returns packed text and savings', () => {
      const result = packer.pack('Hello world');
      expect(result.packed).toBe('Hello world');
      expect(result.originalTokens).toBeGreaterThan(0);
      expect(result.packedTokens).toBeGreaterThan(0);
      expect(result.savings).toMatch(/^\d+%$/);
    });

    it('prepends system message when provided', () => {
      const result = packer.pack('user input', 'system msg');
      expect(result.packed).toContain('system msg');
      expect(result.packed).toContain('user input');
    });

    it('compresses multiple blank lines', () => {
      const input = 'line1\n\n\n\n\nline2';
      const result = packer.pack(input);
      expect(result.packed).toBe('line1\n\nline2');
    });

    it('trims trailing whitespace from lines', () => {
      const input = 'hello   \nworld   ';
      const result = packer.pack(input);
      expect(result.packed).toBe('hello\nworld');
    });

    it('deduplicates repeated long blocks', () => {
      const block = 'This is a long repeated block that should be deduplicated by the packer';
      const input = `${block}\n\n${block}\n\nUnique content`;
      const result = packer.pack(input);
      const occurrences = result.packed.split(block).length - 1;
      expect(occurrences).toBe(1);
    });

    it('keeps short duplicate blocks (under 50 chars)', () => {
      const block = 'short';
      const input = `${block}\n\n${block}`;
      const result = packer.pack(input);
      const occurrences = result.packed.split(block).length - 1;
      expect(occurrences).toBe(2);
    });

    it('strips eslint-disable comments', () => {
      const input = '// eslint-disable-next-line no-console\nconsole.log("hi")';
      const result = packer.pack(input);
      expect(result.packed).not.toContain('eslint-disable');
      expect(result.packed).toContain('console.log');
    });

    it('strips ts-ignore comments', () => {
      const input = '// @ts-ignore\nconst x = 1;';
      const result = packer.pack(input);
      expect(result.packed).not.toContain('@ts-ignore');
    });

    it('strips use strict', () => {
      const input = "'use strict';\nconst x = 1;";
      const result = packer.pack(input);
      expect(result.packed).not.toContain('use strict');
    });

    it('reports positive savings on compressible input', () => {
      const input = 'line1\n\n\n\n\nline2\n\n\n\n\nline3';
      const result = packer.pack(input);
      const savingsNum = parseInt(result.savings, 10);
      expect(savingsNum).toBeGreaterThan(0);
    });

    it('reports 0% savings when nothing to compress', () => {
      const result = packer.pack('x');
      expect(result.savings).toBe('0%');
    });
  });

  describe('estimateTokens()', () => {
    it('estimates ~4 chars per token', () => {
      expect(packer.estimateTokens('abcd')).toBe(1);
      expect(packer.estimateTokens('12345678')).toBe(2);
    });

    it('returns 0 for empty string', () => {
      expect(packer.estimateTokens('')).toBe(0);
    });
  });

  describe('truncation', () => {
    it('truncates input exceeding token budget', () => {
      const smallPacker = new Packer({ maxTokens: 10 }); // 40 chars max
      const input = 'a'.repeat(100);
      const result = smallPacker.pack(input);
      expect(result.packed.length).toBeLessThan(100);
      expect(result.packed).toContain('[Truncated');
    });
  });

  describe('config options', () => {
    it('skips whitespace compression when disabled', () => {
      const p = new Packer({ compressWhitespace: false });
      const input = 'hello   \nworld   ';
      const result = p.pack(input);
      expect(result.packed).toContain('hello   ');
    });

    it('skips deduplication when disabled', () => {
      const p = new Packer({ deduplication: false });
      const block = 'This is a long repeated block that should NOT be deduplicated now';
      const input = `${block}\n\n${block}`;
      const result = p.pack(input);
      const occurrences = result.packed.split(block).length - 1;
      expect(occurrences).toBe(2);
    });

    it('skips boilerplate stripping when disabled', () => {
      const p = new Packer({ stripBoilerplate: false });
      const input = '// eslint-disable-next-line\ncode()';
      const result = p.pack(input);
      expect(result.packed).toContain('eslint-disable');
    });
  });
});
