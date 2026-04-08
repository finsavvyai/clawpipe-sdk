import { describe, it, expect } from 'vitest';
import { safeEvalMath } from './math-eval';

describe('safeEvalMath', () => {
  it('evaluates basic addition', () => {
    expect(safeEvalMath('2 + 3')).toBe(5);
  });

  it('evaluates subtraction', () => {
    expect(safeEvalMath('10 - 4')).toBe(6);
  });

  it('evaluates multiplication', () => {
    expect(safeEvalMath('6 * 7')).toBe(42);
  });

  it('evaluates division', () => {
    expect(safeEvalMath('20 / 4')).toBe(5);
  });

  it('evaluates modulo', () => {
    expect(safeEvalMath('10 % 3')).toBe(1);
  });

  it('evaluates exponentiation', () => {
    expect(safeEvalMath('2 ** 3')).toBe(8);
  });

  it('respects operator precedence', () => {
    expect(safeEvalMath('2 + 3 * 4')).toBe(14);
  });

  it('handles parentheses', () => {
    expect(safeEvalMath('(2 + 3) * 4')).toBe(20);
  });

  it('handles nested parentheses', () => {
    expect(safeEvalMath('((2 + 3) * (4 - 1))')).toBe(15);
  });

  it('handles negative numbers', () => {
    expect(safeEvalMath('-5 + 3')).toBe(-2);
  });

  it('handles decimals', () => {
    expect(safeEvalMath('3.5 * 2')).toBe(7);
  });

  it('throws on trailing garbage', () => {
    expect(() => safeEvalMath('2 + 3 abc')).toThrow('Unexpected character');
  });

  it('throws on empty expression', () => {
    expect(() => safeEvalMath('')).toThrow('Expected number');
  });

  it('handles right-associative exponentiation', () => {
    expect(safeEvalMath('2 ** 2 ** 3')).toBe(256);
  });

  it('handles complex expression', () => {
    expect(safeEvalMath('(10 + 5) * 2 / 3')).toBeCloseTo(10);
  });
});
