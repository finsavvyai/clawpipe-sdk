import { describe, it, expect } from 'vitest';
import { checkBudgetChain, applySpend } from './budget-tree';

describe('budget-tree', () => {
  it('allows when every node has room', () => {
    const r = checkBudgetChain([
      { name: 'org', spentUsd: 0, capUsd: 1000 },
      { name: 'team', spentUsd: 0, capUsd: 200 },
      { name: 'user', spentUsd: 0, capUsd: 50 },
    ], 5);
    expect(r.allowed).toBe(true);
    expect(r.remainingUsd).toBe(45);
  });

  it('blocks at exhausted node', () => {
    const r = checkBudgetChain([
      { name: 'org', spentUsd: 0, capUsd: 1000 },
      { name: 'team', spentUsd: 195, capUsd: 200 },
    ], 10);
    expect(r.allowed).toBe(false);
    expect(r.exhausted).toBe('team');
  });

  it('treats null capUsd as unlimited', () => {
    const r = checkBudgetChain([{ name: 'org', spentUsd: 1_000_000, capUsd: null }], 5);
    expect(r.allowed).toBe(true);
    expect(r.remainingUsd).toBe(null);
  });

  it('surfaces the tightest remaining', () => {
    const r = checkBudgetChain([
      { name: 'org', spentUsd: 0, capUsd: 1000 },
      { name: 'team', spentUsd: 0, capUsd: 10 },
      { name: 'user', spentUsd: 0, capUsd: 100 },
    ]);
    expect(r.remainingUsd).toBe(10);
  });

  it('applySpend increments each node', () => {
    const base = [
      { name: 'a', spentUsd: 5, capUsd: 100 },
      { name: 'b', spentUsd: 10, capUsd: 100 },
    ];
    const after = applySpend(base, 3);
    expect(after[0].spentUsd).toBe(8);
    expect(after[1].spentUsd).toBe(13);
    expect(base[0].spentUsd).toBe(5);  // original unmutated
  });
});
