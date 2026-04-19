/** Smoke tests for the seven new rule packs (regex/format/color/dev/time/science/logic). */
import { describe, it, expect } from 'vitest';
import { regexRules } from './regex-rules';
import { formatRules } from './format-rules';
import { colorRules } from './color-rules';
import { devRules } from './dev-rules';
import { timeRules } from './time-rules';
import { scienceRules } from './science-rules';
import { logicRules } from './logic-rules';

const find = (arr: { name: string; resolve: (s: string) => string }[], n: string) => arr.find((r) => r.name === n)!;

describe('regex rules', () => {
  it('extract_emails', () => expect(find(regexRules, 'extract_emails').resolve('extract emails from foo@bar.com and a@b.io')).toBe('foo@bar.com, a@b.io'));
  it('extract_urls', () => expect(find(regexRules, 'extract_urls').resolve('extract urls from https://x.com and http://y.io/p')).toBe('https://x.com, http://y.io/p'));
  it('extract_ips', () => expect(find(regexRules, 'extract_ips').resolve('extract ips from 192.168.1.1 and 8.8.8.8')).toBe('192.168.1.1, 8.8.8.8'));
  it('slugify', () => expect(find(regexRules, 'slugify').resolve('slugify Hello World!! 2026')).toBe('hello-world-2026'));
  it('camel_case', () => expect(find(regexRules, 'camel_case').resolve('camelcase hello world foo')).toBe('helloWorldFoo'));
  it('snake_case', () => expect(find(regexRules, 'snake_case').resolve('snake_case helloWorldFoo')).toBe('hello_world_foo'));
  it('kebab_case', () => expect(find(regexRules, 'kebab_case').resolve('kebab-case helloWorldFoo')).toBe('hello-world-foo'));
  it('title_case', () => expect(find(regexRules, 'title_case').resolve('title case hello world')).toBe('Hello World'));
  it('strip_html', () => expect(find(regexRules, 'strip_html').resolve('strip html <p>Hi <b>there</b></p>')).toBe('Hi there'));
  it('reverse_string', () => expect(find(regexRules, 'reverse_string').resolve('reverse abcd')).toBe('dcba'));
});

describe('format rules', () => {
  it('ordinal', () => expect(find(formatRules, 'ordinal').resolve('ordinal 21')).toBe('21st'));
  it('comma_number', () => expect(find(formatRules, 'comma_number').resolve('format number 1234567')).toBe('1,234,567'));
  it('usd_format', () => expect(find(formatRules, 'usd_format').resolve('format usd 1234.5')).toBe('$1,234.50'));
  it('file_size', () => expect(find(formatRules, 'file_size').resolve('bytes 1048576')).toBe('1.00 MB'));
  it('pluralize', () => expect(find(formatRules, 'pluralize').resolve('pluralize box')).toBe('boxes'));
  it('truncate', () => expect(find(formatRules, 'truncate').resolve('truncate hello world to 5')).toBe('hello…'));
  it('repeat', () => expect(find(formatRules, 'repeat').resolve('repeat ab 3 times')).toBe('ababab'));
});

describe('color rules', () => {
  it('hex_to_rgb', () => expect(find(colorRules, 'hex_to_rgb').resolve('#ff8800 to rgb')).toBe('rgb(255, 136, 0)'));
  it('rgb_to_hex', () => expect(find(colorRules, 'rgb_to_hex').resolve('rgb(255, 136, 0) to hex')).toBe('#ff8800'));
  it('color_invert', () => expect(find(colorRules, 'color_invert').resolve('invert #000000')).toBe('#ffffff'));
  it('named_color', () => expect(find(colorRules, 'named_color').resolve('hex for red')).toBe('#ff0000'));
});

describe('dev rules', () => {
  it('mime_from_ext', () => expect(find(devRules, 'mime_from_ext').resolve('mime for .json')).toBe('application/json'));
  it('http_status', () => expect(find(devRules, 'http_status').resolve('http 418')).toBe("I'm a teapot"));
  it('semver_bump', () => expect(find(devRules, 'semver_bump').resolve('bump minor of 1.2.3')).toBe('1.3.0'));
  it('port_info', () => expect(find(devRules, 'port_info').resolve('port 5432')).toBe('PostgreSQL'));
  it('user_agent_class', () => expect(find(devRules, 'user_agent_class').resolve('classify user-agent Mozilla/5.0 iPhone')).toBe('ios'));
  it('query_parse', () => expect(find(devRules, 'query_parse').resolve('parse query string a=1&b=2')).toContain('"a": "1"'));
});

describe('time rules', () => {
  it('day_of_week', () => expect(find(timeRules, 'day_of_week').resolve('day of week 2026-04-19')).toBe('Sunday'));
  it('days_between', () => expect(find(timeRules, 'days_between').resolve('days between 2026-01-01 and 2026-12-31')).toBe('364'));
  it('is_leap_year', () => expect(find(timeRules, 'is_leap_year').resolve('is 2024 a leap year')).toBe('Yes'));
  it('month_name', () => expect(find(timeRules, 'month_name').resolve('month name 7')).toBe('July'));
  it('duration_format', () => expect(find(timeRules, 'duration_format').resolve('format duration 3725 seconds')).toBe('01:02:05'));
  it('minutes_to_hours', () => expect(find(timeRules, 'minutes_to_hours').resolve('150 minutes to hours')).toBe('2.50'));
});

describe('science rules', () => {
  it('c_to_f', () => expect(find(scienceRules, 'c_to_f').resolve('100°C to F')).toBe('212.00 °F'));
  it('km_to_mi', () => expect(find(scienceRules, 'km_to_mi').resolve('100 km to mi')).toBe('62.14 mi'));
  it('kg_to_lb', () => expect(find(scienceRules, 'kg_to_lb').resolve('10 kg to lb')).toBe('22.05 lb'));
  it('bmi', () => expect(find(scienceRules, 'bmi').resolve('bmi 70 kg 1.75 m')).toBe('22.9'));
});

describe('logic rules', () => {
  it('set_union', () => expect(find(logicRules, 'set_union').resolve('union [a, b, c] and [b, c, d]')).toBe('a, b, c, d'));
  it('set_intersection', () => expect(find(logicRules, 'set_intersection').resolve('intersect [a, b, c] and [b, c, d]')).toBe('b, c'));
  it('dedupe', () => expect(find(logicRules, 'dedupe').resolve('dedupe a, b, a, c, b')).toBe('a, b, c'));
  it('sort_asc', () => expect(find(logicRules, 'sort_asc').resolve('sort c, a, b')).toBe('a, b, c'));
  it('list_length', () => expect(find(logicRules, 'list_length').resolve('length of list [a, b, c, d]')).toBe('4'));
  it('array_first', () => expect(find(logicRules, 'array_first').resolve('first of [a, b, c]')).toBe('a'));
  it('array_last', () => expect(find(logicRules, 'array_last').resolve('last of [a, b, c]')).toBe('c'));
});
