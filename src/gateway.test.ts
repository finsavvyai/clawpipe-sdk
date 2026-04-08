import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Gateway, GatewayError } from './gateway';

describe('GatewayError', () => {
  it('includes status code and body', () => {
    const err = new GatewayError(500, 'Internal Server Error');
    expect(err.statusCode).toBe(500);
    expect(err.responseBody).toBe('Internal Server Error');
    expect(err.message).toContain('500');
    expect(err.message).toContain('Internal Server Error');
    expect(err.name).toBe('GatewayError');
  });

  it('handles empty body', () => {
    const err = new GatewayError(404, '');
    expect(err.message).toContain('404');
    expect(err.responseBody).toBe('');
  });

  it('truncates long body in message', () => {
    const longBody = 'x'.repeat(500);
    const err = new GatewayError(400, longBody);
    expect(err.message.length).toBeLessThan(300);
  });
});

describe('Gateway.call', () => {
  const config = { gatewayUrl: 'https://api.test.com/v1', apiKey: 'test-key', projectId: 'proj-1' };
  const route = { provider: 'openai', model: 'gpt-4o-mini' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends correct headers and body', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ text: 'hi', tokensIn: 5, tokensOut: 3, latencyMs: 100 }), { status: 200 }),
    );

    const gw = new Gateway(config);
    await gw.call('Hello', { system: 'Be brief' }, route);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test.com/v1/prompt');
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-key');
    expect(headers['X-Project-Id']).toBe('proj-1');
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.prompt).toBe('Hello');
    expect(body.provider).toBe('openai');
  });

  it('returns parsed response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ text: 'result', tokensIn: 10, tokensOut: 20, latencyMs: 250 }), { status: 200 }),
    );

    const gw = new Gateway(config);
    const res = await gw.call('Test', {}, route);
    expect(res.text).toBe('result');
    expect(res.tokensIn).toBe(10);
    expect(res.tokensOut).toBe(20);
    expect(res.latencyMs).toBe(250);
  });

  it('throws GatewayError on 429 rate limit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Rate limit exceeded', { status: 429 }),
    );

    const gw = new Gateway(config);
    await expect(gw.call('Test', {}, route)).rejects.toThrow(GatewayError);
    try {
      await gw.call('Test', {}, route);
    } catch (e) {
      expect((e as GatewayError).statusCode).toBe(429);
    }
  });

  it('throws GatewayError on 500 server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const gw = new Gateway(config);
    await expect(gw.call('Test', {}, route)).rejects.toThrow(GatewayError);
  });

  it('throws GatewayError on 401 unauthorized', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    );

    const gw = new Gateway(config);
    try {
      await gw.call('Test', {}, route);
    } catch (e) {
      expect(e).toBeInstanceOf(GatewayError);
      expect((e as GatewayError).statusCode).toBe(401);
    }
  });

  it('handles network timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network timeout'));

    const gw = new Gateway(config);
    await expect(gw.call('Test', {}, route)).rejects.toThrow('network timeout');
  });
});

describe('Gateway.stream', () => {
  const config = { gatewayUrl: 'https://api.test.com/v1', apiKey: 'test-key', projectId: 'proj-1' };
  const route = { provider: 'openai', model: 'gpt-4o-mini' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('yields chunks from stream', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('Hello '));
        controller.enqueue(encoder.encode('world'));
        controller.close();
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream, { status: 200 }));

    const gw = new Gateway(config);
    const chunks: string[] = [];
    for await (const chunk of gw.stream('Test', {}, route)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('Hello world');
  });

  it('throws on non-ok stream response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 }),
    );

    const gw = new Gateway(config);
    await expect(async () => {
      for await (const _ of gw.stream('Test', {}, route)) { /* consume */ }
    }).rejects.toThrow(GatewayError);
  });

  it('throws on null body', async () => {
    const res = new Response(null, { status: 200 });
    Object.defineProperty(res, 'body', { value: null });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res);

    const gw = new Gateway(config);
    await expect(async () => {
      for await (const _ of gw.stream('Test', {}, route)) { /* consume */ }
    }).rejects.toThrow('No response body');
  });
});
