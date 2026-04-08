/**
 * Gateway — HTTP client for the ClawPipe gateway API.
 *
 * Handles prompt dispatch and streaming to the remote gateway.
 * Used internally by the ClawPipe orchestrator.
 */

import type { GatewayResponse, PromptOptions } from './types';

export interface GatewayConfig {
  gatewayUrl: string;
  apiKey: string;
  projectId: string;
}

export class Gateway {
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  /** Send a prompt to the gateway and return the response. */
  async call(
    prompt: string,
    options: PromptOptions,
    route: { provider: string; model: string },
  ): Promise<GatewayResponse> {
    const url = `${this.config.gatewayUrl}/prompt`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ prompt, ...options, ...route }),
    });
    if (!res.ok) {
      throw new GatewayError(res.status, await res.text().catch(() => ''));
    }
    return res.json() as Promise<GatewayResponse>;
  }

  /** Stream a prompt through the gateway. Yields text chunks. */
  async *stream(
    prompt: string,
    options: PromptOptions,
    route: { provider: string; model: string },
  ): AsyncGenerator<string> {
    const url = `${this.config.gatewayUrl}/stream`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ prompt, ...options, ...route }),
    });
    if (!res.ok) {
      throw new GatewayError(res.status, await res.text().catch(() => ''));
    }
    if (!res.body) throw new Error('No response body for stream');

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-Project-Id': this.config.projectId,
    };
  }
}

export class GatewayError extends Error {
  public readonly statusCode: number;
  public readonly responseBody: string;

  constructor(statusCode: number, body: string) {
    super(`ClawPipe gateway error: ${statusCode}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    this.name = 'GatewayError';
    this.statusCode = statusCode;
    this.responseBody = body;
  }
}
