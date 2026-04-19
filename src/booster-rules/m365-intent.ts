/** M365 / TenantIQ intent patterns — recognizers for queries that can be
 * answered from cached Microsoft Graph data instead of an LLM.
 *
 * These are NOT default Booster rules (they need tenant context, not just
 * a prompt string). Instead they are exported as patterns + an intent
 * classifier so vertical apps (TenantIQ-style MSP tools) can wire their
 * own handlers.
 *
 * Usage:
 *   import { classifyM365Intent } from 'clawpipe-ai';
 *   const intent = classifyM365Intent(prompt);
 *   if (intent === 'license_summary') return formatLicenses(graphCache);
 *   // else fall through to ClawPipe.prompt(...)
 */

export type M365Intent =
  | 'license_summary'
  | 'user_summary'
  | 'security_misconfig'
  | 'mfa_status'
  | 'guest_audit'
  | 'cis_score'
  | 'inactive_users'
  | null;

interface IntentRule {
  intent: M365Intent;
  patterns: RegExp[];
}

// Order matters: more specific intents first (so 'how many users without
// mfa' matches mfa_status, not user_summary).
const RULES: IntentRule[] = [
  {
    intent: 'license_summary',
    patterns: [
      /how many (?:licenses?|skus?|subscriptions?)/i,
      /license (?:count|total|usage|summary|waste)/i,
      /(?:total|all) licenses/i,
      /what licenses (?:do we|does? (?:the|this) tenant) have/i,
      /unused licenses?/i,
    ],
  },
  {
    intent: 'mfa_status',
    patterns: [
      /(?:mfa|multi.?factor) (?:status|disabled|not enabled|missing|enrolled)/i,
      /(?:no |without )?mfa/i,
      /mfa (?:coverage|enrollment)/i,
    ],
  },
  {
    intent: 'inactive_users',
    patterns: [
      /inactive users?/i,
      /(?:dormant|stale) (?:account|user)s?/i,
      /how many (?:inactive|dormant) (?:users?|accounts?)/i,
    ],
  },
  {
    intent: 'guest_audit',
    patterns: [
      /(?:how many )?guests?(?: users)?/i,
      /external (?:user|account)s?/i,
      /b2b (?:user|account|guest)s?/i,
    ],
  },
  {
    intent: 'user_summary',
    patterns: [
      /how many users/i,
      /user (?:count|total|summary)/i,
      /(?:total|all) users/i,
      /(?:active|disabled) (?:user )?count/i,
    ],
  },
  {
    intent: 'security_misconfig',
    patterns: [
      /(?:security|risk) (?:issues?|problems?|misconfig|posture)/i,
      /what(?:'s| is) (?:wrong|insecure|misconfigured)/i,
      /legacy (?:auth|authentication)/i,
      /security (?:summary|overview)/i,
    ],
  },
  {
    intent: 'cis_score',
    patterns: [
      /cis (?:score|benchmark|compliance)/i,
      /benchmark (?:score|status|results?)/i,
      /(?:current )?compliance score/i,
    ],
  },
];

/** Return the matched intent or null. First-match wins. */
export function classifyM365Intent(prompt: string): M365Intent {
  const trimmed = prompt.trim();
  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (p.test(trimmed)) return rule.intent;
    }
  }
  return null;
}

/** Get the raw rules for inspection or extension. */
export function getM365IntentRules(): IntentRule[] {
  return RULES.map((r) => ({ intent: r.intent, patterns: [...r.patterns] }));
}
