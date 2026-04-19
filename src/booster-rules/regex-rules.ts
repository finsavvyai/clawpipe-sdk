/** Regex-style booster rules — extract / transform without LLM. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const extractEmails: BoosterRule = {
  name: 'extract_emails',
  test: (i) => /^extract\s+emails?\s+(?:from\s+)?/i.test(i),
  resolve: (i) => (i.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? []).join(', ') || 'none',
};

const extractUrls: BoosterRule = {
  name: 'extract_urls',
  test: (i) => /^extract\s+urls?\s+(?:from\s+)?/i.test(i),
  resolve: (i) => (i.match(/https?:\/\/\S+/g) ?? []).join(', ') || 'none',
};

const extractIps: BoosterRule = {
  name: 'extract_ips',
  test: (i) => /^extract\s+(?:ip\s+addresses|ips)\s+(?:from\s+)?/i.test(i),
  resolve: (i) => (i.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? []).join(', ') || 'none',
};

const extractNumbers: BoosterRule = {
  name: 'extract_numbers',
  test: (i) => /^extract\s+numbers?\s+(?:from\s+)?/i.test(i),
  resolve: (i) => (i.match(/-?\d+(?:\.\d+)?/g) ?? []).join(', ') || 'none',
};

const slugify: BoosterRule = {
  name: 'slugify',
  test: (i) => /^slugify\s+(.+)/i.test(i),
  resolve: (i) => m(i, /^slugify\s+(.+)/i)![1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
};

const camelCase: BoosterRule = {
  name: 'camel_case',
  test: (i) => /^(?:to\s+)?camelcase\s+(.+)/i.test(i),
  resolve: (i) => {
    const s = m(i, /^(?:to\s+)?camelcase\s+(.+)/i)![1];
    const parts = s.split(/[\s_\-.]+/).filter(Boolean);
    return parts[0].toLowerCase() + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('');
  },
};

const snakeCase: BoosterRule = {
  name: 'snake_case',
  test: (i) => /^(?:to\s+)?snake_?case\s+(.+)/i.test(i),
  resolve: (i) => m(i, /^(?:to\s+)?snake_?case\s+(.+)/i)![1].replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s\-.]+/g, '_').toLowerCase(),
};

const kebabCase: BoosterRule = {
  name: 'kebab_case',
  test: (i) => /^(?:to\s+)?kebab-?case\s+(.+)/i.test(i),
  resolve: (i) => m(i, /^(?:to\s+)?kebab-?case\s+(.+)/i)![1].replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_.]+/g, '-').toLowerCase(),
};

const titleCase: BoosterRule = {
  name: 'title_case',
  test: (i) => /^(?:to\s+)?title\s*case\s+(.+)/i.test(i),
  resolve: (i) => m(i, /^(?:to\s+)?title\s*case\s+(.+)/i)![1].toLowerCase().replace(/\b(\w)/g, (c) => c.toUpperCase()),
};

const stripHtml: BoosterRule = {
  name: 'strip_html',
  test: (i) => /^strip\s+html\s+(?:from\s+)?/i.test(i),
  resolve: (i) => i.replace(/^strip\s+html\s+(?:from\s+)?/i, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
};

const reverseString: BoosterRule = {
  name: 'reverse_string',
  test: (i) => /^reverse\s+(.+)/i.test(i),
  resolve: (i) => [...m(i, /^reverse\s+(.+)/i)![1]].reverse().join(''),
};

const countMatches: BoosterRule = {
  name: 'count_matches',
  test: (i) => /^count\s+(?:matches\s+of\s+)?\/(.+)\/\s+in\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^count\s+(?:matches\s+of\s+)?\/(.+)\/\s+in\s+(.+)/i)!;
    return String((mm[2].match(new RegExp(mm[1], 'g')) ?? []).length);
  },
};

export const regexRules: BoosterRule[] = [
  extractEmails, extractUrls, extractIps, extractNumbers,
  slugify, camelCase, snakeCase, kebabCase, titleCase,
  stripHtml, reverseString, countMatches,
];
