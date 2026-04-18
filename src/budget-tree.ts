/** Hierarchical budget walk: org -> team -> user -> key -> model.
 *
 * Ported from LiteLLM. Walks each node's spend vs cap; returns the first
 * exhausted node's name so the caller can fail with a precise error.
 */

export interface BudgetNode {
  name: string;
  spentUsd: number;
  capUsd: number | null;   // null = unlimited
}

export interface BudgetCheck {
  allowed: boolean;
  exhausted: string | null;
  remainingUsd: number | null;
}

/** Walk nodes in order. First node where spent >= cap blocks. */
export function checkBudgetChain(nodes: BudgetNode[], addUsd = 0): BudgetCheck {
  let minRemaining: number | null = null;
  for (const n of nodes) {
    if (n.capUsd === null) continue;
    const projected = n.spentUsd + addUsd;
    const remaining = n.capUsd - projected;
    if (projected > n.capUsd) return { allowed: false, exhausted: n.name, remainingUsd: 0 };
    if (minRemaining === null || remaining < minRemaining) minRemaining = remaining;
  }
  return { allowed: true, exhausted: null, remainingUsd: minRemaining };
}

/** Record spend against every node in the chain (idempotent per caller). */
export function applySpend(nodes: BudgetNode[], addUsd: number): BudgetNode[] {
  return nodes.map((n) => ({ ...n, spentUsd: n.spentUsd + addUsd }));
}
