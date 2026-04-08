/**
 * ClawPipe SDK — The intelligent AI pipeline.
 * Booster -> Pack -> Cache -> Route -> Call -> Learn.
 *
 * @module clawpipe
 */

import { Booster } from './booster';
import { Packer } from './packer';
import { Cache } from './cache';
import { Router } from './router';

export interface ClawPipeConfig {
  apiKey: string;
  projectId: string;
  gatewayUrl?: string;
  cacheTtlMs?: number;
  enableBooster?: boolean;
  enablePacker?: boolean;
  enableCache?: boolean;
}

export interface PromptOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  provider?: string;
  taskType?: string;
}

export interface PipelineMeta {
  boosted: boolean;
  cached: boolean;
  packed: boolean;
  contextSavings: string;
  route: string;
  model: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
}

export interface PipelineResult {
  text: string;
  meta: PipelineMeta;
}

const DEFAULT_GATEWAY = 'https://api.clawpipe.dev/v1';

/**
 * ClawPipe client — runs the full pipeline on every prompt.
 */
export class ClawPipe {
  private config: Required<ClawPipeConfig>;
  private booster: Booster;
  private packer: Packer;
  private cache: Cache;
  private router: Router;

  constructor(config: ClawPipeConfig) {
    this.config = {
      gatewayUrl: DEFAULT_GATEWAY,
      cacheTtlMs: 300_000,
      enableBooster: true,
      enablePacker: true,
      enableCache: true,
      ...config,
    };
    this.booster = new Booster();
    this.packer = new Packer();
    this.cache = new Cache(this.config.cacheTtlMs);
    this.router = new Router();
  }

  /** Send a prompt through the full pipeline. */
  async prompt(input: string, options: PromptOptions = {}): Promise<PipelineResult> {
    const start = Date.now();
    const meta: Partial<PipelineMeta> = {
      boosted: false, cached: false, packed: false,
      contextSavings: '0%', route: '', model: '', tokensIn: 0, tokensOut: 0,
    };

    // Stage 1: Booster — try to resolve without LLM
    if (this.config.enableBooster) {
      const boosted = this.booster.tryResolve(input);
      if (boosted !== null) {
        meta.boosted = true;
        meta.latencyMs = Date.now() - start;
        return { text: boosted, meta: meta as PipelineMeta };
      }
    }

    // Stage 2: Packer — compress context
    let packed = input;
    if (this.config.enablePacker) {
      const result = this.packer.pack(input, options.system);
      packed = result.packed;
      meta.packed = true;
      meta.contextSavings = result.savings;
    }

    // Stage 3: Cache — check for cached response
    if (this.config.enableCache) {
      const cacheKey = this.cache.key(packed, options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        meta.cached = true;
        meta.latencyMs = Date.now() - start;
        return { text: cached, meta: meta as PipelineMeta };
      }
    }

    // Stage 4: Route — pick best provider/model
    const route = this.router.route(packed, options);
    meta.route = route.provider;
    meta.model = route.model;

    // Stage 5: Call — send to gateway
    const response = await this.callGateway(packed, options, route);
    meta.tokensIn = response.tokensIn;
    meta.tokensOut = response.tokensOut;

    // Stage 6: Learn — record outcome for routing improvement
    this.router.learn(route, response.latencyMs, response.tokensOut);

    // Store in cache
    if (this.config.enableCache) {
      const cacheKey = this.cache.key(packed, options);
      this.cache.set(cacheKey, response.text);
    }

    meta.latencyMs = Date.now() - start;
    return { text: response.text, meta: meta as PipelineMeta };
  }

  /** Stream a prompt through the pipeline. Yields text chunks. */
  async *stream(input: string, options: PromptOptions = {}): AsyncGenerator<string> {
    const packed = this.config.enablePacker
      ? this.packer.pack(input, options.system).packed
      : input;
    const route = this.router.route(packed, options);
    const url = `${this.config.gatewayUrl}/stream`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ prompt: packed, ...options, ...route }),
    });
    if (!res.ok) throw new Error(`ClawPipe stream error: ${res.status}`);
    if (!res.body) throw new Error('No response body for stream');
    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  }

  private async callGateway(
    prompt: string, options: PromptOptions, route: { provider: string; model: string },
  ) {
    const url = `${this.config.gatewayUrl}/prompt`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ prompt, ...options, ...route }),
    });
    if (!res.ok) throw new Error(`ClawPipe gateway error: ${res.status}`);
    return res.json() as Promise<{
      text: string; tokensIn: number; tokensOut: number; latencyMs: number;
    }>;
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-Project-Id': this.config.projectId,
    };
  }
}

export { Booster } from './booster';
export { Packer } from './packer';
export { Cache } from './cache';
export { Router } from './router';
