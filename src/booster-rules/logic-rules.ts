/** Boolean / set / list logic rules. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);
const parseList = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);

const setUnion: BoosterRule = {
  name: 'set_union',
  test: (i) => /^union\s+\[(.+?)\]\s+(?:and|with)\s+\[(.+?)\]/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^union\s+\[(.+?)\]\s+(?:and|with)\s+\[(.+?)\]/i)!;
    return [...new Set([...parseList(mm[1]), ...parseList(mm[2])])].join(', ');
  },
};

const setIntersection: BoosterRule = {
  name: 'set_intersection',
  test: (i) => /^intersect(?:ion)?\s+\[(.+?)\]\s+(?:and|with)\s+\[(.+?)\]/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\[(.+?)\]\s+(?:and|with)\s+\[(.+?)\]/i)!;
    const a = new Set(parseList(mm[1]));
    return parseList(mm[2]).filter((x) => a.has(x)).join(', ') || 'empty';
  },
};

const setDifference: BoosterRule = {
  name: 'set_difference',
  test: (i) => /^diff(?:erence)?\s+\[(.+?)\]\s+(?:minus|from)\s+\[(.+?)\]/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\[(.+?)\]\s+(?:minus|from)\s+\[(.+?)\]/i)!;
    const b = new Set(parseList(mm[2]));
    return parseList(mm[1]).filter((x) => !b.has(x)).join(', ') || 'empty';
  },
};

const dedupe: BoosterRule = {
  name: 'dedupe',
  test: (i) => /^(?:dedupe|unique)\s+(?:from\s+)?(.+)/i.test(i),
  resolve: (i) => [...new Set(parseList(m(i, /^(?:dedupe|unique)\s+(?:from\s+)?(.+)/i)![1]))].join(', '),
};

const sortAsc: BoosterRule = {
  name: 'sort_asc',
  test: (i) => /^sort\s+(?:asc(?:ending)?\s+)?(.+)/i.test(i) && !/sort\s+desc/i.test(i),
  resolve: (i) => parseList(m(i, /^sort\s+(?:asc(?:ending)?\s+)?(.+)/i)![1]).sort().join(', '),
};

const sortDesc: BoosterRule = {
  name: 'sort_desc',
  test: (i) => /^sort\s+desc(?:ending)?\s+(.+)/i.test(i),
  resolve: (i) => parseList(m(i, /^sort\s+desc(?:ending)?\s+(.+)/i)![1]).sort().reverse().join(', '),
};

const boolEval: BoosterRule = {
  name: 'bool_eval',
  test: (i) => /^(?:eval(?:uate)?\s+)?[\s(]*(true|false)[\s)]*\s+(?:and|or|xor|not\s+not)/i.test(i),
  resolve: (i) => {
    const cleaned = i.replace(/^(?:eval(?:uate)?\s+)?/i, '')
      .replace(/\btrue\b/gi, 'true').replace(/\bfalse\b/gi, 'false')
      .replace(/\band\b/gi, '&&').replace(/\bor\b/gi, '||')
      .replace(/\bnot\b/gi, '!').replace(/\bxor\b/gi, '!==');
    if (!/^[!&|=()truefals\s]+$/.test(cleaned)) return 'invalid';
    try { return String(new Function(`return (${cleaned})`)()); }
    catch { return 'invalid'; }
  },
};

const listLength: BoosterRule = {
  name: 'list_length',
  test: (i) => /^(?:length|count)\s+(?:of\s+list\s+)?\[(.+?)\]/i.test(i),
  resolve: (i) => String(parseList(m(i, /\[(.+?)\]/)![1]).length),
};

const arrayJoin: BoosterRule = {
  name: 'array_join',
  test: (i) => /^join\s+\[(.+?)\]\s+with\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\[(.+?)\]\s+with\s+(.+)/i)!;
    return parseList(mm[1]).join(mm[2]);
  },
};

const arraySplit: BoosterRule = {
  name: 'array_split',
  test: (i) => /^split\s+(.+?)\s+by\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^split\s+(.+?)\s+by\s+(.+)/i)!;
    return mm[1].split(mm[2]).join(', ');
  },
};

const arrayFirst: BoosterRule = {
  name: 'array_first',
  test: (i) => /^(?:first|head)\s+(?:of\s+)?\[(.+?)\]/i.test(i),
  resolve: (i) => parseList(m(i, /\[(.+?)\]/)![1])[0] ?? 'empty',
};

const arrayLast: BoosterRule = {
  name: 'array_last',
  test: (i) => /^(?:last|tail)\s+(?:of\s+)?\[(.+?)\]/i.test(i),
  resolve: (i) => {
    const a = parseList(m(i, /\[(.+?)\]/)![1]);
    return a[a.length - 1] ?? 'empty';
  },
};

export const logicRules: BoosterRule[] = [
  setUnion, setIntersection, setDifference, dedupe,
  sortAsc, sortDesc, boolEval, listLength,
  arrayJoin, arraySplit, arrayFirst, arrayLast,
];
