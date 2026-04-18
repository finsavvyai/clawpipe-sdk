/** Tag- and header-regex-based routing filters.
 *
 * Ported from LiteLLM's tag_management. Narrows the candidate provider/model
 * list BEFORE the weight-based pick. Examples:
 *
 *   { tag: "eu", allow: [{ provider: "mistral" }] }
 *   { headerMatch: { name: "x-tenant", pattern: "^premium-" }, allow: [{ provider: "anthropic", model: "claude-opus-4-7" }] }
 */
import type { AllowlistEntry } from './types';

export interface TagRule {
  /** Match when a request tag equals this value. */
  tag?: string;
  /** Match when a request header matches the given regex. */
  headerMatch?: { name: string; pattern: string };
  /** Providers/models allowed when the rule matches. */
  allow: AllowlistEntry[];
}

export interface RouteFilterContext {
  tags?: string[];
  headers?: Record<string, string>;
}

export class RouterTags {
  private rules: TagRule[];

  constructor(rules: TagRule[] = []) {
    this.rules = rules;
  }

  /** Return the first matching rule, or null. */
  match(ctx: RouteFilterContext): TagRule | null {
    for (const rule of this.rules) {
      if (rule.tag && ctx.tags?.includes(rule.tag)) return rule;
      if (rule.headerMatch) {
        const val = ctx.headers?.[rule.headerMatch.name.toLowerCase()];
        if (val && new RegExp(rule.headerMatch.pattern).test(val)) return rule;
      }
    }
    return null;
  }

  /** Narrow an allowlist to the matching rule's entries. */
  filter(candidates: AllowlistEntry[], ctx: RouteFilterContext): AllowlistEntry[] {
    const rule = this.match(ctx);
    if (!rule) return candidates;
    return candidates.filter((c) =>
      rule.allow.some(
        (a) => a.provider === c.provider && (!a.model || a.model === c.model),
      ),
    );
  }

  addRule(rule: TagRule): void {
    this.rules.push(rule);
  }

  get ruleCount(): number {
    return this.rules.length;
  }
}
