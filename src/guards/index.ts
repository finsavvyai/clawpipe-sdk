/** Pluggable guardrail registry barrel. */
export type { GuardPlugin, GuardContext, GuardOutcome } from './types';
export { GuardRegistry } from './registry';
export type { GuardRule, GuardRunResult } from './registry';
export { defaultGuards } from './default-guards';

import { GuardRegistry } from './registry';
import { defaultGuards } from './default-guards';

/** Preconfigured registry with all 15 default guards loaded. */
export function createDefaultGuards(): GuardRegistry {
  const r = new GuardRegistry();
  r.registerAll(defaultGuards);
  return r;
}
