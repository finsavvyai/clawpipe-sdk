import { describe, it, expect } from 'vitest';
import { Booster } from '../booster';

const b = new Booster();

describe('data-rules', () => {
  describe('csv_to_json', () => {
    it('converts CSV to JSON', () => {
      const r = b.tryResolve('CSV to JSON: name,age\nAlice,30');
      expect(JSON.parse(r!)).toEqual([{ name: 'Alice', age: '30' }]);
    });
  });

  describe('json_to_csv', () => {
    it('converts JSON to CSV', () => {
      const r = b.tryResolve('JSON to CSV: [{"a":1,"b":2}]');
      expect(r).toBe('a,b\n1,2');
    });
  });

  describe('url_encode', () => {
    it('encodes a string', () => {
      expect(b.tryResolve('URL encode: hello world')).toBe('hello%20world');
    });
    it('handles special chars', () => {
      expect(b.tryResolve('urlencode: a=b&c=d')).toBe('a%3Db%26c%3Dd');
    });
  });

  describe('url_decode', () => {
    it('decodes a string', () => {
      expect(b.tryResolve('URL decode: hello%20world')).toBe('hello world');
    });
  });

  describe('hex_encode', () => {
    it('encodes to hex', () => {
      expect(b.tryResolve('hex encode: hello')).toBe('68656c6c6f');
    });
  });

  describe('hex_decode', () => {
    it('decodes from hex', () => {
      expect(b.tryResolve('hex decode: 68656c6c6f')).toBe('hello');
    });
  });

  describe('sort_json_keys', () => {
    it('sorts keys alphabetically', () => {
      const r = b.tryResolve('sort keys: {"b":2,"a":1}');
      expect(r).toBe('{"a":1,"b":2}');
    });
  });

  describe('minify_json', () => {
    it('minifies JSON', () => {
      const r = b.tryResolve('minify JSON: { "a" : 1 }');
      expect(r).toBe('{"a":1}');
    });
  });
});
