/**
 * OpenAI SDK drop-in replacement.
 *
 * Users change ONE import and their existing OpenAI code runs
 * through ClawPipe's optimization pipeline, saving 30-50%.
 *
 * ```ts
 * // Before:  import OpenAI from 'openai';
 * // After:
 * import { OpenAI } from 'clawpipe-ai/openai-compat';
 * ```
 */

import { ClawPipe } from './index';
import type { PipelineResult, PromptOptions } from './types';

/* ── OpenAI-compatible response types ── */

export interface ChatCompletionMessage {
  role: 'assistant';
  content: string;
  refusal: null;
}

export interface Choice {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
  logprobs: null;
}

export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Choice[];
  usage: CompletionUsage;
  system_fingerprint: string | null;
}

/* ── Streaming chunk types ── */

export interface ChatCompletionChunkDelta {
  role?: 'assistant';
  content?: string;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: ChatCompletionChunkDelta;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
}

/* ── Internal helpers ── */

function generateId(): string {
  const hex = Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `chatcmpl-${hex}`;
}

function extractMessages(
  messages: Array<{ role: string; content: string }>,
): { system: string | undefined; prompt: string } {
  const systemMsgs = messages.filter((m) => m.role === 'system');
  const nonSystem = messages.filter((m) => m.role !== 'system');
  const system = systemMsgs.map((m) => m.content).join('\n') || undefined;
  const prompt = nonSystem.map((m) => `${m.role}: ${m.content}`).join('\n');
  return { system, prompt };
}

function buildOptions(
  params: CreateParams,
): { options: PromptOptions; isAuto: boolean } {
  const isAuto = !params.model || params.model === 'auto';
  const options: PromptOptions = {
    maxTokens: params.max_tokens,
    temperature: params.temperature,
  };
  if (!isAuto) {
    options.model = params.model;
    options.provider = inferProvider(params.model);
  }
  return { options, isAuto };
}

function inferProvider(model: string): string {
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('deepseek')) return 'deepseek';
  if (model.startsWith('llama')) return 'groq';
  if (model.startsWith('mistral')) return 'mistral';
  return 'openai';
}

function toCompletion(result: PipelineResult, model: string): ChatCompletion {
  const id = generateId();
  return {
    id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: result.meta.model || model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: result.text, refusal: null },
      finish_reason: 'stop',
      logprobs: null,
    }],
    usage: {
      prompt_tokens: result.meta.tokensIn,
      completion_tokens: result.meta.tokensOut,
      total_tokens: result.meta.tokensIn + result.meta.tokensOut,
    },
    system_fingerprint: null,
  };
}

/* ── Public types ── */

export interface OpenAIConfig {
  apiKey: string;
  projectId?: string;
  baseURL?: string;
}

export interface CreateParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

/* ── Drop-in replacement class ── */

export class OpenAI {
  private pipe: ClawPipe;
  chat: { completions: { create: (params: CreateParams) => Promise<ChatCompletion> } };

  constructor(config: OpenAIConfig) {
    this.pipe = new ClawPipe({
      apiKey: config.apiKey,
      projectId: config.projectId ?? 'default',
      gatewayUrl: config.baseURL,
    });
    this.chat = {
      completions: { create: this.createCompletion.bind(this) },
    };
  }

  private async createCompletion(params: CreateParams): Promise<ChatCompletion> {
    const { system, prompt } = extractMessages(params.messages);
    const { options } = buildOptions(params);
    if (system) options.system = system;
    const result = await this.pipe.prompt(prompt, options);
    return toCompletion(result, params.model);
  }
}
