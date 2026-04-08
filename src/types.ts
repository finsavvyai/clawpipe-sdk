/**
 * Shared types for the ClawPipe SDK.
 */

export interface ClawPipeConfig {
  apiKey: string;
  projectId: string;
  gatewayUrl?: string;
  cacheTtlMs?: number;
  enableBooster?: boolean;
  enablePacker?: boolean;
  enableCache?: boolean;
  /** Enable pipeline stage tracing. Default: false. */
  enableTrace?: boolean;
  /** URL of a local LLM server (e.g. llamafile). Auto-detected if omitted. */
  localModelUrl?: string;
  /** Enable local model auto-detection on init. Default: false. */
  enableLocalFallback?: boolean;
  /** Budget cap in USD. Requests are rejected when exceeded. */
  budgetCapUsd?: number;
  /** Soft budget warning threshold in USD. Emits warning but allows requests. */
  budgetWarnUsd?: number;
  /** Calls per day limit. Defaults by tier: Free=1000, Pro=100000, Team=1000000. */
  rateLimitPerDay?: number;
  /** Provider/model allowlist. Only these are permitted for routing. */
  allowlist?: AllowlistEntry[];
  /** Provider/model denylist. These are blocked from routing. */
  denylist?: AllowlistEntry[];
  /** Enable audit logging. Default: false. */
  enableAudit?: boolean;
  /** Custom audit log transport. Default: console. */
  auditTransport?: AuditTransport;
  /** Enable telemetry tracking. Default: true. */
  enableTelemetry?: boolean;
  /** Circuit breaker failure threshold before opening. Default: 5. */
  circuitBreakerThreshold?: number;
  /** Circuit breaker recovery time in ms. Default: 30000. */
  circuitBreakerRecoveryMs?: number;
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
  estimatedCostUsd: number;
  budgetRemainingUsd: number | null;
  rateLimitRemaining: number | null;
  circuitBreakerState: string;
}

export interface PipelineResult {
  text: string;
  meta: PipelineMeta;
  /** Pipeline stage trace (only when enableTrace is true). */
  trace?: string;
}

export interface AllowlistEntry {
  provider: string;
  model?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  projectId: string;
  action: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  estimatedCostUsd: number;
  cached: boolean;
  boosted: boolean;
  promptHash: string;
}

export type AuditTransport = (entry: AuditLogEntry) => void;

export interface GatewayResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

export interface TelemetrySnapshot {
  totalRequests: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  totalSavedByCache: number;
  totalSavedByBooster: number;
  avgLatencyMs: number;
  cacheHitRate: string;
  topModels: Array<{ model: string; calls: number; cost: number }>;
}
