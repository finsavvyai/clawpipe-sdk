/**
 * Anthropic SDK drop-in replacement.
 *
 * Users change ONE import and their existing Anthropic code runs
 * through ClawPipe's optimization pipeline, saving 30-50%.
 *
 * ```ts
 * // Before:  import Anthropic from '@anthropic-ai/sdk';
 * // After:
 * import { Anthropic } from 'clawpipe-ai/anthropic-compat';
 * ```
 */

import { ClawPipe } from './index';
import type { PromptOptions, PipelineResult } from './types';

/* ── Anthropic-compatible response types ── */

export interface ContentBlock {
  type: 'text';
  text: string;
}

export interface MessageUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface Message {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  usage: MessageUsage;
}

/* ── Internal helpers ── */

function generateId(): string {
  const hex = Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `msg_${hex}`;
}

function inferProvider(model: string): string {
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  if (model.startsWith('deepseek')) return 'deepseek';
  if (model.startsWith('llama')) return 'groq';
  if (model.startsWith('mistral')) return 'mistral';
  return 'anthropic';
}

function buildOptions(params: CreateParams): { options: PromptOptions; isAuto: boolean } {
  const isAuto = !params.model || params.model === 'auto';
  const options: PromptOptions = { maxTokens: params.max_tokens };
  if (!isAuto) {
    options.model = params.model;
    options.provider = inferProvider(params.model);
  }
  return { options, isAuto };
}

function toMessage(result: PipelineResult, model: string): Message {
  return {
    id: generateId(),
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: result.text }],
    model: result.meta.model || model,
    stop_reason: 'end_turn',
    usage: {
      input_tokens: result.meta.tokensIn,
      output_tokens: result.meta.tokensOut,
    },
  };
}

/* ── Public types ── */

export interface AnthropicConfig {
  apiKey: string;
  projectId?: string;
  baseURL?: string;
}

export interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

export interface CreateParams {
  model: string;
  max_tokens: number;
  messages: MessageParam[];
  system?: string;
  stream?: boolean;
}

/* ── Messages resource ── */

class Messages {
  constructor(private readonly pipe: ClawPipe) {}

  async create(params: CreateParams): Promise<Message> {
    if (params.stream) {
      throw new Error(
        'Streaming is not yet supported in the ClawPipe SDK. Use stream: false or follow the ClawPipe roadmap.',
      );
    }

    const prompt = params.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const { options } = buildOptions(params);
    if (params.system) options.system = params.system;

    const result = await this.pipe.prompt(prompt, options);
    return toMessage(result, params.model);
  }
}

/* ── Drop-in replacement class ── */

export class Anthropic {
  private pipe: ClawPipe;
  readonly messages: Messages;

  constructor(config: AnthropicConfig) {
    this.pipe = new ClawPipe({
      apiKey: config.apiKey,
      projectId: config.projectId ?? 'default',
      gatewayUrl: config.baseURL,
    });
    this.messages = new Messages(this.pipe);
  }
}
