import { describe, it, expect, vi, afterEach } from 'vitest';
import { scoreResponse, parseScore } from './scorer';

afterEach(() => vi.restoreAllMocks());

describe('parseScore()', () => {
  it('extracts valid score from JSON', () => {
    expect(parseScore('{"score": 0.85}')).toBe(0.85);
  });

  it('clamps score above 1 to 1', () => {
    expect(parseScore('{"score": 1.5}')).toBe(1);
  });

  it('clamps score below 0 to 0', () => {
    expect(parseScore('{"score": -0.2}')).toBe(0);
  });

  it('returns 0.5 on invalid JSON', () => {
    expect(parseScore('not json')).toBe(0.5);
  });

  it('returns 0.5 when score field is missing', () => {
    expect(parseScore('{"result": 0.9}')).toBe(0.5);
  });

  it('returns 0.5 when score is not a number', () => {
    expect(parseScore('{"score": "high"}')).toBe(0.5);
  });

  it('returns 0.5 on empty string', () => {
    expect(parseScore('')).toBe(0.5);
  });
});

describe('scoreResponse()', () => {
  it('returns parsed score from judge response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"score": 0.85}' } }] }),
        { status: 200 },
      ),
    ));
    const score = await scoreResponse('What is 2+2?', '4', { apiKey: 'test-key' });
    expect(score).toBe(0.85);
  });

  it('uses gpt-4o-mini as default model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"score": 0.9}' } }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await scoreResponse('prompt', 'response', { apiKey: 'k' });
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.model).toBe('gpt-4o-mini');
  });

  it('uses custom model and baseUrl when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"score": 0.7}' } }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await scoreResponse('p', 'r', { apiKey: 'k', model: 'gpt-4o', baseUrl: 'https://custom.api/v1' });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('https://custom.api/v1');
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.model).toBe('gpt-4o');
  });

  it('returns 0.5 when judge response is unparseable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'garbage' } }] }), { status: 200 }),
    ));
    const score = await scoreResponse('x', 'y', { apiKey: 'k' });
    expect(score).toBe(0.5);
  });

  it('returns 0.5 on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')));
    const score = await scoreResponse('x', 'y', { apiKey: 'k' });
    expect(score).toBe(0.5);
  });

  it('returns 0.5 on timeout (AbortError)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })), 50)),
    ));
    const score = await scoreResponse('x', 'y', { apiKey: 'k' });
    expect(score).toBe(0.5);
  });

  it('sends Authorization header with Bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"score": 0.8}' } }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await scoreResponse('p', 'r', { apiKey: 'my-secret' });
    const headers = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-secret');
  });
});
