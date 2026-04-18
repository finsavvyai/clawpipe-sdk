/** Helicone-style rate-limit policy grammar parser.
 *
 * Format:  "[quota];w=[seconds];u=[request|cents];s=[global|user|property:NAME]"
 *
 *   "1000;w=60;u=request;s=global"               — 1000 req/min globally
 *   "500;w=3600;u=cents;s=property:tenant_id"    — 500 cents/hr per tenant
 *   "100;w=1;u=request;s=user"                   — 100 req/s per user
 */

export type Unit = 'request' | 'cents';
export type Scope = 'global' | 'user' | { property: string };

export interface RateLimitPolicy {
  quota: number;
  windowSeconds: number;
  unit: Unit;
  scope: Scope;
}

export type PolicyParseResult =
  | { ok: true; policy: RateLimitPolicy }
  | { ok: false; error: string };

export function parseRateLimitPolicy(raw: string): PolicyParseResult {
  if (!raw || typeof raw !== 'string') return { ok: false, error: 'empty policy' };
  const parts = raw.split(';').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: false, error: 'no parts' };

  const quota = parseInt(parts[0], 10);
  if (!Number.isFinite(quota) || quota <= 0) return { ok: false, error: `invalid quota: ${parts[0]}` };

  let windowSeconds = 60;
  let unit: Unit = 'request';
  let scope: Scope = 'global';

  for (const p of parts.slice(1)) {
    const [k, v] = p.split('=', 2).map((s) => s.trim());
    if (!v) return { ok: false, error: `malformed part: ${p}` };
    if (k === 'w') {
      const n = parseInt(v, 10);
      if (!Number.isFinite(n) || n <= 0) return { ok: false, error: `invalid w: ${v}` };
      windowSeconds = n;
    } else if (k === 'u') {
      if (v !== 'request' && v !== 'cents') return { ok: false, error: `invalid u: ${v}` };
      unit = v;
    } else if (k === 's') {
      if (v === 'global' || v === 'user') scope = v;
      else if (v.startsWith('property:')) {
        const name = v.slice('property:'.length);
        if (!name) return { ok: false, error: 'property scope missing name' };
        scope = { property: name };
      } else return { ok: false, error: `invalid s: ${v}` };
    }
  }

  return { ok: true, policy: { quota, windowSeconds, unit, scope } };
}

/** Derive a KV key for enforcement given a parsed policy + request attributes. */
export function policyKey(
  policy: RateLimitPolicy,
  attrs: { userId?: string; properties?: Record<string, string> },
): string {
  if (policy.scope === 'global') return `rl:global`;
  if (policy.scope === 'user') return `rl:user:${attrs.userId ?? 'anon'}`;
  const propName = policy.scope.property;
  return `rl:prop:${propName}:${attrs.properties?.[propName] ?? 'none'}`;
}
