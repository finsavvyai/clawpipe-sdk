/**
 * Code/developer-oriented booster rules.
 */
import { BoosterRule } from './types';

const regexTestRule: BoosterRule = {
  name: 'regex_test',
  test: (i) => /^test\s+regex\s+\/(.+?)\/([gimsuy]*)\s+(?:against|on|with)\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^test\s+regex\s+\/(.+?)\/([gimsuy]*)\s+(?:against|on|with)\s+(.+)/i)!;
    const re = new RegExp(m[1], m[2]);
    return re.test(m[3].trim()) ? 'Match' : 'No match';
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const colorConvertRule: BoosterRule = {
  name: 'color_convert',
  test: (i) => /^convert\s+(#[0-9a-fA-F]{6})\s+to\s+rgb/i.test(i),
  resolve: (i) => {
    const m = i.match(/^convert\s+(#[0-9a-fA-F]{6})\s+to\s+rgb/i)!;
    const [r, g, b] = hexToRgb(m[1]);
    return `rgb(${r}, ${g}, ${b})`;
  },
};

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  return false;
}

const ipCheckRule: BoosterRule = {
  name: 'ip_check',
  test: (i) => /^is\s+([\d.]+)\s+(?:a\s+)?private/i.test(i),
  resolve: (i) => {
    const m = i.match(/^is\s+([\d.]+)\s+(?:a\s+)?private/i)!;
    return isPrivateIp(m[1]) ? 'Yes, private IPv4' : 'No, public IPv4';
  },
};

function parseSemver(s: string): [number, number, number] {
  const m = s.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) throw new Error('Invalid semver');
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function compareSemver(a: string, b: string): number {
  const [a1, a2, a3] = parseSemver(a);
  const [b1, b2, b3] = parseSemver(b);
  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

const semverCompareRule: BoosterRule = {
  name: 'semver_compare',
  test: (i) => /^is\s+([\d.]+)\s*([><=!]+)\s*([\d.]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^is\s+([\d.]+)\s*([><=!]+)\s*([\d.]+)/i)!;
    const cmp = compareSemver(m[1], m[3]);
    const op = m[2];
    let result = false;
    if (op === '>') result = cmp > 0;
    else if (op === '<') result = cmp < 0;
    else if (op === '>=' || op === '=>') result = cmp >= 0;
    else if (op === '<=' || op === '=<') result = cmp <= 0;
    else if (op === '==' || op === '=') result = cmp === 0;
    else if (op === '!=') result = cmp !== 0;
    return result ? 'Yes' : 'No';
  },
};

export const codeRules: BoosterRule[] = [
  regexTestRule, colorConvertRule, ipCheckRule, semverCompareRule,
];
