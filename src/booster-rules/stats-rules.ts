/** Statistical booster rules — skip LLM for common numeric aggregations. */
import { BoosterRule } from './types';

function parseNums(s: string): number[] {
  return s.split(',').map((x) => parseFloat(x.trim())).filter((n) => !isNaN(n));
}

const minRule: BoosterRule = {
  name: 'min',
  test: (i) => /^(?:min|minimum)\s+(?:of\s+)?([\d,.\s-]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:min|minimum)\s+(?:of\s+)?([\d,.\s-]+)/i)!;
    return String(Math.min(...parseNums(m[1])));
  },
};

const maxRule: BoosterRule = {
  name: 'max',
  test: (i) => /^(?:max|maximum)\s+(?:of\s+)?([\d,.\s-]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:max|maximum)\s+(?:of\s+)?([\d,.\s-]+)/i)!;
    return String(Math.max(...parseNums(m[1])));
  },
};

const sumRule: BoosterRule = {
  name: 'sum',
  test: (i) => /^(?:sum|total)\s+(?:of\s+)?([\d,.\s-]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:sum|total)\s+(?:of\s+)?([\d,.\s-]+)/i)!;
    return String(parseNums(m[1]).reduce((a, b) => a + b, 0));
  },
};

const productRule: BoosterRule = {
  name: 'product',
  test: (i) => /^product\s+(?:of\s+)?([\d,.\s-]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^product\s+(?:of\s+)?([\d,.\s-]+)/i)!;
    return String(parseNums(m[1]).reduce((a, b) => a * b, 1));
  },
};

const rangeRule: BoosterRule = {
  name: 'range',
  test: (i) => /^range\s+(?:of\s+)?([\d,.\s-]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^range\s+(?:of\s+)?([\d,.\s-]+)/i)!;
    const ns = parseNums(m[1]);
    return String(Math.max(...ns) - Math.min(...ns));
  },
};

const stddevRule: BoosterRule = {
  name: 'stddev',
  test: (i) => /^(?:stddev|standard deviation)\s+(?:of\s+)?([\d,.\s-]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:stddev|standard deviation)\s+(?:of\s+)?([\d,.\s-]+)/i)!;
    const ns = parseNums(m[1]);
    const mean = ns.reduce((a, b) => a + b, 0) / ns.length;
    const v = ns.reduce((a, b) => a + (b - mean) ** 2, 0) / ns.length;
    return Math.sqrt(v).toFixed(4);
  },
};

const modeRule: BoosterRule = {
  name: 'mode',
  test: (i) => /^mode\s+(?:of\s+)?([\d,.\s-]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^mode\s+(?:of\s+)?([\d,.\s-]+)/i)!;
    const counts = new Map<number, number>();
    for (const n of parseNums(m[1])) counts.set(n, (counts.get(n) ?? 0) + 1);
    let best = NaN, bestC = -1;
    for (const [n, c] of counts) if (c > bestC) { best = n; bestC = c; }
    return String(best);
  },
};

const countRule: BoosterRule = {
  name: 'count',
  test: (i) => /^count\s+(?:of\s+)?([\d,.\s-]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^count\s+(?:of\s+)?([\d,.\s-]+)/i)!;
    return String(parseNums(m[1]).length);
  },
};

export const statsRules: BoosterRule[] = [
  minRule, maxRule, sumRule, productRule,
  rangeRule, stddevRule, modeRule, countRule,
];
