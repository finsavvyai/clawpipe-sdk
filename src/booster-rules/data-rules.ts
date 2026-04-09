/**
 * Data encoding/decoding and format conversion booster rules.
 */
import { BoosterRule } from './types';

const csvToJsonRule: BoosterRule = {
  name: 'csv_to_json',
  test: (i) => /^(?:csv to json|convert csv to json|parse csv)\s*:?\s+(.+)/is.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:csv to json|convert csv to json|parse csv)\s*:?\s+(.+)/is)!;
    const lines = m[1].trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(',').map((v) => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ''; });
      return obj;
    });
    return JSON.stringify(rows);
  },
};

const jsonToCsvRule: BoosterRule = {
  name: 'json_to_csv',
  test: (i) => /^(?:json to csv|convert json to csv)\s*:?\s+(.+)/is.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:json to csv|convert json to csv)\s*:?\s+(.+)/is)!;
    const arr = JSON.parse(m[1].trim());
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('Expected array');
    const keys = Object.keys(arr[0]);
    const rows = arr.map((obj: Record<string, unknown>) =>
      keys.map((k) => String(obj[k] ?? '')).join(','),
    );
    return [keys.join(','), ...rows].join('\n');
  },
};

const urlEncodeRule: BoosterRule = {
  name: 'url_encode',
  test: (i) => /^(?:url encode|urlencode|encode url)\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:url encode|urlencode|encode url)\s*:?\s+(.+)/i)!;
    return encodeURIComponent(m[1].trim());
  },
};

const urlDecodeRule: BoosterRule = {
  name: 'url_decode',
  test: (i) => /^(?:url decode|urldecode|decode url)\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:url decode|urldecode|decode url)\s*:?\s+(.+)/i)!;
    return decodeURIComponent(m[1].trim());
  },
};

const hexEncodeRule: BoosterRule = {
  name: 'hex_encode',
  test: (i) => /^(?:hex encode|to hex|encode hex)\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:hex encode|to hex|encode hex)\s*:?\s+(.+)/i)!;
    return Buffer.from(m[1].trim()).toString('hex');
  },
};

const hexDecodeRule: BoosterRule = {
  name: 'hex_decode',
  test: (i) => /^(?:hex decode|from hex|decode hex)\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:hex decode|from hex|decode hex)\s*:?\s+(.+)/i)!;
    return Buffer.from(m[1].trim(), 'hex').toString('utf-8');
  },
};

const sortJsonKeysRule: BoosterRule = {
  name: 'sort_json_keys',
  test: (i) => /^(?:sort keys|sort json keys)\s*:?\s+(.+)/is.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:sort keys|sort json keys)\s*:?\s+(.+)/is)!;
    const obj = JSON.parse(m[1].trim());
    const sorted: Record<string, unknown> = {};
    Object.keys(obj).sort().forEach((k) => { sorted[k] = obj[k]; });
    return JSON.stringify(sorted);
  },
};

const minifyJsonRule: BoosterRule = {
  name: 'minify_json',
  test: (i) => /^(?:minify json|compact json|minimize json)\s*:?\s+(.+)/is.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:minify json|compact json|minimize json)\s*:?\s+(.+)/is)!;
    return JSON.stringify(JSON.parse(m[1].trim()));
  },
};

export const dataRules: BoosterRule[] = [
  csvToJsonRule, jsonToCsvRule, urlEncodeRule, urlDecodeRule,
  hexEncodeRule, hexDecodeRule, sortJsonKeysRule, minifyJsonRule,
];
