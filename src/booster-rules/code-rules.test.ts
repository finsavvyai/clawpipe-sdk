import { describe, it, expect } from 'vitest';
import { Booster } from '../booster';

const b = new Booster();

describe('code-rules', () => {
  describe('regex_test', () => {
    it('detects match', () => {
      expect(b.tryResolve('test regex /^\\d+$/ against 123')).toBe('Match');
    });
    it('detects no match', () => {
      expect(b.tryResolve('test regex /^\\d+$/ against abc')).toBe('No match');
    });
  });

  describe('color_convert', () => {
    it('converts hex to rgb', () => {
      expect(b.tryResolve('convert #8b5cf6 to rgb')).toBe('rgb(139, 92, 246)');
    });
    it('converts black', () => {
      expect(b.tryResolve('convert #000000 to rgb')).toBe('rgb(0, 0, 0)');
    });
  });

  describe('ip_check', () => {
    it('detects private IP', () => {
      expect(b.tryResolve('is 192.168.1.1 private')).toBe('Yes, private IPv4');
    });
    it('detects public IP', () => {
      expect(b.tryResolve('is 8.8.8.8 private')).toBe('No, public IPv4');
    });
    it('detects 10.x private', () => {
      expect(b.tryResolve('is 10.0.0.1 private')).toBe('Yes, private IPv4');
    });
  });

  describe('semver_compare', () => {
    it('compares greater', () => {
      expect(b.tryResolve('is 3.0.0 > 2.1.0')).toBe('Yes');
    });
    it('compares less', () => {
      expect(b.tryResolve('is 1.0.0 > 2.0.0')).toBe('No');
    });
    it('compares equal', () => {
      expect(b.tryResolve('is 1.2.3 == 1.2.3')).toBe('Yes');
    });
  });
});
