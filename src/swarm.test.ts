import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Swarm } from './swarm';
import { Gateway } from './gateway';

function mockGateway(responses: Record<string, { text: string; latencyMs: number; tokensOut: number }>): Gateway {
  const gw = new Gateway({ gatewayUrl: 'http://test', apiKey: 'k', projectId: 'p' });
  vi.spyOn(gw, 'call').mockImplementation(async (_prompt, _opts, route) => {
    const key = `${route.provider}:${route.model}`;
    const r = responses[key];
    if (!r) throw new Error(`No mock for ${key}`);
    return { text: r.text, tokensIn: 10, tokensOut: r.tokensOut, latencyMs: r.latencyMs };
  });
  return gw;
}

describe('Swarm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws if no models provided', () => {
    expect(() => new Swarm({ models: [], strategy: 'first' })).toThrow('at least one model');
  });

  it('strategy=first selects fastest response', async () => {
    const gw = mockGateway({
      'openai:gpt-4o': { text: 'slow answer', latencyMs: 500, tokensOut: 50 },
      'groq:llama': { text: 'fast answer', latencyMs: 100, tokensOut: 30 },
    });

    const swarm = new Swarm({
      models: [
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'groq', model: 'llama' },
      ],
      strategy: 'first',
    });

    const result = await swarm.run('test', {}, gw);
    expect(result.text).toBe('fast answer');
    expect(result.strategy).toBe('first');
    expect(result.candidates).toHaveLength(2);
  });

  it('strategy=best selects highest quality model', async () => {
    const gw = mockGateway({
      'openai:gpt-4o': { text: 'quality answer', latencyMs: 500, tokensOut: 50 },
      'groq:llama': { text: 'fast answer', latencyMs: 100, tokensOut: 30 },
    });

    const swarm = new Swarm({
      models: [
        { provider: 'openai', model: 'gpt-4o', qualityScore: 0.95 },
        { provider: 'groq', model: 'llama', qualityScore: 0.7 },
      ],
      strategy: 'best',
    });

    const result = await swarm.run('test', {}, gw);
    expect(result.text).toBe('quality answer');
  });

  it('strategy=vote selects most similar response', async () => {
    const gw = mockGateway({
      'a:m1': { text: 'The answer is 42', latencyMs: 100, tokensOut: 5 },
      'b:m2': { text: 'The answer is 42 exactly', latencyMs: 200, tokensOut: 6 },
      'c:m3': { text: 'Something completely different', latencyMs: 150, tokensOut: 4 },
    });

    const swarm = new Swarm({
      models: [
        { provider: 'a', model: 'm1' },
        { provider: 'b', model: 'm2' },
        { provider: 'c', model: 'm3' },
      ],
      strategy: 'vote',
    });

    const result = await swarm.run('test', {}, gw);
    // m1 and m2 are similar, so one of them should win
    expect(result.text).toMatch(/answer is 42/);
  });

  it('strategy=merge selects longest response', async () => {
    const gw = mockGateway({
      'a:m1': { text: 'short', latencyMs: 100, tokensOut: 5 },
      'b:m2': { text: 'much longer and more detailed response', latencyMs: 200, tokensOut: 50 },
    });

    const swarm = new Swarm({
      models: [
        { provider: 'a', model: 'm1' },
        { provider: 'b', model: 'm2' },
      ],
      strategy: 'merge',
    });

    const result = await swarm.run('test', {}, gw);
    expect(result.text).toBe('much longer and more detailed response');
  });

  it('handles partial failures gracefully', async () => {
    const gw = new Gateway({ gatewayUrl: 'http://test', apiKey: 'k', projectId: 'p' });
    vi.spyOn(gw, 'call').mockImplementation(async (_prompt, _opts, route) => {
      if (route.provider === 'a') throw new Error('Provider down');
      return { text: 'ok', tokensIn: 5, tokensOut: 10, latencyMs: 100 };
    });

    const swarm = new Swarm({
      models: [
        { provider: 'a', model: 'm1' },
        { provider: 'b', model: 'm2' },
      ],
      strategy: 'first',
    });

    const result = await swarm.run('test', {}, gw);
    expect(result.text).toBe('ok');
    expect(result.candidates).toHaveLength(1);
  });

  it('throws when all candidates fail', async () => {
    const gw = new Gateway({ gatewayUrl: 'http://test', apiKey: 'k', projectId: 'p' });
    vi.spyOn(gw, 'call').mockRejectedValue(new Error('All down'));

    const swarm = new Swarm({
      models: [{ provider: 'a', model: 'm1' }],
      strategy: 'first',
    });

    await expect(swarm.run('test', {}, gw)).rejects.toThrow('All swarm candidates failed');
  });
});
