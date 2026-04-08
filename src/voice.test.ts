import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Voice } from './voice';

describe('Voice', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('transcribes audio via STT server', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ text: 'hello world', language: 'en' }), { status: 200 }),
    );

    const voice = new Voice();
    const result = await voice.transcribe(new ArrayBuffer(100));
    expect(result.text).toBe('hello world');
    expect(result.language).toBe('en');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('synthesizes text via TTS server', async () => {
    const audioData = new ArrayBuffer(1024);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(audioData, {
        status: 200,
        headers: { 'content-type': 'audio/wav' },
      }),
    );

    const voice = new Voice();
    const result = await voice.synthesize('hello');
    expect(result.audio.byteLength).toBe(1024);
    expect(result.format).toBe('audio/wav');
  });

  it('throws on STT server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server Error', { status: 500 }),
    );

    const voice = new Voice();
    await expect(voice.transcribe(new ArrayBuffer(100))).rejects.toThrow('STT error: 500');
  });

  it('throws on TTS server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server Error', { status: 500 }),
    );

    const voice = new Voice();
    await expect(voice.synthesize('hello')).rejects.toThrow('TTS error: 500');
  });

  it('checks STT availability', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const voice = new Voice();
    expect(await voice.isSttAvailable()).toBe(false);
  });

  it('checks TTS availability', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    const voice = new Voice();
    expect(await voice.isTtsAvailable()).toBe(true);
  });

  it('uses custom URLs', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ text: 'test' }), { status: 200 }),
    );

    const voice = new Voice({ sttUrl: 'http://custom:9999/stt' });
    await voice.transcribe(new ArrayBuffer(10));

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://custom:9999/stt');
  });
});
