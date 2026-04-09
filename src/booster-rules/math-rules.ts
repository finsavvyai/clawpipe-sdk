/**
 * Extended math booster rules (beyond the core "calculate X" rule).
 */
import { BoosterRule } from './types';

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function lcm(a: number, b: number): number { return (a * b) / gcd(a, b); }
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) { if (n % i === 0) return false; }
  return true;
}
function factorial(n: number): number {
  if (n < 0) throw new Error('Negative');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

const percentageRule: BoosterRule = {
  name: 'percentage',
  test: (i) => /^what is\s+([\d.]+)%\s+of\s+([\d.]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^what is\s+([\d.]+)%\s+of\s+([\d.]+)/i)!;
    return String(parseFloat(m[1]) / 100 * parseFloat(m[2]));
  },
};

const percentChangeRule: BoosterRule = {
  name: 'percent_change',
  test: (i) => /^percent(?:age)?\s+change\s+from\s+([\d.]+)\s+to\s+([\d.]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^percent(?:age)?\s+change\s+from\s+([\d.]+)\s+to\s+([\d.]+)/i)!;
    const from = parseFloat(m[1]);
    const to = parseFloat(m[2]);
    return `${((to - from) / from * 100).toFixed(0)}%`;
  },
};

const averageRule: BoosterRule = {
  name: 'average',
  test: (i) => /^(?:average|mean|avg)\s+(?:of\s+)?([\d,.\s]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:average|mean|avg)\s+(?:of\s+)?([\d,.\s]+)/i)!;
    const nums = m[1].split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
    return String(nums.reduce((a, b) => a + b, 0) / nums.length);
  },
};

const medianRule: BoosterRule = {
  name: 'median',
  test: (i) => /^median\s+(?:of\s+)?([\d,.\s]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^median\s+(?:of\s+)?([\d,.\s]+)/i)!;
    const nums = m[1].split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    const result = nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    return String(result);
  },
};

const factorialRule: BoosterRule = {
  name: 'factorial',
  test: (i) => /^factorial\s+(?:of\s+)?(\d+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^factorial\s+(?:of\s+)?(\d+)/i)!;
    return String(factorial(parseInt(m[1], 10)));
  },
};

const gcdRule: BoosterRule = {
  name: 'gcd',
  test: (i) => /^gcd\s+(?:of\s+)?(\d+)\s+and\s+(\d+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^gcd\s+(?:of\s+)?(\d+)\s+and\s+(\d+)/i)!;
    return String(gcd(parseInt(m[1], 10), parseInt(m[2], 10)));
  },
};

const lcmRule: BoosterRule = {
  name: 'lcm',
  test: (i) => /^lcm\s+(?:of\s+)?(\d+)\s+and\s+(\d+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^lcm\s+(?:of\s+)?(\d+)\s+and\s+(\d+)/i)!;
    return String(lcm(parseInt(m[1], 10), parseInt(m[2], 10)));
  },
};

const primeCheckRule: BoosterRule = {
  name: 'prime_check',
  test: (i) => /^is\s+(\d+)\s+(?:a\s+)?prime/i.test(i),
  resolve: (i) => {
    const m = i.match(/^is\s+(\d+)\s+(?:a\s+)?prime/i)!;
    return isPrime(parseInt(m[1], 10)) ? 'Yes' : 'No';
  },
};

const binaryConvertRule: BoosterRule = {
  name: 'binary_convert',
  test: (i) => /^convert\s+(\d+)\s+to\s+binary/i.test(i),
  resolve: (i) => {
    const m = i.match(/^convert\s+(\d+)\s+to\s+binary/i)!;
    return (parseInt(m[1], 10) >>> 0).toString(2);
  },
};

const hexConvertRule: BoosterRule = {
  name: 'hex_convert',
  test: (i) => /^convert\s+(\d+)\s+to\s+hex/i.test(i),
  resolve: (i) => {
    const m = i.match(/^convert\s+(\d+)\s+to\s+hex/i)!;
    return parseInt(m[1], 10).toString(16).toUpperCase();
  },
};

const romanNumeralRule: BoosterRule = {
  name: 'roman_numeral',
  test: (i) => /^convert\s+(\d+)\s+to\s+roman/i.test(i),
  resolve: (i) => {
    const m = i.match(/^convert\s+(\d+)\s+to\s+roman/i)!;
    return toRoman(parseInt(m[1], 10));
  },
};

export const mathRules: BoosterRule[] = [
  percentageRule, percentChangeRule, averageRule, medianRule,
  factorialRule, gcdRule, lcmRule, primeCheckRule,
  binaryConvertRule, hexConvertRule, romanNumeralRule,
];
