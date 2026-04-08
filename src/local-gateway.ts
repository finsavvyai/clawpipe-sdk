/**
 * LocalGateway — calls local LLM servers directly.
 *
 * Supports llamafile, Ollama, and LM Studio via their
 * OpenAI-compatible chat/completions API endpoints.
 * Used as a fallback when the remote gateway is unreachable.
 */

import type { GatewayResponse, PromptOptions } from './types';

export class LocalGateway {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /** Send a prompt to a local model. */
  async call(
    prompt: string,
    options: PromptOptions,
    route: { provider: string; model: string },
  ): Promise<GatewayResponse> {
    const start = Date.now();
    const messages: Array<{ role: string; content: string }> = [];
    if (options.system) messages.push({ role: 'system', content: options.system });
    messages.push({ role: 'user', content: prompt });

    const url = this.baseUrl.includes('11434')
      ? `${this.baseUrl}/api/chat`
      : `${this.baseUrl}/v1/chat/completions`;

    const body = this.baseUrl.includes('11434')
      ? { model: route.model, messages, stream: false }
      : {
          model: route.model,
          messages,
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
        };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Local model error: ${res.status}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const latencyMs = Date.now() - start;

    return this.parseResponse(data, latencyMs);
  }

  private parseResponse(data: Record<string, unknown>, latencyMs: number): GatewayResponse {
    // Ollama format
    if ('message' in data && typeof data.message === 'object') {
      const msg = data.message as { content: string };
      return {
        text: msg.content ?? '',
        tokensIn: (data.prompt_eval_count as number) ?? 0,
        tokensOut: (data.eval_count as number) ?? 0,
        latencyMs,
      };
    }

    // OpenAI-compatible format (llamafile, LM Studio)
    if ('choices' in data && Array.isArray(data.choices)) {
      const choices = data.choices as Array<{ message: { content: string } }>;
      const usage = data.usage as { prompt_tokens: number; completion_tokens: number } | undefined;
      return {
        text: choices[0]?.message?.content ?? '',
        tokensIn: usage?.prompt_tokens ?? 0,
        tokensOut: usage?.completion_tokens ?? 0,
        latencyMs,
      };
    }

    return { text: '', tokensIn: 0, tokensOut: 0, latencyMs };
  }
}
