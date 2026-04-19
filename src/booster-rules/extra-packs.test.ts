/** Smoke tests for iso/crypto/aws/markup packs. */
import { describe, it, expect } from 'vitest';
import { isoRules } from './iso-rules';
import { cryptoRules } from './crypto-rules';
import { awsRules } from './aws-rules';
import { markupRules } from './markup-rules';

const find = (arr: { name: string; resolve: (s: string) => string }[], n: string) => arr.find((r) => r.name === n)!;

describe('iso rules', () => {
  it('country', () => expect(find(isoRules, 'country_from_iso').resolve('country US')).toBe('United States'));
  it('currency', () => expect(find(isoRules, 'currency_from_code').resolve('currency EUR')).toBe('Euro'));
  it('symbol', () => expect(find(isoRules, 'currency_symbol').resolve('symbol GBP')).toBe('£'));
  it('language', () => expect(find(isoRules, 'language_from_iso').resolve('language ja')).toBe('Japanese'));
  it('continent', () => expect(find(isoRules, 'continent_from_country').resolve('continent JP')).toBe('Asia'));
  it('calling_code', () => expect(find(isoRules, 'calling_code').resolve('phone code IL')).toBe('+972'));
});

describe('crypto rules', () => {
  it('sha256', () => expect(find(cryptoRules, 'sha256').resolve('sha256 hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'));
  it('md5', () => expect(find(cryptoRules, 'md5').resolve('md5 hello')).toBe('5d41402abc4b2a76b9719d911017c592'));
  it('guid', () => expect(find(cryptoRules, 'guid').resolve('guid')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
  it('random_bytes', () => expect(find(cryptoRules, 'random_bytes').resolve('random 8 bytes')).toMatch(/^[0-9a-f]{16}$/));
});

describe('aws rules', () => {
  it('aws_region', () => expect(find(awsRules, 'aws_region').resolve('aws region eu-west-1')).toBe('Ireland'));
  it('cloudflare_region', () => expect(find(awsRules, 'cloudflare_region').resolve('cf colo LHR')).toBe('London'));
  it('rest_method', () => expect(find(awsRules, 'rest_method').resolve('method for create')).toBe('POST'));
  it('http_verb_expand', () => expect(find(awsRules, 'http_verb_expand').resolve('http GET')).toContain('idempotent'));
  it('dns_record_type', () => expect(find(awsRules, 'dns_record_type').resolve('dns CNAME')).toBe('alias to another hostname'));
});

describe('markup rules', () => {
  it('md_to_html', () => expect(find(markupRules, 'md_to_html').resolve('md to html # Hello\n\n**bold**')).toContain('<h1>Hello</h1>'));
  it('html_escape', () => expect(find(markupRules, 'html_escape').resolve('html escape <a>&"</a>')).toBe('&lt;a&gt;&amp;&quot;&lt;/a&gt;'));
  it('csv_row_count', () => expect(find(markupRules, 'csv_row_count').resolve('csv rows a,b\n1,2\n3,4')).toBe('3'));
  it('csv_headers', () => expect(find(markupRules, 'csv_headers').resolve('csv headers id, name, email\n1,a,b@c')).toBe('id, name, email'));
  it('json_pretty', () => expect(find(markupRules, 'json_pretty').resolve('pretty json {"a":1}')).toContain('"a": 1'));
});
