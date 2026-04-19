/** Extra math — fibonacci, primes, sum series, derivatives. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const fibonacci: BoosterRule = {
  name: 'fibonacci_nth',
  test: (i) => /^(?:fib(?:onacci)?)\s+(?:of\s+)?(\d+)/i.test(i),
  resolve: (i) => {
    const n = Math.min(parseInt(m(i, /(\d+)/)![1], 10), 200);
    let a = 0n, b = 1n;
    for (let k = 0; k < n; k++) [a, b] = [b, a + b];
    return a.toString();
  },
};

const fibSeries: BoosterRule = {
  name: 'fibonacci_series',
  test: (i) => /^fibonacci\s+(?:series\s+)?(?:up\s+to\s+)?(\d+)\s+terms?/i.test(i),
  resolve: (i) => {
    const n = Math.min(parseInt(m(i, /(\d+)/)![1], 10), 50);
    const out: bigint[] = [];
    let a = 0n, b = 1n;
    for (let k = 0; k < n; k++) { out.push(a); [a, b] = [b, a + b]; }
    return out.join(', ');
  },
};

const sumOneToN: BoosterRule = {
  name: 'sum_one_to_n',
  test: (i) => /^sum\s+(?:from\s+)?1\s+to\s+(\d+)/i.test(i),
  resolve: (i) => {
    const n = parseInt(m(i, /(\d+)/)![1], 10);
    return ((n * (n + 1)) / 2).toString();
  },
};

const sumRange: BoosterRule = {
  name: 'sum_range',
  test: (i) => /^sum\s+(?:from\s+)?(-?\d+)\s+to\s+(-?\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /(-?\d+)\s+to\s+(-?\d+)/)!;
    const a = parseInt(mm[1], 10), b = parseInt(mm[2], 10);
    return (((b - a + 1) * (a + b)) / 2).toString();
  },
};

const primesUpTo: BoosterRule = {
  name: 'primes_up_to',
  test: (i) => /^primes\s+(?:up\s+)?to\s+(\d+)/i.test(i),
  resolve: (i) => {
    const n = Math.min(parseInt(m(i, /(\d+)/)![1], 10), 1000);
    const sieve = new Array(n + 1).fill(true);
    sieve[0] = sieve[1] = false;
    for (let p = 2; p * p <= n; p++) if (sieve[p]) for (let k = p * p; k <= n; k += p) sieve[k] = false;
    return sieve.map((v, i) => v ? i : -1).filter((x) => x > 0).join(', ');
  },
};

const factorize: BoosterRule = {
  name: 'factorize',
  test: (i) => /^factor(?:ize)?\s+(\d+)/i.test(i),
  resolve: (i) => {
    let n = parseInt(m(i, /(\d+)/)![1], 10);
    const out: number[] = [];
    for (let p = 2; p <= Math.sqrt(n); p++) while (n % p === 0) { out.push(p); n /= p; }
    if (n > 1) out.push(n);
    return out.join(' × ') || '1';
  },
};

const sqrt: BoosterRule = {
  name: 'sqrt',
  test: (i) => /^(?:sqrt|square\s+root)\s+(?:of\s+)?([\d.]+)/i.test(i),
  resolve: (i) => Math.sqrt(parseFloat(m(i, /([\d.]+)/)![1])).toString(),
};

const cbrt: BoosterRule = {
  name: 'cube_root',
  test: (i) => /^(?:cbrt|cube\s+root)\s+(?:of\s+)?([\d.]+)/i.test(i),
  resolve: (i) => Math.cbrt(parseFloat(m(i, /([\d.]+)/)![1])).toString(),
};

const power: BoosterRule = {
  name: 'power',
  test: (i) => /^(-?[\d.]+)\s*\^\s*(-?\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /(-?[\d.]+)\s*\^\s*(-?\d+)/)!;
    return Math.pow(parseFloat(mm[1]), parseInt(mm[2], 10)).toString();
  },
};

const log10: BoosterRule = {
  name: 'log10',
  test: (i) => /^log(?:10)?\s+(?:of\s+)?([\d.]+)/i.test(i),
  resolve: (i) => Math.log10(parseFloat(m(i, /([\d.]+)/)![1])).toFixed(6),
};

const ln: BoosterRule = {
  name: 'ln',
  test: (i) => /^ln\s+(?:of\s+)?([\d.]+)/i.test(i),
  resolve: (i) => Math.log(parseFloat(m(i, /([\d.]+)/)![1])).toFixed(6),
};

export const mathExtraRules: BoosterRule[] = [
  fibonacci, fibSeries, sumOneToN, sumRange, primesUpTo,
  factorize, sqrt, cbrt, power, log10, ln,
];
