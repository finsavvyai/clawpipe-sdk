/**
 * Smart Router — self-learning model selection with optional global weight sync.
 *
 * Tracks outcomes per task type and routes prompts to the best provider/model
 * based on cost, quality, and latency. Weights update after every call and can
 * optionally sync to the ClawPipe gateway for cross-instance learning.
 */

import { fetchRemoteWeights, pushRemoteWeights, pushQualityScore } from './router-sync';

export interface RouterConfig {
  models?: ModelProfile[];
  gatewayUrl?: string;
  apiKey?: string;
  /** When true, push/fetch learned weights from the gateway. Default: false (opt-in). */
  globalLearning?: boolean;
  /** Fraction of responses to quality-score via LLM-as-judge. Default: 0.1 */
  scoringSampleRate?: number;
}

export interface RouteDecision {
  provider: string;
  model: string;
  score: number;
  reason: string;
}

interface ModelProfile {
  provider: string;
  model: string;
  costPer1kTokens: number;
  avgLatencyMs: number;
  qualityScore: number;
  maxTokens: number;
}

export interface LearnedWeight {
  totalCalls: number;
  avgLatencyMs: number;
  avgTokensOut: number;
  score: number;
}

const DEFAULT_MODELS: ModelProfile[] = [
  { provider: 'groq',      model: 'llama-3.1-8b-instant',                                    costPer1kTokens: 0,    avgLatencyMs: 200,  qualityScore: 0.78, maxTokens: 128000 },
  { provider: 'gemini',    model: 'gemini-2.5-flash',                                         costPer1kTokens: 0,    avgLatencyMs: 600,  qualityScore: 0.88, maxTokens: 1000000 },
  { provider: 'deepseek',  model: 'deepseek-chat',                                            costPer1kTokens: 0.14, avgLatencyMs: 800,  qualityScore: 0.82, maxTokens: 64000 },
  { provider: 'openai',    model: 'gpt-4o-mini',                                              costPer1kTokens: 0.15, avgLatencyMs: 600,  qualityScore: 0.85, maxTokens: 128000 },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001',                                costPer1kTokens: 0.25, avgLatencyMs: 500,  qualityScore: 0.88, maxTokens: 200000 },
  { provider: 'openai',    model: 'gpt-4o',                                                   costPer1kTokens: 2.5,  avgLatencyMs: 1200, qualityScore: 0.94, maxTokens: 128000 },
  { provider: 'anthropic', model: 'claude-sonnet-4-6',                                        costPer1kTokens: 3.0,  avgLatencyMs: 1000, qualityScore: 0.95, maxTokens: 200000 },
  { provider: 'anthropic', model: 'claude-opus-4-6',                                          costPer1kTokens: 15.0, avgLatencyMs: 2000, qualityScore: 0.99, maxTokens: 200000 },
  { provider: 'groq',      model: 'llama-3.3-70b-versatile',                                  costPer1kTokens: 0.59, avgLatencyMs: 300,  qualityScore: 0.87, maxTokens: 32000 },
  { provider: 'mistral',   model: 'mistral-large',                                            costPer1kTokens: 2.0,  avgLatencyMs: 900,  qualityScore: 0.90, maxTokens: 128000 },
  { provider: 'together',  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',                  costPer1kTokens: 0.88, avgLatencyMs: 700,  qualityScore: 0.89, maxTokens: 128000 },
  { provider: 'fireworks', model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',        costPer1kTokens: 0.90, avgLatencyMs: 600,  qualityScore: 0.89, maxTokens: 128000 },
  { provider: 'openrouter',model: 'auto',                                                     costPer1kTokens: 1.0,  avgLatencyMs: 800,  qualityScore: 0.85, maxTokens: 128000 },
  { provider: 'perplexity',model: 'llama-3.1-sonar-large-128k-online',                        costPer1kTokens: 1.0,  avgLatencyMs: 1500, qualityScore: 0.88, maxTokens: 128000 },
  { provider: 'xai',       model: 'grok-2-latest',                                            costPer1kTokens: 2.0,  avgLatencyMs: 900,  qualityScore: 0.92, maxTokens: 128000 },
];

type TaskComplexity = 'simple' | 'medium' | 'complex';

/** Merge two weight maps using weighted average by totalCalls. */
export function mergeWeights(
  local: Record<string, LearnedWeight>,
  remote: Record<string, LearnedWeight>,
): Record<string, LearnedWeight> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const result: Record<string, LearnedWeight> = {};
  for (const key of keys) {
    const l = local[key];
    const r = remote[key];
    if (!l) { result[key] = r; continue; }
    if (!r) { result[key] = l; continue; }
    const total = l.totalCalls + r.totalCalls;
    result[key] = {
      totalCalls: total,
      score:        (l.score        * l.totalCalls + r.score        * r.totalCalls) / total,
      avgLatencyMs: (l.avgLatencyMs * l.totalCalls + r.avgLatencyMs * r.totalCalls) / total,
      avgTokensOut: (l.avgTokensOut * l.totalCalls + r.avgTokensOut * r.totalCalls) / total,
    };
  }
  return result;
}

export class Router {
  private models: ModelProfile[];
  private weights = new Map<string, LearnedWeight>();
  private config: RouterConfig;
  private weightsLoaded = false;

  constructor(config?: RouterConfig) {
    this.config = config ?? {};
    this.models = config?.models ?? DEFAULT_MODELS;
  }

  /** Route a prompt to the best provider/model. Fetches remote weights on first call if globalLearning is on. */
  async route(
    prompt: string,
    options: { model?: string; provider?: string; taskType?: string } = {},
  ): Promise<RouteDecision> {
    await this.loadRemoteWeights();
    if (options.model && options.provider) {
      return { provider: options.provider, model: options.model, score: 1, reason: 'explicit' };
    }
    const complexity = this.classifyComplexity(prompt);
    const candidates = this.rankCandidates(complexity);
    const scored = candidates.map((c) => {
      const key = `${c.provider}:${c.model}`;
      const learned = this.weights.get(key);
      const learnedBonus = learned ? (learned.score - 0.5) * 0.2 : 0;
      return { ...c, score: c.score + learnedBonus };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    return { provider: best.provider, model: best.model, score: best.score, reason: `complexity=${complexity}` };
  }

  /** Record outcome. Optionally push updated weights to gateway (fire-and-forget). */
  learn(route: RouteDecision, latencyMs: number, tokensOut: number, qualityScore?: number): void {
    const key = `${route.provider}:${route.model}`;
    const existing = this.weights.get(key);
    if (!existing) {
      this.weights.set(key, {
        totalCalls: 1, avgLatencyMs: latencyMs, avgTokensOut: tokensOut,
        score: this.computeScore(latencyMs, tokensOut, qualityScore),
      });
    } else {
      const n = existing.totalCalls + 1;
      existing.avgLatencyMs = existing.avgLatencyMs + (latencyMs - existing.avgLatencyMs) / n;
      existing.avgTokensOut = existing.avgTokensOut + (tokensOut - existing.avgTokensOut) / n;
      existing.totalCalls = n;
      existing.score = this.computeScore(existing.avgLatencyMs, existing.avgTokensOut, qualityScore);
      this.weights.set(key, existing);
    }
    pushRemoteWeights(this.config, this.getAllWeights()).catch(() => {});
  }

  /** Push a quality score to the gateway. Fire-and-forget — never throws. */
  pushQualityScore(payload: { request_id: string; model: string; provider: string; score: number }): void {
    pushQualityScore(this.config, payload);
  }

  getWeights(): Map<string, LearnedWeight> { return new Map(this.weights); }
  setWeights(weights: Map<string, LearnedWeight>): void { this.weights = new Map(weights); }

  /** Get all weights as a plain object (for gateway push). */
  getAllWeights(): Record<string, LearnedWeight> {
    const out: Record<string, LearnedWeight> = {};
    for (const [k, v] of this.weights) out[k] = v;
    return out;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /** Lazy one-time fetch of remote weights. No-op if globalLearning is false. */
  private async loadRemoteWeights(): Promise<void> {
    if (!this.config.globalLearning || !this.config.gatewayUrl || this.weightsLoaded) return;
    this.weightsLoaded = true;
    const merged = await fetchRemoteWeights(this.config, this.getAllWeights());
    if (merged) this.weights = new Map(Object.entries(merged));
  }

  private computeScore(latencyMs: number, tokensOut: number, qualityScore?: number): number {
    const latencyScore = 1 - Math.min(latencyMs / 5000, 1);
    const efficiencyScore = Math.min(tokensOut / 1000, 1);
    if (qualityScore !== undefined) {
      return latencyScore * 0.4 + efficiencyScore * 0.3 + qualityScore * 0.3;
    }
    return latencyScore * 0.5 + efficiencyScore * 0.5;
  }

  private classifyComplexity(prompt: string): TaskComplexity {
    const tokens = Math.ceil(prompt.length / 4);
    const hasCode = /```[\s\S]+```/.test(prompt) || /function\s|class\s|const\s/.test(prompt);
    const hasMultiStep = /\b(then|after that|next|finally|step \d)\b/i.test(prompt);
    if (tokens > 2000 || (hasCode && hasMultiStep)) return 'complex';
    if (tokens > 500 || hasCode || hasMultiStep) return 'medium';
    return 'simple';
  }

  private rankCandidates(complexity: TaskComplexity): (ModelProfile & { score: number })[] {
    const costWeight    = complexity === 'simple' ? 0.6 : complexity === 'medium' ? 0.3 : 0.1;
    const qualityWeight = complexity === 'simple' ? 0.2 : complexity === 'medium' ? 0.5 : 0.7;
    const speedWeight   = 1 - costWeight - qualityWeight;
    return this.models.map((m) => {
      const costScore    = 1 - Math.min(m.costPer1kTokens / 15, 1);
      const qualityScore = m.qualityScore;
      const speedScore   = 1 - Math.min(m.avgLatencyMs / 3000, 1);
      return { ...m, score: costWeight * costScore + qualityWeight * qualityScore + speedWeight * speedScore };
    });
  }
}
