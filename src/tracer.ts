/**
 * Tracer — pipeline stage timing and Perfetto trace export.
 *
 * Instruments each pipeline stage with start/end markers.
 * Exports traces in Perfetto JSON format for visual analysis.
 */

export interface TraceEvent {
  name: string;
  ph: 'B' | 'E' | 'X';
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  args?: Record<string, unknown>;
}

export interface StageTrace {
  stage: string;
  startMs: number;
  durationMs: number;
  skipped: boolean;
  args?: Record<string, unknown>;
}

export class Tracer {
  private events: TraceEvent[] = [];
  private stages: StageTrace[] = [];
  private active = new Map<string, number>();
  private enabled: boolean;

  constructor(enabled = false) {
    this.enabled = enabled;
  }

  /** Mark the start of a pipeline stage. */
  start(stage: string): void {
    if (!this.enabled) return;
    this.active.set(stage, performance.now());
  }

  /** Mark the end of a stage, recording duration. */
  end(stage: string, args?: Record<string, unknown>): void {
    if (!this.enabled) return;
    const startTime = this.active.get(stage);
    if (startTime === undefined) return;
    const duration = performance.now() - startTime;
    this.active.delete(stage);

    const ts = Math.round(startTime * 1000);
    const dur = Math.round(duration * 1000);

    this.events.push({ name: stage, ph: 'X', ts, dur, pid: 1, tid: 1, args });
    this.stages.push({
      stage,
      startMs: Math.round(startTime * 100) / 100,
      durationMs: Math.round(duration * 100) / 100,
      skipped: false,
      args,
    });
  }

  /** Record a stage that was skipped. */
  skip(stage: string, reason?: string): void {
    if (!this.enabled) return;
    this.stages.push({
      stage,
      startMs: 0,
      durationMs: 0,
      skipped: true,
      args: reason ? { reason } : undefined,
    });
  }

  /** Get stage traces for CLI display. */
  getStages(): StageTrace[] {
    return [...this.stages];
  }

  /** Export as Perfetto JSON trace format. */
  toPerfetto(): string {
    return JSON.stringify({ traceEvents: this.events }, null, 2);
  }

  /** Format a human-readable stage breakdown. */
  format(): string {
    if (this.stages.length === 0) return '(no trace data)';
    const total = this.stages.reduce((s, t) => s + t.durationMs, 0);
    const lines = this.stages.map((t) => {
      if (t.skipped) {
        const reason = t.args?.reason ?? 'disabled';
        return `  ${t.stage.padEnd(12)} skipped (${reason})`;
      }
      const info = t.args ? ` (${formatArgs(t.args)})` : '';
      return `  ${t.stage.padEnd(12)} ${t.durationMs.toFixed(1)}ms${info}`;
    });
    lines.push(`  ${'Total'.padEnd(12)} ${total.toFixed(1)}ms`);
    return lines.join('\n');
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

function formatArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
}
