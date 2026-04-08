/**
 * Allowlist — model/provider access control.
 *
 * Enforces which providers and models can be used for routing.
 * Supports both allowlist (whitelist) and denylist (blacklist).
 * For Elena (enterprise compliance) and Priya (standardization).
 */

import type { AllowlistEntry } from './types';

export interface AllowlistConfig {
  /** Only these provider:model combos are permitted. Empty = allow all. */
  allow: AllowlistEntry[];
  /** These provider:model combos are blocked. */
  deny: AllowlistEntry[];
}

export class Allowlist {
  private allow: AllowlistEntry[];
  private deny: AllowlistEntry[];

  constructor(config: Partial<AllowlistConfig> = {}) {
    this.allow = config.allow ?? [];
    this.deny = config.deny ?? [];
  }

  /** Check if a provider:model combo is permitted. */
  isPermitted(provider: string, model: string): boolean {
    // Check denylist first — deny always wins
    if (this.isDenied(provider, model)) return false;

    // If allowlist is empty, everything not denied is allowed
    if (this.allow.length === 0) return true;

    // Check allowlist
    return this.isAllowed(provider, model);
  }

  /** Filter a list of candidates to only permitted ones. */
  filterPermitted<T extends { provider: string; model: string }>(candidates: T[]): T[] {
    return candidates.filter((c) => this.isPermitted(c.provider, c.model));
  }

  /** Add to allowlist at runtime. */
  addAllow(entry: AllowlistEntry): void {
    this.allow.push(entry);
  }

  /** Add to denylist at runtime. */
  addDeny(entry: AllowlistEntry): void {
    this.deny.push(entry);
  }

  /** Remove from allowlist. */
  removeAllow(provider: string, model?: string): void {
    this.allow = this.allow.filter(
      (e) => !(e.provider === provider && (model === undefined || e.model === model)),
    );
  }

  /** Remove from denylist. */
  removeDeny(provider: string, model?: string): void {
    this.deny = this.deny.filter(
      (e) => !(e.provider === provider && (model === undefined || e.model === model)),
    );
  }

  /** Get current allowlist config. */
  getConfig(): AllowlistConfig {
    return {
      allow: [...this.allow],
      deny: [...this.deny],
    };
  }

  private isAllowed(provider: string, model: string): boolean {
    return this.allow.some((entry) => this.matches(entry, provider, model));
  }

  private isDenied(provider: string, model: string): boolean {
    return this.deny.some((entry) => this.matches(entry, provider, model));
  }

  /** Match entry against provider:model. Model is optional in entry (matches all). */
  private matches(entry: AllowlistEntry, provider: string, model: string): boolean {
    if (entry.provider !== provider) return false;
    if (entry.model === undefined) return true; // provider-level match
    return entry.model === model;
  }
}
