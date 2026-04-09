/**
 * String transformation booster rules.
 */
import { BoosterRule } from './types';

const reverseRule: BoosterRule = {
  name: 'reverse_string',
  test: (i) => /^(?:reverse|flip|backwards)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:reverse|flip|backwards)\s+(.+)/i)!;
    return [...m[1].trim()].reverse().join('');
  },
};

const uppercaseRule: BoosterRule = {
  name: 'uppercase',
  test: (i) => /^(?:uppercase|upper case|to upper|upcase)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:uppercase|upper case|to upper|upcase)\s+(.+)/i)!;
    return m[1].trim().toUpperCase();
  },
};

const lowercaseRule: BoosterRule = {
  name: 'lowercase',
  test: (i) => /^(?:lowercase|lower case|to lower|downcase)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:lowercase|lower case|to lower|downcase)\s+(.+)/i)!;
    return m[1].trim().toLowerCase();
  },
};

const titleCaseRule: BoosterRule = {
  name: 'title_case',
  test: (i) => /^(?:title case|titlecase|capitalize)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:title case|titlecase|capitalize)\s+(.+)/i)!;
    return m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  },
};

const camelCaseRule: BoosterRule = {
  name: 'camel_case',
  test: (i) => /^(?:camelCase|camel case|to camel)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:camelCase|camel case|to camel)\s+(.+)/i)!;
    const words = m[1].trim().split(/[\s_-]+/);
    return words[0].toLowerCase() +
      words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
  },
};

const snakeCaseRule: BoosterRule = {
  name: 'snake_case',
  test: (i) => /^(?:snake_case|snake case|to snake)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:snake_case|snake case|to snake)\s+(.+)/i)!;
    return m[1].trim()
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  },
};

const kebabCaseRule: BoosterRule = {
  name: 'kebab_case',
  test: (i) => /^(?:kebab-case|kebab case|to kebab)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:kebab-case|kebab case|to kebab)\s+(.+)/i)!;
    return m[1].trim()
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  },
};

const countWordsRule: BoosterRule = {
  name: 'count_words',
  test: (i) => /^(?:count words|word count|how many words)\s+(?:in\s+)?(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:count words|word count|how many words)\s+(?:in\s+)?(.+)/i)!;
    return String(m[1].trim().split(/\s+/).filter(Boolean).length);
  },
};

const countCharsRule: BoosterRule = {
  name: 'count_chars',
  test: (i) => /^(?:count characters|char count|character count|count chars)\s+(?:in\s+)?(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:count characters|char count|character count|count chars)\s+(?:in\s+)?(.+)/i)!;
    return String(m[1].trim().length);
  },
};

const slugRule: BoosterRule = {
  name: 'slug',
  test: (i) => /^(?:slugify|slug|to slug)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:slugify|slug|to slug)\s+(.+)/i)!;
    return m[1].trim().toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },
};

export const stringRules: BoosterRule[] = [
  reverseRule, uppercaseRule, lowercaseRule, titleCaseRule,
  camelCaseRule, snakeCaseRule, kebabCaseRule,
  countWordsRule, countCharsRule, slugRule,
];
