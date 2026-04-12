/**
 * Telemetry — per-request metrics tracking.
 *
 * Tracks cost, tokens, latency, cache hits, and booster hits.
 * Provides aggregate stats for reporting and debugging.
 */

import type { TelemetrySnapshot } from './types';

interface RequestRecord {
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  costUsd: number;
  cached: boolean;
  boosted: boolean;
  timestamp: number;
}

/** Cost per 1K tokens (input) for known models. */
const COST_TABLE: Record<string, number> = {
  'deepseek:deepseek-chat': 0.00014,
  'openai:gpt-4o-mini': 0.00015,
  'anthropic:claude-3-haiku': 0.00025,
  'openai:gpt-4o': 0.0025,
  'anthropic:claude-sonnet-4': 0.003,
  'anthropic:claude-opus-4': 0.015,
  'groq:llama-3.1-70b': 0.00059,
  'mistral:mistral-large': 0.002,
};

export class Telemetry {
  private records: RequestRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords = 10_000) {
    this.maxRecords = maxRecords;
  }

  /** Estimate cost in USD for a request. */
  estimateCost(provider: string, model: string, tokensIn: number, tokensOut: number): number {
    const key = `${provider}:${model}`;
    // Conservative high fallback: overestimates rather than underestimates cost for unknown models.
    const rate = COST_TABLE[key] ?? 0.015;
    return ((tokensIn + tokensOut) / 1000) * rate;
  }

  /** Record a completed request. */
  record(entry: Omit<RequestRecord, 'timestamp'>): void {
    if (this.records.length >= this.maxRecords) {
      this.records = this.records.slice(-Math.ceil(this.maxRecords * 0.5));
    }
    this.records.push({ ...entry, timestamp: Date.now() });
  }

  /** Get aggregate telemetry snapshot. */
  snapshot(): TelemetrySnapshot {
    const r = this.records;
    if (r.length === 0) {
      return {
        totalRequests: 0, totalTokensIn: 0, totalTokensOut: 0,
        totalCostUsd: 0, totalSavedByCache: 0, totalSavedByBooster: 0,
        avgLatencyMs: 0, cacheHitRate: '0.0%', topModels: [],
      };
    }

    let totalTokensIn = 0, totalTokensOut = 0, totalCostUsd = 0;
    let totalLatency = 0, cacheHits = 0, boosterHits = 0;
    const modelStats = new Map<string, { calls: number; cost: number }>();

    for (const rec of r) {
      totalTokensIn += rec.tokensIn;
      totalTokensOut += rec.tokensOut;
      totalCostUsd += rec.costUsd;
      totalLatency += rec.latencyMs;
      if (rec.cached) cacheHits++;
      if (rec.boosted) boosterHits++;

      const key = `${rec.provider}:${rec.model}`;
      const existing = modelStats.get(key) ?? { calls: 0, cost: 0 };
      existing.calls++;
      existing.cost += rec.costUsd;
      modelStats.set(key, existing);
    }

    const topModels = Array.from(modelStats.entries())
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5);

    const hitRate = r.length > 0 ? ((cacheHits / r.length) * 100).toFixed(1) : '0.0';

    return {
      totalRequests: r.length,
      totalTokensIn,
      totalTokensOut,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
      totalSavedByCache: cacheHits,
      totalSavedByBooster: boosterHits,
      avgLatencyMs: Math.round(totalLatency / r.length),
      cacheHitRate: `${hitRate}%`,
      topModels,
    };
  }

  /** Get records from the last N milliseconds. */
  recent(windowMs: number): RequestRecord[] {
    const cutoff = Date.now() - windowMs;
    return this.records.filter((r) => r.timestamp >= cutoff);
  }

  /** Total cost in the current window. */
  totalCostInWindow(windowMs: number): number {
    return this.recent(windowMs).reduce((sum, r) => sum + r.costUsd, 0);
  }

  /** Reset all telemetry data. */
  reset(): void {
    this.records = [];
  }
}
