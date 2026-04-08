/**
 * Audit Logger — structured compliance logging.
 *
 * Logs every LLM request with metadata. Redacts prompt content by default.
 * Pluggable transport: console (default), custom callback, or both.
 * For Elena (enterprise compliance, SOC 2, regulatory requirements).
 */

import type { AuditLogEntry, AuditTransport } from './types';

export interface AuditConfig {
  /** Enable audit logging. */
  enabled: boolean;
  /** Custom transport function. */
  transport: AuditTransport | null;
  /** Also log to console when custom transport is set. */
  alsoLogToConsole: boolean;
  /** Project ID for log entries. */
  projectId: string;
}

export class AuditLogger {
  private config: AuditConfig;
  private logs: AuditLogEntry[] = [];
  private maxLogs: number;

  constructor(config: Partial<AuditConfig> & { projectId: string }, maxLogs = 10_000) {
    this.config = {
      enabled: config.enabled ?? false,
      transport: config.transport ?? null,
      alsoLogToConsole: config.alsoLogToConsole ?? false,
      projectId: config.projectId,
    };
    this.maxLogs = maxLogs;
  }

  /** Log an LLM request. Prompt content is hashed, never stored. */
  log(entry: Omit<AuditLogEntry, 'timestamp' | 'projectId'>): void {
    if (!this.config.enabled) return;

    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      projectId: this.config.projectId,
    };

    this.store(fullEntry);
    this.emit(fullEntry);
  }

  /** Get all stored audit logs. */
  getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  /** Get logs filtered by time range. */
  getLogsSince(sinceIso: string): AuditLogEntry[] {
    return this.logs.filter((l) => l.timestamp >= sinceIso);
  }

  /** Get logs filtered by provider. */
  getLogsByProvider(provider: string): AuditLogEntry[] {
    return this.logs.filter((l) => l.provider === provider);
  }

  /** Export logs as JSON string (for SIEM ingestion). */
  exportJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /** Export logs as NDJSON (newline-delimited JSON, for streaming). */
  exportNdjson(): string {
    return this.logs.map((l) => JSON.stringify(l)).join('\n');
  }

  /** Hash a prompt for audit trail without storing content. */
  static hashPrompt(prompt: string): string {
    let hash = 5381;
    for (let i = 0; i < prompt.length; i++) {
      hash = ((hash << 5) + hash + prompt.charCodeAt(i)) & 0xffffffff;
    }
    return `ph_${(hash >>> 0).toString(36)}`;
  }

  /** Clear stored logs. */
  clear(): void {
    this.logs = [];
  }

  /** Update config at runtime. */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  setTransport(transport: AuditTransport): void {
    this.config.transport = transport;
  }

  private store(entry: AuditLogEntry): void {
    if (this.logs.length >= this.maxLogs) {
      this.logs = this.logs.slice(-Math.ceil(this.maxLogs * 0.5));
    }
    this.logs.push(entry);
  }

  private emit(entry: AuditLogEntry): void {
    if (this.config.transport) {
      this.config.transport(entry);
      if (this.config.alsoLogToConsole) {
        console.log('[clawpipe:audit]', JSON.stringify(entry));
      }
    } else {
      console.log('[clawpipe:audit]', JSON.stringify(entry));
    }
  }
}
