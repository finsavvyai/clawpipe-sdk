import { describe, it, expect } from 'vitest';
import { Booster } from '../booster';

const b = new Booster();

describe('string-rules', () => {
  describe('reverse_string', () => {
    it('reverses a word', () => expect(b.tryResolve('reverse hello')).toBe('olleh'));
    it('handles "flip"', () => expect(b.tryResolve('flip abcde')).toBe('edcba'));
    it('handles "backwards"', () => expect(b.tryResolve('backwards abc')).toBe('cba'));
  });

  describe('uppercase', () => {
    it('uppercases text', () => expect(b.tryResolve('uppercase hello world')).toBe('HELLO WORLD'));
    it('handles "to upper"', () => expect(b.tryResolve('to upper abc')).toBe('ABC'));
  });

  describe('lowercase', () => {
    it('lowercases text', () => expect(b.tryResolve('lowercase HELLO')).toBe('hello'));
    it('handles "downcase"', () => expect(b.tryResolve('downcase ABC')).toBe('abc'));
  });

  describe('title_case', () => {
    it('title-cases text', () => expect(b.tryResolve('title case hello world')).toBe('Hello World'));
    it('handles "capitalize"', () => expect(b.tryResolve('capitalize foo bar')).toBe('Foo Bar'));
  });

  describe('camel_case', () => {
    it('camelCases words', () => expect(b.tryResolve('camelCase hello world')).toBe('helloWorld'));
    it('handles underscored input', () => expect(b.tryResolve('camel case foo_bar')).toBe('fooBar'));
  });

  describe('snake_case', () => {
    it('snake_cases camelCase', () => expect(b.tryResolve('snake_case helloWorld')).toBe('hello_world'));
    it('snake_cases spaces', () => expect(b.tryResolve('snake case hello world')).toBe('hello_world'));
  });

  describe('kebab_case', () => {
    it('kebab-cases words', () => expect(b.tryResolve('kebab-case hello world')).toBe('hello-world'));
    it('kebab-cases camelCase', () => expect(b.tryResolve('kebab case helloWorld')).toBe('hello-world'));
  });

  describe('count_words', () => {
    it('counts words', () => expect(b.tryResolve('count words in hello world')).toBe('2'));
    it('counts more words', () => expect(b.tryResolve('count words a b c d')).toBe('4'));
  });

  describe('count_chars', () => {
    it('counts characters', () => expect(b.tryResolve('count characters in hello')).toBe('5'));
    it('counts with "count chars"', () => expect(b.tryResolve('count chars in abc')).toBe('3'));
  });

  describe('slug', () => {
    it('slugifies text', () => expect(b.tryResolve('slugify Hello World!')).toBe('hello-world'));
    it('removes special chars', () => expect(b.tryResolve('slug A B & C')).toBe('a-b-c'));
  });
});
