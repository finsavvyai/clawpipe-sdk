/** ClawPipe SDK — The intelligent AI pipeline. @module clawpipe */

import { Booster } from './booster';
import { Packer } from './packer';
import { Cache } from './cache';
import { Router } from './router';
import { Gateway } from './gateway';
import { Telemetry } from './telemetry';
import { Budget } from './budget';
import { RateLimiter } from './rate-limiter';
import { CircuitBreaker } from './circuit-breaker';
import { Allowlist } from './allowlist';
import { AuditLogger } from './audit';
import type { ClawPipeConfig, PromptOptions, PipelineMeta, PipelineResult, TelemetrySnapshot } from './types';

export type { ClawPipeConfig, PromptOptions, PipelineMeta, PipelineResult, TelemetrySnapshot };
export type { AllowlistEntry, AuditLogEntry, AuditTransport, GatewayResponse } from './types';
export type { BudgetStatus } from './budget';
export type { RateLimitStatus } from './rate-limiter';
export type { CircuitStatus } from './circuit-breaker';
export type { RouteDecision } from './router';
export type { PackResult } from './packer';

const DEFAULT_GATEWAY = 'https://api.clawpipe.ai/v1';

/** ClawPipe client — runs the full pipeline on every prompt. */
export class ClawPipe {
  private booster: Booster;
  private packer: Packer;
  private cache: Cache;
  private router: Router;
  private gateway: Gateway;
  private telemetry: Telemetry;
  private budget: Budget;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private allowlist: Allowlist;
  private audit: AuditLogger;
  private cfg: Required<Pick<ClawPipeConfig, 'enableBooster' | 'enablePacker' | 'enableCache'>>;

