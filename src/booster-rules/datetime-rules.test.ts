import { describe, it, expect } from 'vitest';
import { Booster } from '../booster';

const b = new Booster();

describe('datetime-rules', () => {
  describe('days_between', () => {
    it('calculates days between dates', () => {
      expect(b.tryResolve('days between 2026-01-01 and 2026-04-10')).toBe('99');
    });
    it('handles reversed order', () => {
      expect(b.tryResolve('days between 2026-04-10 and 2026-01-01')).toBe('99');
    });
  });

  describe('add_days', () => {
    it('adds days to a date', () => {
      expect(b.tryResolve('add 30 days to 2026-04-10')).toBe('2026-05-10');
    });
    it('adds 1 day', () => {
      expect(b.tryResolve('add 1 day to 2026-12-31')).toBe('2027-01-01');
    });
  });

  describe('day_of_week', () => {
    it('finds day of week', () => {
      expect(b.tryResolve('what day is 2026-04-10')).toBe('Friday');
    });
    it('handles alternative phrasing', () => {
      expect(b.tryResolve('day of week for 2026-04-12')).toBe('Sunday');
    });
  });

  describe('is_weekend', () => {
    it('detects weekend', () => {
      expect(b.tryResolve('is 2026-04-12 a weekend')).toBe("Yes, it's Sunday");
    });
    it('detects weekday', () => {
      const r = b.tryResolve('is 2026-04-10 a weekend');
      expect(r).toMatch(/^No/);
    });
  });
});
