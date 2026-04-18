/** Conditional router — declarative "metadata.X op Y -> target" rules.
 *
 * Ported from Portkey conditional strategy. Rules evaluated top-to-bottom,
 * first match wins.
 *
 *   { if: { 'user.tier': { eq: 'pro' } },     route: { provider: 'anthropic', model: 'claude-opus-4-7' } }
 *   { if: { 'region': { in: ['eu','uk'] } }, route: { provider: 'mistral' } }
 *   { if: { 'cost_cap_cents': { lt: 10 } },   route: { provider: 'groq' } }
 */
import type { AllowlistEntry } from './types';

export type Primitive = string | number | boolean;

export interface Condition {
  eq?: Primitive;
  neq?: Primitive;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  in?: Primitive[];
  regex?: string;
  exists?: boolean;
}

export interface ConditionalRule {
  if: Record<string, Condition>;
  route: AllowlistEntry;
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

function check(val: unknown, cond: Condition): boolean {
  if (cond.exists !== undefined) return (val !== undefined) === cond.exists;
  if (val === undefined) return false;
  if (cond.eq !== undefined) return val === cond.eq;
  if (cond.neq !== undefined) return val !== cond.neq;
  if (cond.in !== undefined) return cond.in.includes(val as Primitive);
  if (cond.regex !== undefined) return typeof val === 'string' && new RegExp(cond.regex).test(val);
  if (typeof val !== 'number') return false;
  if (cond.lt !== undefined) return val < cond.lt;
  if (cond.lte !== undefined) return val <= cond.lte;
  if (cond.gt !== undefined) return val > cond.gt;
  if (cond.gte !== undefined) return val >= cond.gte;
  return true;
}

export class ConditionalRouter {
  constructor(private rules: ConditionalRule[] = []) {}

  /** First rule whose every condition matches. */
  resolve(metadata: Record<string, unknown>): AllowlistEntry | null {
    for (const rule of this.rules) {
      const all = Object.entries(rule.if).every(([path, cond]) => check(getPath(metadata, path), cond));
      if (all) return rule.route;
    }
    return null;
  }

  addRule(rule: ConditionalRule): void { this.rules.push(rule); }
  get ruleCount(): number { return this.rules.length; }
}
