import { describe, it, expect } from 'vitest';
import { Booster } from '../booster';

const b = new Booster();

describe('text-rules', () => {
  describe('extract_emails', () => {
    it('extracts emails', () => {
      expect(b.tryResolve('extract emails from: contact a@b.com')).toBe('a@b.com');
    });
    it('extracts multiple emails', () => {
      const r = b.tryResolve('find emails in: a@b.com and c@d.org');
      expect(r).toContain('a@b.com');
      expect(r).toContain('c@d.org');
    });
    it('returns message when none found', () => {
      expect(b.tryResolve('extract emails from: no emails here')).toBe('No emails found');
    });
  });

  describe('extract_urls', () => {
    it('extracts urls', () => {
      expect(b.tryResolve('extract urls from: visit https://x.com')).toBe('https://x.com');
    });
    it('extracts http urls', () => {
      expect(b.tryResolve('find urls in: go to http://example.com')).toBe('http://example.com');
    });
  });

  describe('extract_numbers', () => {
    it('extracts numbers', () => {
      expect(b.tryResolve('extract numbers from: I have 3 cats')).toBe('3');
    });
    it('extracts multiple numbers', () => {
      expect(b.tryResolve('find numbers in: 10 and 20')).toBe('10, 20');
    });
  });

  describe('markdown_strip', () => {
    it('strips bold', () => {
      expect(b.tryResolve('strip markdown: **bold**')).toBe('bold');
    });
    it('strips italic', () => {
      expect(b.tryResolve('strip markdown: *italic*')).toBe('italic');
    });
    it('strips links', () => {
      expect(b.tryResolve('strip markdown: [text](url)')).toBe('text');
    });
  });

  describe('html_strip', () => {
    it('strips HTML tags', () => {
      expect(b.tryResolve('strip HTML: <p>Hello</p>')).toBe('Hello');
    });
    it('strips nested tags', () => {
      expect(b.tryResolve('strip html: <div><span>Hi</span></div>')).toBe('Hi');
    });
  });
});
