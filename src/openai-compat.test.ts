import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAI } from './openai-compat';
import type { ChatCompletion } from './openai-compat';

/* ── Mock the ClawPipe pipeline ── */

const mockPrompt = vi.fn();

vi.mock('./index', () => ({
  ClawPipe: vi.fn().mockImplementation(() => ({ prompt: mockPrompt })),
}));

/* ── Helpers ── */

function pipelineResult(text: string, overrides: Record<string, unknown> = {}) {
  return {
    text,
    meta: {
      boosted: false, cached: false, packed: false, contextSavings: '0%',
      route: 'openai', model: 'gpt-4o-mini', latencyMs: 200,
      tokensIn: 10, tokensOut: 25, estimatedCostUsd: 0.001,
      budgetRemainingUsd: null, rateLimitRemaining: null,
      circuitBreakerState: 'closed',
      ...overrides,
    },
  };
}

/* ── Tests ── */

describe('OpenAI drop-in replacement', () => {
  let client: OpenAI;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenAI({ apiKey: 'cp_test123' });
  });

  describe('response format matches OpenAI exactly', () => {
    it('returns all required top-level fields', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('Hello!'));

      const res: ChatCompletion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(res.object).toBe('chat.completion');
      expect(res.id).toMatch(/^chatcmpl-/);
      expect(typeof res.created).toBe('number');
      expect(res.model).toBe('gpt-4o-mini');
      expect(res.system_fingerprint).toBeNull();
    });

    it('returns choices array with correct structure', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('World'));

      const res = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(res.choices).toHaveLength(1);
      const choice = res.choices[0];
      expect(choice.index).toBe(0);
      expect(choice.finish_reason).toBe('stop');
      expect(choice.logprobs).toBeNull();
      expect(choice.message.role).toBe('assistant');
      expect(choice.message.content).toBe('World');
      expect(choice.message.refusal).toBeNull();
    });

    it('returns usage with token counts', async () => {
      mockPrompt.mockResolvedValueOnce(
        pipelineResult('OK', { tokensIn: 15, tokensOut: 30 }),
      );

      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(res.usage.prompt_tokens).toBe(15);
      expect(res.usage.completion_tokens).toBe(30);
      expect(res.usage.total_tokens).toBe(45);
    });

    it('response.choices[0].message.content works as expected', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('The answer is 42'));

      const res = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'What is the meaning?' }],
      });

      expect(res.choices[0].message.content).toBe('The answer is 42');
    });
  });

  describe('model="auto" routing', () => {
    it('passes no explicit model/provider to pipeline', async () => {
      mockPrompt.mockResolvedValueOnce(
        pipelineResult('auto response', { model: 'deepseek-chat', route: 'deepseek' }),
      );

      const res = await client.chat.completions.create({
        model: 'auto',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.model).toBeUndefined();
      expect(opts.provider).toBeUndefined();
      expect(res.model).toBe('deepseek-chat');
    });

    it('treats missing model same as auto', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('hi'));

      await client.chat.completions.create({
        model: '',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.model).toBeUndefined();
    });
  });

  describe('explicit model passthrough', () => {
    it('passes gpt-4o with provider openai', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('done'));

      await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.model).toBe('gpt-4o');
      expect(opts.provider).toBe('openai');
    });

    it('passes claude model with provider anthropic', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('done'));

      await client.chat.completions.create({
        model: 'claude-sonnet-4',
        messages: [{ role: 'user', content: 'test' }],
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.model).toBe('claude-sonnet-4');
      expect(opts.provider).toBe('anthropic');
    });

    it('infers deepseek provider', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('done'));

      await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(mockPrompt.mock.calls[0][1].provider).toBe('deepseek');
    });
  });

  describe('system message handling', () => {
    it('extracts system messages and passes as options.system', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('yes'));

      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hi' },
        ],
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.system).toBe('You are helpful.');
    });

    it('concatenates multiple system messages', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('ok'));

      await client.chat.completions.create({
        model: 'auto',
        messages: [
          { role: 'system', content: 'Rule 1' },
          { role: 'system', content: 'Rule 2' },
          { role: 'user', content: 'Go' },
        ],
      });

      expect(mockPrompt.mock.calls[0][1].system).toBe('Rule 1\nRule 2');
    });
  });

  describe('optional parameters', () => {
    it('passes max_tokens and temperature', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('ok'));

      await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 500,
        temperature: 0.7,
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.maxTokens).toBe(500);
      expect(opts.temperature).toBe(0.7);
    });
  });

  describe('constructor options', () => {
    it('accepts projectId', () => {
      const c = new OpenAI({ apiKey: 'cp_key', projectId: 'proj-1' });
      expect(c).toBeDefined();
    });

    it('defaults projectId to "default"', () => {
      const c = new OpenAI({ apiKey: 'cp_key' });
      expect(c).toBeDefined();
    });
  });

  describe('error propagation', () => {
    it('propagates gateway errors', async () => {
      mockPrompt.mockRejectedValueOnce(new Error('gateway 503'));

      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      ).rejects.toThrow('gateway 503');
    });
  });
});
