import { describe, it, expect, vi } from 'vitest';
import { Budget, BudgetExceededError } from './budget';

describe('Budget', () => {
  it('allows requests when no cap is set', () => {
    const b = new Budget();
    expect(() => b.check()).not.toThrow();
  });

  it('tracks spending', () => {
    const b = new Budget({ capUsd: 10 });
    b.record(2.5);
    b.record(1.5);
    const s = b.status();
    expect(s.spentUsd).toBe(4);
    expect(s.remainingUsd).toBe(6);
    expect(s.percentUsed).toBe(40);
  });

  it('throws BudgetExceededError when over cap', () => {
    const b = new Budget({ capUsd: 1 });
    b.record(1.5);
    expect(() => b.check()).toThrow(BudgetExceededError);
  });

  it('emits warning when over warnUsd', () => {
    const handler = vi.fn();
    const b = new Budget({ capUsd: 10, warnUsd: 5 });
    b.onWarning(handler);
    b.record(6);
    b.check();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].isOverWarn).toBe(true);
  });

  it('does not warn below threshold', () => {
    const handler = vi.fn();
    const b = new Budget({ capUsd: 10, warnUsd: 5 });
    b.onWarning(handler);
    b.record(3);
    b.check();
    expect(handler).not.toHaveBeenCalled();
  });

  it('resets spend', () => {
    const b = new Budget({ capUsd: 10 });
    b.record(5);
    b.reset();
    expect(b.status().spentUsd).toBe(0);
  });

  it('prunes old records outside window', () => {
    vi.useFakeTimers();
    const b = new Budget({ capUsd: 100, windowMs: 1000 });
    b.record(50);
    vi.advanceTimersByTime(2000);
    expect(b.status().spentUsd).toBe(0);
    vi.useRealTimers();
  });

  it('reports null remaining when no cap', () => {
    const b = new Budget();
    expect(b.status().remainingUsd).toBeNull();
    expect(b.status().percentUsed).toBeNull();
  });

  it('BudgetExceededError has status property', () => {
    const b = new Budget({ capUsd: 1 });
    b.record(2);
    try {
      b.check();
    } catch (err) {
      expect(err).toBeInstanceOf(BudgetExceededError);
      expect((err as BudgetExceededError).status.isOverCap).toBe(true);
    }
  });
});
