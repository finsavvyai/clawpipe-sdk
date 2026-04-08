import { describe, it, expect } from 'vitest';
import { Tracer } from './tracer';

describe('Tracer', () => {
  it('records stage timing when enabled', () => {
    const t = new Tracer(true);
    t.start('Booster');
    t.end('Booster', { result: 'resolved' });
    const stages = t.getStages();
    expect(stages).toHaveLength(1);
    expect(stages[0].stage).toBe('Booster');
    expect(stages[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(stages[0].skipped).toBe(false);
  });

  it('records skipped stages', () => {
    const t = new Tracer(true);
    t.skip('Booster', 'disabled');
    const stages = t.getStages();
    expect(stages).toHaveLength(1);
    expect(stages[0].skipped).toBe(true);
    expect(stages[0].args?.reason).toBe('disabled');
  });

  it('does nothing when disabled', () => {
    const t = new Tracer(false);
    t.start('Booster');
    t.end('Booster');
    t.skip('Cache');
    expect(t.getStages()).toHaveLength(0);
  });

  it('formats human-readable output', () => {
    const t = new Tracer(true);
    t.start('Booster');
    t.end('Booster', { result: 'pass-through' });
    t.skip('Cache', 'disabled');
    const output = t.format();
    expect(output).toContain('Booster');
    expect(output).toContain('Cache');
    expect(output).toContain('skipped');
    expect(output).toContain('Total');
  });

  it('exports Perfetto JSON format', () => {
    const t = new Tracer(true);
    t.start('Router');
    t.end('Router', { model: 'gpt-4o' });
    const json = t.toPerfetto();
    const parsed = JSON.parse(json);
    expect(parsed.traceEvents).toHaveLength(1);
    expect(parsed.traceEvents[0].name).toBe('Router');
    expect(parsed.traceEvents[0].ph).toBe('X');
  });

  it('returns empty message when no data', () => {
    const t = new Tracer(true);
    expect(t.format()).toBe('(no trace data)');
  });
});
