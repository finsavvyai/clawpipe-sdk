/** Recursive target resolver — unifies fallback, loadbalance, single.
 *
 * Ported from Portkey's tryTargetsRecursively. A Target is either a leaf
 * (provider/model) or a nested Strategy (fallback | loadbalance | conditional).
 * resolveTargets() flattens nested trees into an ordered attempt list.
 */
import type { AllowlistEntry } from './types';

export type Target = LeafTarget | StrategyTarget;

export interface LeafTarget {
  kind: 'leaf';
  provider: string;
  model?: string;
  weight?: number;
}

export type StrategyKind = 'fallback' | 'loadbalance' | 'single';

export interface StrategyTarget {
  kind: 'strategy';
  strategy: StrategyKind;
  targets: Target[];
}

export function leaf(provider: string, model?: string, weight?: number): LeafTarget {
  return { kind: 'leaf', provider, model, weight };
}
export function fallback(...targets: Target[]): StrategyTarget {
  return { kind: 'strategy', strategy: 'fallback', targets };
}
export function loadbalance(...targets: Target[]): StrategyTarget {
  return { kind: 'strategy', strategy: 'loadbalance', targets };
}

function weightedPick<T extends { weight?: number }>(items: T[]): T {
  const weights = items.map((i) => i.weight ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Flatten a target tree into the attempt order that tryTargetsRecursively would use. */
export function resolveTargets(target: Target): AllowlistEntry[] {
  if (target.kind === 'leaf') return [{ provider: target.provider, model: target.model }];
  if (target.strategy === 'single') return resolveTargets(target.targets[0]);
  if (target.strategy === 'fallback') return target.targets.flatMap(resolveTargets);
  // loadbalance — weighted random pick for the primary, rest as fallbacks
  if (target.targets.length === 0) return [];
  const primary = weightedPick(
    target.targets.map((t) => ({ target: t, weight: t.kind === 'leaf' ? (t.weight ?? 1) : 1 })),
  ).target;
  const rest = target.targets.filter((t) => t !== primary);
  return [...resolveTargets(primary), ...rest.flatMap(resolveTargets)];
}
