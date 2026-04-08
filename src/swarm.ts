/**
 * Swarm — multi-model fan-out and aggregation.
 *
 * Sends the same prompt to N models concurrently and aggregates
 * results using one of several strategies: first (fastest),
 * vote (majority), best (highest quality), or merge (combine).
 */

import type { GatewayResponse, PromptOptions } from './types';
import type { Gateway } from './gateway';

export type SwarmStrategy = 'first' | 'vote' | 'best' | 'merge';

export interface SwarmConfig {
  models: SwarmModel[];
  strategy: SwarmStrategy;
  timeoutMs?: number;
}

export interface SwarmModel {
  provider: string;
  model: string;
  qualityScore?: number;
}

export interface SwarmResult {
  text: string;
  strategy: SwarmStrategy;
  candidates: SwarmCandidate[];
  totalLatencyMs: number;
}

export interface SwarmCandidate {
  provider: string;
  model: string;
  text: string;
  latencyMs: number;
  tokensOut: number;
  selected: boolean;
}

export class Swarm {
  private config: SwarmConfig;

  constructor(config: SwarmConfig) {
    if (config.models.length === 0) {
      throw new Error('Swarm requires at least one model');
    }
    this.config = config;
  }

  /** Fan out a prompt to all models and aggregate results. */
  async run(
    prompt: string,
    options: PromptOptions,
    gateway: Gateway,
  ): Promise<SwarmResult> {
    const start = Date.now();
    const timeoutMs = this.config.timeoutMs ?? 30_000;

    const promises = this.config.models.map((m) =>
      this.callWithTimeout(prompt, options, m, gateway, timeoutMs),
    );

    const settled = await Promise.allSettled(promises);
    const candidates: SwarmCandidate[] = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const model = this.config.models[i];
      if (result.status === 'fulfilled' && result.value) {
        candidates.push({
          provider: model.provider,
          model: model.model,
          text: result.value.text,
          latencyMs: result.value.latencyMs,
          tokensOut: result.value.tokensOut,
          selected: false,
        });
      }
    }

    if (candidates.length === 0) {
      throw new Error('All swarm candidates failed');
    }

    const selected = this.aggregate(candidates);
    const elapsed = Date.now() - start;

    return {
      text: selected.text,
      strategy: this.config.strategy,
      candidates,
      totalLatencyMs: elapsed,
    };
  }

  private aggregate(candidates: SwarmCandidate[]): SwarmCandidate {
    switch (this.config.strategy) {
      case 'first':
        return this.selectFirst(candidates);
      case 'best':
        return this.selectBest(candidates);
      case 'vote':
        return this.selectVote(candidates);
      case 'merge':
        return this.selectMerge(candidates);
      default:
        return this.selectFirst(candidates);
    }
  }

  /** Select fastest response. */
  private selectFirst(candidates: SwarmCandidate[]): SwarmCandidate {
    candidates.sort((a, b) => a.latencyMs - b.latencyMs);
    candidates[0].selected = true;
    return candidates[0];
  }

  /** Select response from highest-quality model. */
  private selectBest(candidates: SwarmCandidate[]): SwarmCandidate {
    const modelScores = new Map(
      this.config.models.map((m) => [`${m.provider}:${m.model}`, m.qualityScore ?? 0.5]),
    );
    candidates.sort((a, b) => {
      const sa = modelScores.get(`${a.provider}:${a.model}`) ?? 0.5;
      const sb = modelScores.get(`${b.provider}:${b.model}`) ?? 0.5;
      return sb - sa;
    });
    candidates[0].selected = true;
    return candidates[0];
  }

  /** Select response that appears most frequently (longest common output). */
  private selectVote(candidates: SwarmCandidate[]): SwarmCandidate {
    const scores = candidates.map((c, i) => {
      let similarity = 0;
      for (let j = 0; j < candidates.length; j++) {
        if (i !== j) similarity += this.textSimilarity(c.text, candidates[j].text);
      }
      return { index: i, similarity };
    });
    scores.sort((a, b) => b.similarity - a.similarity);
    const winner = candidates[scores[0].index];
    winner.selected = true;
    return winner;
  }

  /** Merge: pick the longest response (most detailed). */
  private selectMerge(candidates: SwarmCandidate[]): SwarmCandidate {
    candidates.sort((a, b) => b.tokensOut - a.tokensOut);
    candidates[0].selected = true;
    return candidates[0];
  }

  /** Simple Jaccard-like text similarity (word overlap). */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    let intersection = 0;
    for (const w of wordsA) if (wordsB.has(w)) intersection++;
    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private async callWithTimeout(
    prompt: string,
    options: PromptOptions,
    model: SwarmModel,
    gateway: Gateway,
    timeoutMs: number,
  ): Promise<GatewayResponse | null> {
    return Promise.race([
      gateway.call(prompt, options, { provider: model.provider, model: model.model }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  }
}
