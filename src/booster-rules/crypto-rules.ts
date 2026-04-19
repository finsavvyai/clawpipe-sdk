/** Hashing / random-bytes rules using WebCrypto. */
import { BoosterRule } from './types';
import { createHash, randomBytes } from 'node:crypto';

const m = (i: string, p: RegExp) => i.match(p);

const sha256: BoosterRule = {
  name: 'sha256',
  test: (i) => /^sha-?256\s+(.+)/i.test(i),
  resolve: (i) => createHash('sha256').update(m(i, /^sha-?256\s+(.+)/i)![1]).digest('hex'),
};

const sha1: BoosterRule = {
  name: 'sha1',
  test: (i) => /^sha-?1\s+(.+)/i.test(i),
  resolve: (i) => createHash('sha1').update(m(i, /^sha-?1\s+(.+)/i)![1]).digest('hex'),
};

const md5: BoosterRule = {
  name: 'md5',
  test: (i) => /^md5\s+(.+)/i.test(i),
  resolve: (i) => createHash('md5').update(m(i, /^md5\s+(.+)/i)![1]).digest('hex'),
};

const sha512: BoosterRule = {
  name: 'sha512',
  test: (i) => /^sha-?512\s+(.+)/i.test(i),
  resolve: (i) => createHash('sha512').update(m(i, /^sha-?512\s+(.+)/i)![1]).digest('hex'),
};

const randomBytesHex: BoosterRule = {
  name: 'random_bytes',
  test: (i) => /^random\s+(\d+)\s+bytes?(?:\s+as\s+hex)?$/i.test(i),
  resolve: (i) => randomBytes(Math.min(parseInt(m(i, /(\d+)/)![1], 10), 1024)).toString('hex'),
};

const randomToken: BoosterRule = {
  name: 'random_token',
  test: (i) => /^random\s+token(?:\s+(\d+))?$/i.test(i),
  resolve: (i) => {
    const len = parseInt(m(i, /random\s+token\s+(\d+)/i)?.[1] ?? '32', 10);
    return randomBytes(Math.min(len, 256)).toString('base64url');
  },
};

const guidV4: BoosterRule = {
  name: 'guid',
  test: (i) => /^(?:generate\s+)?(?:guid|uuid\s*v4|guid\s*v4)$/i.test(i.trim()),
  resolve: () => crypto.randomUUID(),
};

const passwordRule: BoosterRule = {
  name: 'random_password',
  test: (i) => /^random\s+password(?:\s+(\d+))?/i.test(i),
  resolve: (i) => {
    const len = Math.min(parseInt(m(i, /random\s+password\s+(\d+)/i)?.[1] ?? '16', 10), 128);
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = randomBytes(len);
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
  },
};

export const cryptoRules: BoosterRule[] = [
  sha256, sha1, md5, sha512,
  randomBytesHex, randomToken, guidV4, passwordRule,
];
