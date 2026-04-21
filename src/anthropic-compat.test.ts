import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Anthropic } from './anthropic-compat';
import type { Message } from './anthropic-compat';

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
      route: 'anthropic', model: 'claude-3-5-sonnet-20241022', latencyMs: 180,
      tokensIn: 10, tokensOut: 20, estimatedCostUsd: 0.002,
      budgetRemainingUsd: null, rateLimitRemaining: null,
      circuitBreakerState: 'closed',
      ...overrides,
    },
  };
}

/* ── Tests ── */

describe('Anthropic drop-in replacement', () => {
  let client: Anthropic;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new Anthropic({ apiKey: 'cp_test123' });
  });

  describe('response shape matches anthropic.Message', () => {
    it('returns all required top-level fields', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('Hello!'));

      const msg: Message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(msg.type).toBe('message');
      expect(msg.role).toBe('assistant');
      expect(msg.id).toMatch(/^msg_/);
      expect(msg.stop_reason).toBe('end_turn');
      expect(msg.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('content array has text block with correct text', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('The answer is 42'));

      const msg = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        messages: [{ role: 'user', content: 'What is the answer?' }],
      });

      expect(msg.content).toHaveLength(1);
      expect(msg.content[0].type).toBe('text');
      expect(msg.content[0].text).toBe('The answer is 42');
    });

    it('usage has input_tokens and output_tokens', async () => {
      mockPrompt.mockResolvedValueOnce(
        pipelineResult('OK', { tokensIn: 15, tokensOut: 30 }),
      );

      const msg = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(msg.usage.input_tokens).toBe(15);
      expect(msg.usage.output_tokens).toBe(30);
    });

    it('msg.content[0].text is accessible as expected by real SDK users', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('ClawPipe works!'));

      const msg = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        messages: [{ role: 'user', content: 'Does it work?' }],
      });

      expect(msg.content[0].text).toBe('ClawPipe works!');
    });
  });

  describe('model="auto" routing', () => {
    it('passes no model or provider to pipeline', async () => {
      mockPrompt.mockResolvedValueOnce(
        pipelineResult('auto response', { model: 'claude-3-5-sonnet-20241022', route: 'anthropic' }),
      );

      const msg = await client.messages.create({
        model: 'auto',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.model).toBeUndefined();
      expect(opts.provider).toBeUndefined();
      expect(msg.model).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('explicit model routing', () => {
    it('claude model sets provider=anthropic', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('done'));

      await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'test' }],
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.model).toBe('claude-3-5-sonnet-20241022');
      expect(opts.provider).toBe('anthropic');
    });
  });

  describe('authorization header', () => {
    it('ClawPipe is constructed with the provided apiKey', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('ok'));

      await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      // Verify the pipeline was called (meaning constructor ran with apiKey)
      expect(mockPrompt).toHaveBeenCalledTimes(1);
      // The ClawPipe mock was invoked with the apiKey during construction in beforeEach
      const { ClawPipe } = await import('./index');
      expect(vi.mocked(ClawPipe)).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'cp_test123' }),
      );
    });
  });

  describe('system prompt', () => {
    it('passes system to pipeline options', async () => {
      mockPrompt.mockResolvedValueOnce(pipelineResult('yes'));

      await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        messages: [{ role: 'user', content: 'Hi' }],
        system: 'You are a pirate.',
      });

      const opts = mockPrompt.mock.calls[0][1];
      expect(opts.system).toBe('You are a pirate.');
    });
  });

  describe('error handling', () => {
    it('non-200 / gateway error propagates', async () => {
      mockPrompt.mockRejectedValueOnce(new Error('gateway 503'));

      await expect(
        client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      ).rejects.toThrow('gateway 503');
    });

    it('stream: true throws NotImplementedError', async () => {
      await expect(
        client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: 'Hi' }],
          stream: true,
        }),
      ).rejects.toThrow('Streaming is not yet supported');
    });
  });
});
