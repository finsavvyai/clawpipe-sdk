/** Misc utility rules — random / pick / coin / dice / quick references. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const coinFlip: BoosterRule = {
  name: 'coin_flip',
  test: (i) => /^(?:flip\s+a\s+)?coin/i.test(i),
  resolve: () => Math.random() < 0.5 ? 'Heads' : 'Tails',
};

const diceRoll: BoosterRule = {
  name: 'dice_roll',
  test: (i) => /^roll\s+(?:a\s+)?(\d*)d(\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^roll\s+(?:a\s+)?(\d*)d(\d+)/i)!;
    const n = Math.max(1, Math.min(parseInt(mm[1] || '1', 10), 100));
    const sides = Math.max(2, Math.min(parseInt(mm[2], 10), 1000));
    const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
    return `${rolls.join(', ')} (sum: ${rolls.reduce((a, b) => a + b, 0)})`;
  },
};

const randInt: BoosterRule = {
  name: 'random_int',
  test: (i) => /^random\s+(?:int(?:eger)?\s+)?(?:between\s+|from\s+)?(-?\d+)\s+(?:and|to)\s+(-?\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /(-?\d+)\s+(?:and|to)\s+(-?\d+)/)!;
    const a = parseInt(mm[1], 10), b = parseInt(mm[2], 10);
    return String(Math.floor(Math.random() * (b - a + 1)) + a);
  },
};

const randomHex: BoosterRule = {
  name: 'random_hex',
  test: (i) => /^random\s+hex(?:\s+(\d+))?/i.test(i),
  resolve: (i) => {
    const len = parseInt(m(i, /random\s+hex(?:\s+(\d+))?/i)![1] ?? '32', 10);
    const bytes = new Uint8Array(Math.min(len, 256) / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

const pickOne: BoosterRule = {
  name: 'pick_one',
  test: (i) => /^pick\s+one\s+(?:from\s+)?(.+)/i.test(i),
  resolve: (i) => {
    const opts = m(i, /^pick\s+one\s+(?:from\s+)?(.+)/i)![1].split(',').map((s) => s.trim()).filter(Boolean);
    return opts[Math.floor(Math.random() * opts.length)];
  },
};

const shuffle: BoosterRule = {
  name: 'shuffle',
  test: (i) => /^shuffle\s+(.+)/i.test(i),
  resolve: (i) => {
    const arr = m(i, /^shuffle\s+(.+)/i)![1].split(',').map((s) => s.trim()).filter(Boolean);
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr.join(', ');
  },
};

const asciiTable: BoosterRule = {
  name: 'ascii_code',
  test: (i) => /^ascii\s+(?:code\s+)?(?:for\s+|of\s+)?(\S)$/i.test(i),
  resolve: (i) => String(m(i, /ascii\s+(?:code\s+)?(?:for\s+|of\s+)?(\S)$/i)![1].charCodeAt(0)),
};

const charFromAscii: BoosterRule = {
  name: 'char_from_ascii',
  test: (i) => /^char\s+(?:for\s+|from\s+)?(\d+)$/i.test(i),
  resolve: (i) => String.fromCharCode(parseInt(m(i, /(\d+)/)![1], 10)),
};

const loremShort: BoosterRule = {
  name: 'lorem_ipsum',
  test: (i) => /^lorem\s+ipsum(?:\s+(\d+)\s+words?)?/i.test(i),
  resolve: (i) => {
    const n = parseInt(m(i, /(\d+)\s+words?/)?.[1] ?? '20', 10);
    const w = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud'];
    return Array.from({ length: Math.min(n, 500) }, (_, j) => w[j % w.length]).join(' ');
  },
};

const greet: BoosterRule = {
  name: 'greet',
  test: (i) => /^(?:say\s+)?hello(?:\s+world)?$/i.test(i.trim()),
  resolve: () => 'Hello, World!',
};

const motd: BoosterRule = {
  name: 'motd',
  test: (i) => /^motd|message\s+of\s+the\s+day/i.test(i),
  resolve: () => `Today is ${new Date().toUTCString()}. Ship something small.`,
};

export const miscRules: BoosterRule[] = [
  coinFlip, diceRoll, randInt, randomHex, pickOne, shuffle,
  asciiTable, charFromAscii, loremShort, greet, motd,
];
