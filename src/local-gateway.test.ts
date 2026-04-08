import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalGateway } from './local-gateway';

describe('LocalGateway', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls OpenAI-compatible endpoint for llamafile', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: 'Hello from local' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }), { status: 200 }),
    );

    const gw = new LocalGateway('http://localhost:8080');
    const res = await gw.call('Hi', {}, { provider: 'local', model: 'test' });
    expect(res.text).toBe('Hello from local');
    expect(res.tokensIn).toBe(10);
    expect(res.tokensOut).toBe(20);

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('/v1/chat/completions');
  });

  it('calls Ollama endpoint when port is 11434', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        message: { content: 'Ollama response' },
        prompt_eval_count: 5,
        eval_count: 15,
      }), { status: 200 }),
    );

    const gw = new LocalGateway('http://localhost:11434');
    const res = await gw.call('Hi', {}, { provider: 'local-ollama', model: 'llama3' });
    expect(res.text).toBe('Ollama response');
    expect(res.tokensIn).toBe(5);
    expect(res.tokensOut).toBe(15);

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('/api/chat');
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server Error', { status: 500 }),
    );

    const gw = new LocalGateway('http://localhost:8080');
    await expect(gw.call('Hi', {}, { provider: 'local', model: 'test' }))
      .rejects.toThrow('Local model error: 500');
  });

  it('handles missing usage data gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: 'response' } }],
      }), { status: 200 }),
    );

    const gw = new LocalGateway('http://localhost:8080');
    const res = await gw.call('Hi', {}, { provider: 'local', model: 'test' });
    expect(res.text).toBe('response');
    expect(res.tokensIn).toBe(0);
    expect(res.tokensOut).toBe(0);
  });
});