  constructor(config: ClawPipeConfig) {
    const gatewayUrl = config.gatewayUrl ?? DEFAULT_GATEWAY;
    this.cfg = {
      enableBooster: config.enableBooster ?? true,
      enablePacker: config.enablePacker ?? true,
      enableCache: config.enableCache ?? true,
    };
    this.booster = new Booster();
    this.packer = new Packer();
    this.cache = new Cache(config.cacheTtlMs ?? 300_000);
    this.router = new Router();
    this.gateway = new Gateway({ gatewayUrl, apiKey: config.apiKey, projectId: config.projectId });
    this.telemetry = new Telemetry();
    this.budget = new Budget({ capUsd: config.budgetCapUsd, warnUsd: config.budgetWarnUsd });
    this.rateLimiter = new RateLimiter({ maxRequests: config.rateLimitPerDay });
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerThreshold,
      recoveryMs: config.circuitBreakerRecoveryMs,
    });
    this.allowlist = new Allowlist({ allow: config.allowlist, deny: config.denylist });
    this.audit = new AuditLogger({
      projectId: config.projectId, enabled: config.enableAudit ?? false,
      transport: config.auditTransport ?? null,
    });
  }

  /** Send a prompt through the full pipeline. */
  async prompt(input: string, options: PromptOptions = {}): Promise<PipelineResult> {
    this.rateLimiter.check();
    this.budget.check();
    const start = Date.now();
    const meta = this.initMeta();

    // Stage 1: Booster
    if (this.cfg.enableBooster) {
      const boosted = this.booster.tryResolve(input);
      if (boosted !== null) {
        return this.finalize(boosted, { ...meta, boosted: true }, start, input, true);
      }
    }

    // Stage 2: Packer
    let packed = input;
    if (this.cfg.enablePacker) {
      const result = this.packer.pack(input, options.system);
      packed = result.packed;
      meta.packed = true;
      meta.contextSavings = result.savings;
    }

    // Stage 3: Cache
    if (this.cfg.enableCache) {
      const cached = this.cache.get(this.cache.key(packed, options));
      if (cached) {
        return this.finalize(cached, { ...meta, cached: true }, start, input, false);
      }
    }

    // Stage 4: Route (with allowlist filtering)
    const route = this.router.route(packed, options);
    if (!this.allowlist.isPermitted(route.provider, route.model)) {
      throw new Error(`Model ${route.provider}:${route.model} is not permitted by allowlist`);
    }

    // Stage 5: Circuit breaker check
    if (!this.circuitBreaker.isAvailable(route.provider)) {
      throw new Error(`Provider ${route.provider} circuit is open (too many failures)`);
    }
    meta.route = route.provider;
    meta.model = route.model;
    meta.circuitBreakerState = this.circuitBreaker.status(route.provider).state;

    // Stage 6: Call gateway
    try {
      const response = await this.gateway.call(packed, options, route);
      this.circuitBreaker.recordSuccess(route.provider);
      meta.tokensIn = response.tokensIn;
      meta.tokensOut = response.tokensOut;
      this.router.learn(route, response.latencyMs, response.tokensOut);
      if (this.cfg.enableCache) this.cache.set(this.cache.key(packed, options), response.text);
      return this.finalize(response.text, meta, start, input, false);
    } catch (err) {
      this.circuitBreaker.recordFailure(route.provider);
      throw err;
    }
  }

  /** Stream a prompt through the pipeline. */
  async *stream(input: string, options: PromptOptions = {}): AsyncGenerator<string> {
    this.rateLimiter.check();
    const packed = this.cfg.enablePacker ? this.packer.pack(input, options.system).packed : input;
    const route = this.router.route(packed, options);
    this.rateLimiter.record();
    yield* this.gateway.stream(packed, options, route);
  }

  /** Get telemetry snapshot. */
  stats(): TelemetrySnapshot { return this.telemetry.snapshot(); }

  /** Get budget status. */
  budgetStatus() { return this.budget.status(); }

  /** Get rate limit status. */
  rateLimitStatus() { return this.rateLimiter.status(); }

  /** Get circuit breaker statuses. */
  circuitStatus() { return this.circuitBreaker.allStatuses(); }

  /** Get audit logs. */
  auditLogs() { return this.audit.getLogs(); }

  private initMeta(): PipelineMeta {
    return {
      boosted: false, cached: false, packed: false, contextSavings: '0%',
      route: '', model: '', latencyMs: 0, tokensIn: 0, tokensOut: 0,
      estimatedCostUsd: 0, budgetRemainingUsd: null, rateLimitRemaining: null,
      circuitBreakerState: 'closed',
    };
  }

  private finalize(
    text: string, meta: PipelineMeta, start: number, input: string, isBoosted: boolean,
  ): PipelineResult {
    meta.latencyMs = Date.now() - start;
    const cost = this.telemetry.estimateCost(meta.route, meta.model, meta.tokensIn, meta.tokensOut);
    meta.estimatedCostUsd = isBoosted || meta.cached ? 0 : cost;
    this.telemetry.record({
      provider: meta.route, model: meta.model, tokensIn: meta.tokensIn,
      tokensOut: meta.tokensOut, latencyMs: meta.latencyMs, costUsd: meta.estimatedCostUsd,
      cached: meta.cached, boosted: meta.boosted,
    });
    if (!isBoosted && !meta.cached) this.budget.record(meta.estimatedCostUsd);
    this.rateLimiter.record();
    meta.budgetRemainingUsd = this.budget.status().remainingUsd;
    meta.rateLimitRemaining = this.rateLimiter.status().remaining;
    this.audit.log({
      action: 'prompt', provider: meta.route, model: meta.model,
      tokensIn: meta.tokensIn, tokensOut: meta.tokensOut, latencyMs: meta.latencyMs,
      estimatedCostUsd: meta.estimatedCostUsd, cached: meta.cached, boosted: meta.boosted,
      promptHash: AuditLogger.hashPrompt(input),
    });
    return { text, meta };
  }
}

export { Booster } from './booster';
export { Packer } from './packer';
export { Cache } from './cache';
export { Router } from './router';
export { Gateway, GatewayError } from './gateway';
export { Telemetry } from './telemetry';
export { Budget, BudgetExceededError } from './budget';
export { RateLimiter, RateLimitError } from './rate-limiter';
export { CircuitBreaker } from './circuit-breaker';
export { Allowlist } from './allowlist';
export { AuditLogger } from './audit';
