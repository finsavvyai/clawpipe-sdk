/** Pluggable guardrail registry barrel. */
export type { GuardPlugin, GuardContext, GuardOutcome } from './types';
export { GuardRegistry } from './registry';
export type { GuardRule, GuardRunResult } from './registry';
export { defaultGuards } from './default-guards';
export { dlpGuards } from './dlp-guards';

import { GuardRegistry } from './registry';
import { defaultGuards } from './default-guards';
import { dlpGuards } from './dlp-guards';

/** Preconfigured registry with all 15 default guards loaded. */
export function createDefaultGuards(): GuardRegistry {
  const r = new GuardRegistry();
  r.registerAll(defaultGuards);
  return r;
}

/** Registry pre-loaded with sdlc.cc-style DLP pack (12 PII guards). */
export function createDlpGuards(): GuardRegistry {
  const r = new GuardRegistry();
  r.registerAll([...defaultGuards, ...dlpGuards]);
  return r;
}
