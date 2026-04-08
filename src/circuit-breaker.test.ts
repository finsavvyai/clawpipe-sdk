import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('starts with all providers available', () => {
    const cb = new CircuitBreaker();
    expect(cb.isAvailable('openai')).toBe(true);
    expect(cb.status('openai').state).toBe('closed');
  });

  it('opens circuit after threshold failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    expect(cb.isAvailable('openai')).toBe(true); // 2 < 3
    cb.recordFailure('openai');
    expect(cb.isAvailable('openai')).toBe(false); // 3 >= 3
    expect(cb.status('openai').state).toBe('open');
  });

  it('closes circuit on success', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    expect(cb.status('openai').state).toBe('open');
    // Simulate recovery time passing
    vi.useFakeTimers();
    vi.advanceTimersByTime(31_000);
    expect(cb.isAvailable('openai')).toBe(true); // half-open
    cb.recordSuccess('openai');
    expect(cb.status('openai').state).toBe('closed');
    expect(cb.status('openai').failures).toBe(0);
    vi.useRealTimers();
  });

  it('transitions to half-open after recovery time', () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker({ failureThreshold: 1, recoveryMs: 5000 });
    cb.recordFailure('anthropic');
    expect(cb.isAvailable('anthropic')).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(cb.isAvailable('anthropic')).toBe(true);
    expect(cb.status('anthropic').state).toBe('half-open');
    vi.useRealTimers();
  });

  it('filters available providers', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.recordFailure('openai');
    const available = cb.filterAvailable(['openai', 'anthropic', 'deepseek']);
    expect(available).toEqual(['anthropic', 'deepseek']);
  });

  it('returns all statuses', () => {
    const cb = new CircuitBreaker();
    cb.recordSuccess('openai');
    cb.recordFailure('anthropic');
    const statuses = cb.allStatuses();
    expect(statuses.length).toBe(2);
  });

  it('resets a specific provider', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.recordFailure('openai');
    cb.reset('openai');
    expect(cb.isAvailable('openai')).toBe(true);
    expect(cb.status('openai').state).toBe('closed');
  });

  it('resets all providers', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.recordFailure('openai');
    cb.recordFailure('anthropic');
    cb.resetAll();
    expect(cb.allStatuses()).toEqual([]);
  });

  it('defaults to 5 failure threshold', () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 4; i++) cb.recordFailure('test');
    expect(cb.isAvailable('test')).toBe(true);
    cb.recordFailure('test');
    expect(cb.isAvailable('test')).toBe(false);
  });
});
