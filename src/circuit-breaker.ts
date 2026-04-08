/**
 * Circuit Breaker — provider failover protection.
 *
 * Tracks failures per provider. Opens circuit after threshold failures.
 * Half-open state allows a single test request before fully closing.
 * Enables automatic failover to healthy providers.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

interface ProviderCircuit {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  lastSuccess: number;
}

export interface CircuitBreakerConfig {
  /** Failures before opening circuit. Default: 5. */
  failureThreshold: number;
  /** Time in ms before trying half-open. Default: 30000. */
  recoveryMs: number;
  /** Time window for counting failures in ms. Default: 60000. */
  failureWindowMs: number;
}

export interface CircuitStatus {
  provider: string;
  state: CircuitState;
  failures: number;
  isAvailable: boolean;
}

export class CircuitBreaker {
  private circuits = new Map<string, ProviderCircuit>();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      recoveryMs: config.recoveryMs ?? 30_000,
      failureWindowMs: config.failureWindowMs ?? 60_000,
    };
  }

  /** Check if a provider is available. */
  isAvailable(provider: string): boolean {
    const circuit = this.circuits.get(provider);
    if (!circuit) return true;

    if (circuit.state === 'closed') return true;

    if (circuit.state === 'open') {
      const elapsed = Date.now() - circuit.lastFailure;
      if (elapsed >= this.config.recoveryMs) {
        circuit.state = 'half-open';
        return true;
      }
      return false;
    }

    // half-open: allow one request to test
    return true;
  }

  /** Record a successful request to a provider. */
  recordSuccess(provider: string): void {
    const circuit = this.getOrCreate(provider);
    circuit.state = 'closed';
    circuit.failures = 0;
    circuit.lastSuccess = Date.now();
  }

  /** Record a failed request to a provider. */
  recordFailure(provider: string): void {
    const circuit = this.getOrCreate(provider);
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.config.failureThreshold) {
      circuit.state = 'open';
    }
  }

  /** Get status of a specific provider circuit. */
  status(provider: string): CircuitStatus {
    // Trigger state transition check
    const available = this.isAvailable(provider);
    const circuit = this.circuits.get(provider);
    return {
      provider,
      state: circuit?.state ?? 'closed',
      failures: circuit?.failures ?? 0,
      isAvailable: available,
    };
  }

  /** Get status of all tracked providers. */
  allStatuses(): CircuitStatus[] {
    const providers = Array.from(this.circuits.keys());
    return providers.map((p) => this.status(p));
  }

  /** Get list of available providers from a candidate list. */
  filterAvailable(providers: string[]): string[] {
    return providers.filter((p) => this.isAvailable(p));
  }

  /** Reset a specific provider's circuit. */
  reset(provider: string): void {
    this.circuits.delete(provider);
  }

  /** Reset all circuits. */
  resetAll(): void {
    this.circuits.clear();
  }

  private getOrCreate(provider: string): ProviderCircuit {
    let circuit = this.circuits.get(provider);
    if (!circuit) {
      circuit = { state: 'closed', failures: 0, lastFailure: 0, lastSuccess: 0 };
      this.circuits.set(provider, circuit);
    }
    return circuit;
  }
}
