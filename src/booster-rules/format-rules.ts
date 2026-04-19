/** Number / currency / ordinal formatting — skip LLM. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const ordinalRule: BoosterRule = {
  name: 'ordinal',
  test: (i) => /^ordinal\s+(?:of\s+)?(-?\d+)/i.test(i),
  resolve: (i) => ordinal(parseInt(m(i, /^ordinal\s+(?:of\s+)?(-?\d+)/i)![1], 10)),
};

const commaNumber: BoosterRule = {
  name: 'comma_number',
  test: (i) => /^format\s+number\s+(-?\d+(?:\.\d+)?)/i.test(i),
  resolve: (i) => Number(m(i, /^format\s+number\s+(-?\d+(?:\.\d+)?)/i)![1]).toLocaleString('en-US'),
};

const usdFormat: BoosterRule = {
  name: 'usd_format',
  test: (i) => /^format\s+(?:as\s+)?usd\s+(-?\d+(?:\.\d+)?)/i.test(i),
  resolve: (i) => '$' + Number(m(i, /^format\s+(?:as\s+)?usd\s+(-?\d+(?:\.\d+)?)/i)![1]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

const eurFormat: BoosterRule = {
  name: 'eur_format',
  test: (i) => /^format\s+(?:as\s+)?eur\s+(-?\d+(?:\.\d+)?)/i.test(i),
  resolve: (i) => '€' + Number(m(i, /^format\s+(?:as\s+)?eur\s+(-?\d+(?:\.\d+)?)/i)![1]).toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

const fileSize: BoosterRule = {
  name: 'file_size',
  test: (i) => /^(?:format\s+)?bytes?\s+(\d+)/i.test(i),
  resolve: (i) => {
    let n = parseInt(m(i, /^(?:format\s+)?bytes?\s+(\d+)/i)![1], 10);
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let idx = 0;
    while (n >= 1024 && idx < u.length - 1) { n /= 1024; idx++; }
    return `${idx === 0 ? n : n.toFixed(2)} ${u[idx]}`;
  },
};

const pluralize: BoosterRule = {
  name: 'pluralize',
  test: (i) => /^pluralize\s+(\w+)/i.test(i),
  resolve: (i) => {
    const w = m(i, /^pluralize\s+(\w+)/i)![1];
    if (/(s|x|z|ch|sh)$/i.test(w)) return w + 'es';
    if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies';
    return w + 's';
  },
};

const padLeft: BoosterRule = {
  name: 'pad_left',
  test: (i) => /^pad\s+left\s+(\S+)\s+to\s+(\d+)\s+(?:with\s+(\S))?/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^pad\s+left\s+(\S+)\s+to\s+(\d+)(?:\s+with\s+(\S))?/i)!;
    return mm[1].padStart(parseInt(mm[2], 10), mm[3] ?? ' ');
  },
};

const padRight: BoosterRule = {
  name: 'pad_right',
  test: (i) => /^pad\s+right\s+(\S+)\s+to\s+(\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^pad\s+right\s+(\S+)\s+to\s+(\d+)(?:\s+with\s+(\S))?/i)!;
    return mm[1].padEnd(parseInt(mm[2], 10), mm[3] ?? ' ');
  },
};

const truncate: BoosterRule = {
  name: 'truncate',
  test: (i) => /^truncate\s+(.+?)\s+to\s+(\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^truncate\s+(.+?)\s+to\s+(\d+)/i)!;
    const n = parseInt(mm[2], 10);
    return mm[1].length > n ? mm[1].slice(0, n) + '…' : mm[1];
  },
};

const repeat: BoosterRule = {
  name: 'repeat',
  test: (i) => /^repeat\s+(\S+)\s+(\d+)\s+times/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^repeat\s+(\S+)\s+(\d+)\s+times/i)!;
    return mm[1].repeat(Math.min(parseInt(mm[2], 10), 10000));
  },
};

const percentFormat: BoosterRule = {
  name: 'percent_format',
  test: (i) => /^format\s+percent\s+(-?\d+(?:\.\d+)?)/i.test(i),
  resolve: (i) => (parseFloat(m(i, /^format\s+percent\s+(-?\d+(?:\.\d+)?)/i)![1]) * 100).toFixed(2) + '%',
};

const ordinalDay: BoosterRule = {
  name: 'ordinal_day',
  test: (i) => /^day\s+(\d+)\s+(?:of\s+)?\w+/i.test(i),
  resolve: (i) => ordinal(parseInt(m(i, /^day\s+(\d+)/i)![1], 10)),
};

export const formatRules: BoosterRule[] = [
  ordinalRule, commaNumber, usdFormat, eurFormat, fileSize,
  pluralize, padLeft, padRight, truncate, repeat,
  percentFormat, ordinalDay,
];
