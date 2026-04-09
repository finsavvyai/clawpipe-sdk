import { describe, it, expect } from 'vitest';
import { Booster } from '../booster';

const b = new Booster();

describe('math-rules', () => {
  describe('percentage', () => {
    it('calculates percentage', () => {
      expect(b.tryResolve('what is 15% of 200')).toBe('30');
    });
    it('handles decimals', () => {
      expect(b.tryResolve('what is 50% of 10')).toBe('5');
    });
  });

  describe('percent_change', () => {
    it('calculates percent change', () => {
      expect(b.tryResolve('percent change from 100 to 150')).toBe('50%');
    });
    it('handles decrease', () => {
      expect(b.tryResolve('percentage change from 200 to 100')).toBe('-50%');
    });
  });

  describe('average', () => {
    it('calculates average', () => {
      expect(b.tryResolve('average of 10, 20, 30')).toBe('20');
    });
    it('handles "mean"', () => {
      expect(b.tryResolve('mean of 4, 6')).toBe('5');
    });
  });

  describe('median', () => {
    it('finds median of odd set', () => {
      expect(b.tryResolve('median of 1, 3, 5, 7, 9')).toBe('5');
    });
    it('finds median of even set', () => {
      expect(b.tryResolve('median of 1, 2, 3, 4')).toBe('2.5');
    });
  });

  describe('factorial', () => {
    it('computes factorial', () => {
      expect(b.tryResolve('factorial of 10')).toBe('3628800');
    });
    it('handles 0', () => {
      expect(b.tryResolve('factorial of 0')).toBe('1');
    });
  });

  describe('gcd', () => {
    it('finds GCD', () => {
      expect(b.tryResolve('GCD of 24 and 36')).toBe('12');
    });
  });

  describe('lcm', () => {
    it('finds LCM', () => {
      expect(b.tryResolve('LCM of 4 and 6')).toBe('12');
    });
  });

  describe('prime_check', () => {
    it('identifies prime', () => {
      expect(b.tryResolve('is 17 prime')).toBe('Yes');
    });
    it('identifies non-prime', () => {
      expect(b.tryResolve('is 4 prime')).toBe('No');
    });
  });

  describe('binary_convert', () => {
    it('converts to binary', () => {
      expect(b.tryResolve('convert 42 to binary')).toBe('101010');
    });
  });

  describe('hex_convert', () => {
    it('converts to hex', () => {
      expect(b.tryResolve('convert 255 to hex')).toBe('FF');
    });
  });

  describe('roman_numeral', () => {
    it('converts to roman', () => {
      expect(b.tryResolve('convert 2026 to roman')).toBe('MMXXVI');
    });
    it('converts small number', () => {
      expect(b.tryResolve('convert 4 to roman')).toBe('IV');
    });
  });
});
