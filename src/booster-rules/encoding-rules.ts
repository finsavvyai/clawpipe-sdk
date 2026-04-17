/** Encoding booster rules — URL, hex, binary, JSON minify/count. */
import { BoosterRule } from './types';

const urlEncodeRule: BoosterRule = {
  name: 'url_encode',
  test: (i) => /^url\s*encode\s+(.+)/i.test(i),
  resolve: (i) => encodeURIComponent(i.match(/^url\s*encode\s+(.+)/i)![1].trim()),
};

const urlDecodeRule: BoosterRule = {
  name: 'url_decode',
  test: (i) => /^url\s*decode\s+(.+)/i.test(i),
  resolve: (i) => decodeURIComponent(i.match(/^url\s*decode\s+(.+)/i)![1].trim()),
};

const hexEncodeRule: BoosterRule = {
  name: 'hex_encode',
  test: (i) => /^hex\s*encode\s+(.+)/i.test(i),
  resolve: (i) => Buffer.from(i.match(/^hex\s*encode\s+(.+)/i)![1].trim()).toString('hex'),
};

const hexDecodeRule: BoosterRule = {
  name: 'hex_decode',
  test: (i) => /^hex\s*decode\s+([0-9a-fA-F]+)/i.test(i),
  resolve: (i) => Buffer.from(i.match(/^hex\s*decode\s+([0-9a-fA-F]+)/i)![1], 'hex').toString('utf-8'),
};

const binaryFromNumRule: BoosterRule = {
  name: 'binary_from_num',
  test: (i) => /^(?:binary|bin)\s+(?:of\s+)?(\d+)$/i.test(i),
  resolve: (i) => (parseInt(i.match(/^(?:binary|bin)\s+(?:of\s+)?(\d+)$/i)![1], 10) >>> 0).toString(2),
};

const octalRule: BoosterRule = {
  name: 'octal',
  test: (i) => /^(?:octal|oct)\s+(?:of\s+)?(\d+)/i.test(i),
  resolve: (i) => parseInt(i.match(/^(?:octal|oct)\s+(?:of\s+)?(\d+)/i)![1], 10).toString(8),
};

const jsonMinifyRule: BoosterRule = {
  name: 'json_minify',
  test: (i) => /^(?:minify|compact)\s+(?:this\s+)?json/i.test(i) && i.includes('{'),
  resolve: (i) => JSON.stringify(JSON.parse(i.slice(i.indexOf('{')))),
};

const jsonKeysRule: BoosterRule = {
  name: 'json_keys',
  test: (i) => /^(?:list\s+)?json\s+keys/i.test(i) && i.includes('{'),
  resolve: (i) => Object.keys(JSON.parse(i.slice(i.indexOf('{')))).join(', '),
};

const charCountRule: BoosterRule = {
  name: 'char_count',
  test: (i) => /^(?:char(?:acter)?\s+count|length)\s+of\s+(.+)/i.test(i),
  resolve: (i) => String(i.match(/^(?:char(?:acter)?\s+count|length)\s+of\s+(.+)/i)![1].trim().length),
};

const wordCountRule: BoosterRule = {
  name: 'word_count',
  test: (i) => /^word\s+count\s+of\s+(.+)/i.test(i),
  resolve: (i) => String(i.match(/^word\s+count\s+of\s+(.+)/i)![1].trim().split(/\s+/).length),
};

export const encodingRules: BoosterRule[] = [
  urlEncodeRule, urlDecodeRule, hexEncodeRule, hexDecodeRule,
  binaryFromNumRule, octalRule, jsonMinifyRule, jsonKeysRule,
  charCountRule, wordCountRule,
];
