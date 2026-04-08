/**
 * Budget — cost cap enforcement per project.
 *
 * Tracks running spend and enforces hard/soft limits.
 * Hard cap rejects requests. Soft cap emits warnings.
 */

export interface BudgetConfig {
  /** Hard cap in USD. Requests rejected when exceeded. */
  capUsd: number | null;
  /** Soft warning threshold in USD. */
  warnUsd: number | null;
  /** Budget window in ms. Default: 24 hours. */
  windowMs: number;
}

export interface BudgetStatus {
  spentUsd: number;
  capUsd: number | null;
  warnUsd: number | null;
  remainingUsd: number | null;
  isOverCap: boolean;
  isOverWarn: boolean;
  percentUsed: number | null;
}

export type BudgetWarningHandler = (status: BudgetStatus) => void;

interface SpendRecord {
  costUsd: number;
  timestamp: number;
}

const ONE_DAY_MS = 86_400_000;

export class Budget {
  private config: BudgetConfig;
  private records: SpendRecord[] = [];
  private warningHandler: BudgetWarningHandler | null = null;

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = {
      capUsd: config.capUsd ?? null,
      warnUsd: config.warnUsd ?? null,
      windowMs: config.windowMs ?? ONE_DAY_MS,
    };
  }

  /** Set a callback for budget warnings. */
  onWarning(handler: BudgetWarningHandler): void {
    this.warningHandler = handler;
  }

  /** Check if a request is allowed within budget. Throws if over hard cap. */
  check(): BudgetStatus {
    const status = this.status();
    if (status.isOverCap) {
      throw new BudgetExceededError(status);
    }
    if (status.isOverWarn && this.warningHandler) {
      this.warningHandler(status);
    }
    return status;
  }

  /** Record spend for a completed request. */
  record(costUsd: number): void {
    this.prune();
    this.records.push({ costUsd, timestamp: Date.now() });
  }

  /** Get current budget status. */
  status(): BudgetStatus {
    this.prune();
    const spentUsd = this.records.reduce((sum, r) => sum + r.costUsd, 0);
    const cap = this.config.capUsd;
    const warn = this.config.warnUsd;
    const remainingUsd = cap !== null ? Math.max(0, cap - spentUsd) : null;
    const percentUsed = cap !== null && cap > 0
      ? Math.round((spentUsd / cap) * 100)
      : null;

    return {
      spentUsd: Math.round(spentUsd * 10000) / 10000,
      capUsd: cap,
      warnUsd: warn,
      remainingUsd: remainingUsd !== null ? Math.round(remainingUsd * 10000) / 10000 : null,
      isOverCap: cap !== null && spentUsd >= cap,
      isOverWarn: warn !== null && spentUsd >= warn,
      percentUsed,
    };
  }

  /** Reset all spend records. */
  reset(): void {
    this.records = [];
  }

  /** Remove records outside the budget window. */
  private prune(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.records = this.records.filter((r) => r.timestamp >= cutoff);
  }
}

export class BudgetExceededError extends Error {
  public readonly status: BudgetStatus;

  constructor(status: BudgetStatus) {
    super(
      `Budget exceeded: spent $${status.spentUsd} of $${status.capUsd} cap. ` +
      `Reset in ${status.capUsd !== null ? 'next window' : 'N/A'}.`,
    );
    this.name = 'BudgetExceededError';
    this.status = status;
  }
}
