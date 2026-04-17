import { describe, it, expect } from 'vitest';
import { statsRules } from './stats-rules';

const find = (name: string) => statsRules.find((r) => r.name === name)!;

describe('statsRules', () => {
  it('min', () => expect(find('min').resolve('min of 3, 1, 4, 1, 5')).toBe('1'));
  it('max', () => expect(find('max').resolve('max of 3, 1, 4, 1, 5')).toBe('5'));
  it('sum', () => expect(find('sum').resolve('sum of 1, 2, 3, 4')).toBe('10'));
  it('product', () => expect(find('product').resolve('product of 2, 3, 4')).toBe('24'));
  it('range', () => expect(find('range').resolve('range of 1, 5, 3')).toBe('4'));
  it('stddev', () => expect(parseFloat(find('stddev').resolve('stddev of 2, 4, 4, 4, 5, 5, 7, 9'))).toBeCloseTo(2, 0));
  it('mode', () => expect(find('mode').resolve('mode of 1, 2, 2, 3')).toBe('2'));
  it('count', () => expect(find('count').resolve('count of 1, 2, 3, 4, 5')).toBe('5'));

  it('tests match correctly', () => {
    expect(find('sum').test('sum of 1,2,3')).toBe(true);
    expect(find('sum').test('hello world')).toBe(false);
  });
});
