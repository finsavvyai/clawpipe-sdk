/**
 * CP-015: Router global weight sync — integration tests.
 * Tests push → fetch → merge → route cycle using a local gateway mock.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Router, mergeWeights } from './router';
import type { LearnedWeight } from './router';

afterEach(() => vi.restoreAllMocks());

// ── Weight push/fetch wiring ───────────────────────────────────────────────────

describe('globalLearning disabled (default)', () => {
  it('does not fetch remote weights on route()', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const r = new Router({ gatewayUrl: 'https://example.com', apiKey: 'key' });
    await r.route('hello');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not push weights after learn()', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const r = new Router({ gatewayUrl: 'https://example.com', apiKey: 'key' });
    const dec = await r.route('hello');
    r.learn(dec, 300, 100);
    // give fire-and-forget a tick
    await new Promise(r => setTimeout(r, 10));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('globalLearning enabled — fetch on first route()', () => {
  it('fetches from /v1/weights with Bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ weights: {} }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const r = new Router({
      gatewayUrl: 'https://api.clawpipe.test',
      apiKey: 'test-key',
      globalLearning: true,
    });
    await r.route('hello');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.clawpipe.test/v1/weights');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-key');
  });

  it('fetches only once across multiple route() calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ weights: {} }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const r = new Router({ gatewayUrl: 'https://api.clawpipe.test', apiKey: 'k', globalLearning: true });
    await r.route('first');
    await r.route('second');
    await r.route('third');

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('merges remote weights into local before routing', async () => {
    const remoteWeights: Record<string, LearnedWeight> = {
      'groq:llama-3.1-8b-instant': { totalCalls: 50, avgLatencyMs: 150, avgTokensOut: 80, score: 0.95 },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ weights: remoteWeights }), { status: 200 }),
    ));

    const r = new Router({ gatewayUrl: 'https://x', apiKey: 'k', globalLearning: true });
    await r.route('hi');

    const w = r.getWeights().get('groq:llama-3.1-8b-instant');
    expect(w).toBeDefined();
    expect(w!.totalCalls).toBe(50);
    expect(w!.score).toBeCloseTo(0.95);
  });

  it('continues without weights when fetch returns non-200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })));

    const r = new Router({ gatewayUrl: 'https://x', apiKey: 'k', globalLearning: true });
    const dec = await r.route('hello');
    expect(dec).toHaveProperty('provider');
    expect(r.getWeights().size).toBe(0);
  });

  it('continues when fetch throws (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')));

    const r = new Router({ gatewayUrl: 'https://x', apiKey: 'k', globalLearning: true });
    const dec = await r.route('hello');
    expect(dec).toHaveProperty('provider');
  });

  it('handles missing gateway URL gracefully (no fetch called)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const r = new Router({ globalLearning: true }); // no gatewayUrl
    await r.route('hello');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ── Weight push after learn() ─────────────────────────────────────────────────

describe('globalLearning enabled — push after learn()', () => {
  it('PUTs weights to /v1/weights after learn()', async () => {
    // First call is GET (fetch weights), subsequent calls are PUT (push)
    const calls: { method: string; url: string }[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      calls.push({ method: init?.method ?? 'GET', url });
      return new Response(JSON.stringify({ weights: {} }), { status: 200 });
    }));

    const r = new Router({ gatewayUrl: 'https://api.clawpipe.test', apiKey: 'k', globalLearning: true });
    const dec = await r.route('test');
    r.learn(dec, 200, 100);

    await new Promise(r => setTimeout(r, 20)); // let fire-and-forget complete

    const putCall = calls.find(c => c.method === 'PUT');
    expect(putCall).toBeDefined();
    expect(putCall!.url).toBe('https://api.clawpipe.test/v1/weights');
  });

  it('PUT body contains current weights as JSON', async () => {
    let capturedBody: unknown = null;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') capturedBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ weights: {} }), { status: 200 });
    }));

    const r = new Router({ gatewayUrl: 'https://x', apiKey: 'k', globalLearning: true });
    const dec = await r.route('test');
    r.learn(dec, 400, 200, 0.9);

    await new Promise(r => setTimeout(r, 20));

    expect(capturedBody).toBeDefined();
    const body = capturedBody as { weights: Record<string, LearnedWeight> };
    const key = `${dec.provider}:${dec.model}`;
    expect(body.weights[key]).toBeDefined();
    expect(body.weights[key].totalCalls).toBe(1);
  });

  it('push failure does not throw (fire-and-forget)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') throw new Error('network gone');
      return new Response(JSON.stringify({ weights: {} }), { status: 200 });
    }));

    const r = new Router({ gatewayUrl: 'https://x', apiKey: 'k', globalLearning: true });
    const dec = await r.route('test');
    expect(() => r.learn(dec, 100, 100)).not.toThrow();
    await new Promise(r => setTimeout(r, 20));
  });
});

// ── Full push → fetch → merge → route cycle ──────────────────────────────────

describe('full push → fetch → merge → route cycle', () => {
  it('two routers share weights via gateway mock', async () => {
    // Simulated gateway store
    let gatewayStore: Record<string, LearnedWeight> = {};

    const gatewayMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(init.body as string) as { weights: Record<string, LearnedWeight> };
        gatewayStore = mergeWeights(gatewayStore, body.weights);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      // GET
      return new Response(JSON.stringify({ weights: gatewayStore }), { status: 200 });
    });
    vi.stubGlobal('fetch', gatewayMock);

    // Router A learns from 20 calls
    const rA = new Router({ gatewayUrl: 'https://gw', apiKey: 'k', globalLearning: true });
    const decA = await rA.route('test');
    for (let i = 0; i < 20; i++) rA.learn(decA, 100, 200);
    await new Promise(r => setTimeout(r, 30)); // push settles

    // Router B starts fresh, fetches weights on first route
    vi.stubGlobal('fetch', gatewayMock); // same mock, same store
    const rB = new Router({ gatewayUrl: 'https://gw', apiKey: 'k', globalLearning: true });
    await rB.route('hello');

    const keyA = `${decA.provider}:${decA.model}`;
    const wB = rB.getWeights().get(keyA);
    expect(wB).toBeDefined();
    expect(wB!.totalCalls).toBeGreaterThanOrEqual(20);
  });

  it('local pre-existing weights are merged with remote via weighted average', async () => {
    const remoteWeights: Record<string, LearnedWeight> = {
      'openai:gpt-4o-mini': { totalCalls: 10, avgLatencyMs: 500, avgTokensOut: 200, score: 0.7 },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ weights: remoteWeights }), { status: 200 }),
    ));

    const localWeight: LearnedWeight = { totalCalls: 10, avgLatencyMs: 300, avgTokensOut: 100, score: 0.9 };
    const r = new Router({ gatewayUrl: 'https://x', apiKey: 'k', globalLearning: true });
    r.setWeights(new Map([['openai:gpt-4o-mini', localWeight]]));
    await r.route('test'); // triggers merge

    const merged = r.getWeights().get('openai:gpt-4o-mini')!;
    expect(merged.totalCalls).toBe(20);
    expect(merged.avgLatencyMs).toBeCloseTo(400); // (300*10 + 500*10) / 20
    expect(merged.score).toBeCloseTo(0.8);        // (0.9*10 + 0.7*10) / 20
  });
});
