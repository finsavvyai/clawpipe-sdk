import { describe, it, expect } from 'vitest';
import { ok, err, unwrap, map, andThen, tryFn, tryAsync } from './result';

describe('Result', () => {
  it('ok/err constructors', () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 });
    expect(err('oops')).toEqual({ ok: false, error: 'oops' });
  });

  it('unwrap returns data on Ok', () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it('unwrap throws on Err', () => {
    expect(() => unwrap(err('bad'))).toThrow(/Result unwrap on Err/);
  });

  it('map transforms Ok', () => {
    expect(map(ok(2), (n) => n * 10)).toEqual(ok(20));
    expect(map(err('e'), (n: number) => n * 10)).toEqual(err('e'));
  });

  it('andThen chains on Ok', () => {
    const r = andThen(ok(3), (n) => ok(n + 1));
    expect(r).toEqual(ok(4));
    const r2 = andThen(err('nope'), (n: number) => ok(n + 1));
    expect(r2).toEqual(err('nope'));
    const r3 = andThen(ok(3), () => err('chain fail'));
    expect(r3).toEqual(err('chain fail'));
  });

  it('tryFn captures throws', () => {
    expect(tryFn(() => 5)).toEqual(ok(5));
    expect(tryFn(() => { throw new Error('boom'); })).toEqual(err('boom'));
  });

  it('tryAsync captures rejections', async () => {
    expect(await tryAsync(Promise.resolve(5))).toEqual(ok(5));
    expect(await tryAsync(Promise.reject(new Error('async boom')))).toEqual(err('async boom'));
  });
});
