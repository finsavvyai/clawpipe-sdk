import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalProvider } from './local-provider';

describe('LocalProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when no servers running', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const lp = new LocalProvider();
    const models = await lp.detect(500);
    expect(models).toHaveLength(0);
    expect(lp.getDetected()).toHaveLength(0);
  });

  it('detects llamafile server', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('localhost:8080')) {
        return new Response(JSON.stringify({
          data: [{ id: 'LLaMA_CPP' }],
        }), { status: 200 });
      }
      throw new Error('ECONNREFUSED');
    });

    const lp = new LocalProvider();
    const models = await lp.detect(500);
    expect(models.length).toBeGreaterThanOrEqual(1);
    expect(models[0].provider).toBe('local-llamafile');
    expect(models[0].model).toBe('LLaMA_CPP');
  });

  it('detects ollama server', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('localhost:11434')) {
        return new Response(JSON.stringify({
          models: [{ name: 'llama3:latest' }, { name: 'codellama:7b' }],
        }), { status: 200 });
      }
      throw new Error('ECONNREFUSED');
    });

    const lp = new LocalProvider();
    const models = await lp.detect(500);
    expect(models).toHaveLength(2);
    expect(models[0].provider).toBe('local-ollama');
    expect(models[1].model).toBe('codellama:7b');
  });

  it('handles timeout gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return new Response('', { status: 200 });
    });

    const lp = new LocalProvider();
    const models = await lp.detect(100);
    expect(models).toHaveLength(0);
  });

  it('returns model URL for detected model', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('localhost:8080')) {
        return new Response(JSON.stringify({
          data: [{ id: 'model-a' }],
        }), { status: 200 });
      }
      throw new Error('ECONNREFUSED');
    });

    const lp = new LocalProvider();
    await lp.detect(500);
    expect(lp.getModelUrl('local-llamafile', 'model-a')).toBe('http://localhost:8080');
    expect(lp.getModelUrl('unknown', 'model-a')).toBeNull();
  });
});
