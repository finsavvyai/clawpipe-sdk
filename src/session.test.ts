import { describe, it, expect, vi } from 'vitest';
import { ClawSession, MemorySessionStore } from './session';
import type { ClawPipe } from './index';
import type { PipelineResult } from './types';

function fakePipe(reply: string): ClawPipe {
  const pipe = {
    prompt: vi.fn(async (): Promise<PipelineResult> => ({
      text: reply,
      meta: {
        boosted: false, cached: false, packed: false, contextSavings: '0%',
        route: 'openai', model: 'gpt-4o-mini', latencyMs: 100,
        tokensIn: 50, tokensOut: 80, estimatedCostUsd: 0.01,
        budgetRemainingUsd: null, rateLimitRemaining: null, circuitBreakerState: 'closed',
      },
    })),
  } as unknown as ClawPipe;
  return pipe;
}

describe('ClawSession', () => {
  it('creates session with system prompt', async () => {
    const s = await ClawSession.create(fakePipe('hi'), 'p1', new MemorySessionStore(), 'You are helpful');
    expect(s.history.length).toBe(1);
    expect(s.history[0].role).toBe('system');
  });

  it('ask appends user + assistant messages', async () => {
    const s = await ClawSession.create(fakePipe('hello back'), 'p1');
    const r = await s.ask('hi');
    expect(r.text).toBe('hello back');
    expect(s.history.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('accumulates cost and tokens', async () => {
    const s = await ClawSession.create(fakePipe('reply'), 'p1');
    await s.ask('q1');
    await s.ask('q2');
    const stats = s.stats();
    expect(stats.turns).toBe(2);
    expect(stats.totalCostUsd).toBeCloseTo(0.02, 5);
    expect(stats.totalTokensOut).toBe(160);
  });

  it('resume loads from store', async () => {
    const store = new MemorySessionStore();
    const a = await ClawSession.create(fakePipe('a'), 'p1', store);
    await a.ask('hi');
    const b = await ClawSession.resume(fakePipe('b'), a.id, store);
    expect(b).not.toBeNull();
    expect(b!.history.length).toBe(2);
  });

  it('returns null when resuming unknown session', async () => {
    const r = await ClawSession.resume(fakePipe('x'), 'nope', new MemorySessionStore());
    expect(r).toBeNull();
  });

  it('throws past maxTurns', async () => {
    const s = new ClawSession(
      fakePipe('reply'),
      { id: 's1', projectId: 'p', messages: [], createdAt: Date.now(),
        totalCostUsd: 0, totalTokensIn: 0, totalTokensOut: 0, turns: 0 },
      new MemorySessionStore(), 1,
    );
    await s.ask('q1');
    await expect(s.ask('q2')).rejects.toThrow(/max 1 turns/);
  });

  it('destroy removes from store', async () => {
    const store = new MemorySessionStore();
    const s = await ClawSession.create(fakePipe('x'), 'p1', store);
    const id = s.id;
    await s.destroy();
    expect(await store.load(id)).toBeNull();
  });
});
