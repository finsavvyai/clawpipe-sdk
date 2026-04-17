import { describe, it, expect } from 'vitest';
import { encodingRules } from './encoding-rules';

const find = (name: string) => encodingRules.find((r) => r.name === name)!;

describe('encodingRules', () => {
  it('url_encode', () => expect(find('url_encode').resolve('url encode hello world')).toBe('hello%20world'));
  it('url_decode', () => expect(find('url_decode').resolve('url decode hello%20world')).toBe('hello world'));
  it('hex_encode', () => expect(find('hex_encode').resolve('hex encode abc')).toBe('616263'));
  it('hex_decode', () => expect(find('hex_decode').resolve('hex decode 616263')).toBe('abc'));
  it('binary_from_num', () => expect(find('binary_from_num').resolve('binary 10')).toBe('1010'));
  it('octal', () => expect(find('octal').resolve('octal 8')).toBe('10'));
  it('json_minify', () => expect(find('json_minify').resolve('minify this json {"a": 1, "b": 2}')).toBe('{"a":1,"b":2}'));
  it('json_keys', () => expect(find('json_keys').resolve('list json keys {"a":1,"b":2}')).toBe('a, b'));
  it('char_count', () => expect(find('char_count').resolve('char count of hello')).toBe('5'));
  it('word_count', () => expect(find('word_count').resolve('word count of one two three')).toBe('3'));
});
