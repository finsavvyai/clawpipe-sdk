import { describe, it, expect } from 'vitest';
import { Booster } from './booster';

describe('Booster', () => {
  const booster = new Booster();

  describe('tryResolve', () => {
    it('returns null for prompts no rule matches', () => {
      expect(booster.tryResolve('Tell me a joke')).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(booster.tryResolve('')).toBeNull();
    });
  });

  describe('json-format rule', () => {
    it('formats JSON from "format this json" prefix', () => {
      const result = booster.tryResolve('Format this JSON {"a":1,"b":2}');
      expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    it('formats JSON from "pretty print" prefix', () => {
      const result = booster.tryResolve('Pretty print {"x":[1,2]}');
      expect(result).toBe('{\n  "x": [\n    1,\n    2\n  ]\n}');
    });

    it('returns null when no JSON brace present', () => {
      expect(booster.tryResolve('Format this JSON')).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      // Invalid JSON triggers catch block, continues to next rule
      expect(booster.tryResolve('Format this JSON {invalid}')).toBeNull();
    });
  });

  describe('math rule', () => {
    it('evaluates addition', () => {
      expect(booster.tryResolve('Calculate 2 + 3')).toBe('5');
    });

    it('evaluates multiplication', () => {
      expect(booster.tryResolve('Compute 6 * 7')).toBe('42');
    });

    it('evaluates division', () => {
      expect(booster.tryResolve('What is 100 / 4')).toBe('25');
    });

    it('evaluates modulo', () => {
      expect(booster.tryResolve('Calculate 10 % 3')).toBe('1');
    });

    it('evaluates parentheses', () => {
      expect(booster.tryResolve('Evaluate (2 + 3) * 4')).toBe('20');
    });

    it('evaluates exponentiation with ^', () => {
      expect(booster.tryResolve('Calculate 2^3')).toBe('8');
    });

    it('handles order of operations', () => {
      expect(booster.tryResolve('Calculate 2 + 3 * 4')).toBe('14');
    });

    it('rejects non-math expressions', () => {
      expect(booster.tryResolve('Calculate foo + bar')).toBeNull();
    });

    it('handles "solve" prefix', () => {
      expect(booster.tryResolve('Solve 9 + 1')).toBe('10');
    });
  });

  describe('date rule', () => {
    it('resolves "what is the current date"', () => {
      const result = booster.tryResolve("What's the current date");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('resolves "today"', () => {
      const result = booster.tryResolve('today');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('skips long inputs with date keywords', () => {
      const longInput = 'What is the date ' + 'a'.repeat(60);
      expect(booster.tryResolve(longInput)).toBeNull();
    });
  });

  describe('unit-conversion rule', () => {
    it('converts km to miles', () => {
      const result = booster.tryResolve('Convert 10 km to miles');
      expect(result).toBe('10 km = 6.2137 miles');
    });

    it('converts celsius to fahrenheit', () => {
      const result = booster.tryResolve('Convert 100 c to f');
      expect(result).toBe('100 c = 212 f');
    });

    it('converts kg to lbs', () => {
      const result = booster.tryResolve('Convert 1 kg to lbs');
      expect(result).toBe('1 kg = 2.2046 lbs');
    });

    it('returns null for unknown units', () => {
      expect(booster.tryResolve('Convert 5 foo to bar')).toBeNull();
    });
  });

  describe('uuid rule', () => {
    it('generates a valid UUID', () => {
      const result = booster.tryResolve('Generate a UUID');
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('base64 rule', () => {
    it('encodes to base64', () => {
      const result = booster.tryResolve('Base64 encode hello');
      expect(result).toBe(Buffer.from('hello').toString('base64'));
    });

    it('decodes from base64', () => {
      const encoded = Buffer.from('world').toString('base64');
      const result = booster.tryResolve(`Base64 decode ${encoded}`);
      expect(result).toBe('world');
    });
  });

  describe('custom rules', () => {
    it('adds and uses a custom rule', () => {
      const b = new Booster();
      b.addRule({
        name: 'ping',
        test: (input) => input === 'ping',
        resolve: () => 'pong',
      });
      expect(b.tryResolve('ping')).toBe('pong');
    });

    it('reports correct ruleCount', () => {
      const b = new Booster();
      const defaultCount = b.ruleCount;
      b.addRule({ name: 'test', test: () => false, resolve: () => '' });
      expect(b.ruleCount).toBe(defaultCount + 1);
    });
  });
});
