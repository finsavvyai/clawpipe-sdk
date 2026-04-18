/** Result<T, E> — typed {ok, data} | {ok:false, error} pattern (Helicone). */

export type Ok<T> = { ok: true; data: T };
export type Err<E = string> = { ok: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err<E = string>(error: E): Err<E> {
  return { ok: false, error };
}

/** Unwrap or throw with a default message. Prefer explicit checks for hot paths. */
export function unwrap<T, E>(r: Result<T, E>, msg = 'Result unwrap on Err'): T {
  if (r.ok) return r.data;
  throw new Error(`${msg}: ${JSON.stringify(r.error)}`);
}

/** Map the Ok value, leave Err untouched. */
export function map<T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> {
  return r.ok ? ok(f(r.data)) : r;
}

/** Chain a Result-returning fn on the Ok path. */
export function andThen<T, U, E>(
  r: Result<T, E>, f: (t: T) => Result<U, E>,
): Result<U, E> {
  return r.ok ? f(r.data) : r;
}

/** Turn a sync thunk into a Result, catching thrown errors. */
export function tryFn<T>(fn: () => T): Result<T, string> {
  try { return ok(fn()); }
  catch (e) { return err(e instanceof Error ? e.message : String(e)); }
}

/** Turn a Promise into a Promise<Result>, catching rejections. */
export async function tryAsync<T>(p: Promise<T>): Promise<Result<T, string>> {
  try { return ok(await p); }
  catch (e) { return err(e instanceof Error ? e.message : String(e)); }
}
