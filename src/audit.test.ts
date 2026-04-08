import { describe, it, expect, vi } from 'vitest';
import { AuditLogger } from './audit';

describe('AuditLogger', () => {
  const baseEntry = {
    action: 'prompt', provider: 'openai', model: 'gpt-4o',
    tokensIn: 100, tokensOut: 50, latencyMs: 500, estimatedCostUsd: 0.02,
    cached: false, boosted: false, promptHash: 'ph_abc',
  };

  it('does not log when disabled', () => {
    const transport = vi.fn();
    const a = new AuditLogger({ projectId: 'test', enabled: false, transport });
    a.log(baseEntry);
    expect(transport).not.toHaveBeenCalled();
    expect(a.getLogs().length).toBe(0);
  });

  it('logs when enabled', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = new AuditLogger({ projectId: 'test', enabled: true });
    a.log(baseEntry);
    expect(a.getLogs().length).toBe(1);
    expect(a.getLogs()[0].projectId).toBe('test');
    expect(a.getLogs()[0].timestamp).toBeTruthy();
    consoleSpy.mockRestore();
  });

  it('uses custom transport', () => {
    const transport = vi.fn();
    const a = new AuditLogger({ projectId: 'test', enabled: true, transport });
    a.log(baseEntry);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0].provider).toBe('openai');
  });

  it('logs to console AND transport when alsoLogToConsole is true', () => {
    const transport = vi.fn();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = new AuditLogger({ projectId: 'test', enabled: true, transport, alsoLogToConsole: true });
    a.log(baseEntry);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('filters logs by provider', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = new AuditLogger({ projectId: 'test', enabled: true });
    a.log(baseEntry);
    a.log({ ...baseEntry, provider: 'anthropic' });
    expect(a.getLogsByProvider('openai').length).toBe(1);
    expect(a.getLogsByProvider('anthropic').length).toBe(1);
    consoleSpy.mockRestore();
  });

  it('exports as JSON', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = new AuditLogger({ projectId: 'test', enabled: true });
    a.log(baseEntry);
    const json = a.exportJson();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    consoleSpy.mockRestore();
  });

  it('exports as NDJSON', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = new AuditLogger({ projectId: 'test', enabled: true });
    a.log(baseEntry);
    a.log(baseEntry);
    const ndjson = a.exportNdjson();
    const lines = ndjson.split('\n');
    expect(lines.length).toBe(2);
    consoleSpy.mockRestore();
  });

  it('hashes prompts deterministically', () => {
    const h1 = AuditLogger.hashPrompt('test prompt');
    const h2 = AuditLogger.hashPrompt('test prompt');
    const h3 = AuditLogger.hashPrompt('different prompt');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1.startsWith('ph_')).toBe(true);
  });

  it('clears all logs', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = new AuditLogger({ projectId: 'test', enabled: true });
    a.log(baseEntry);
    a.clear();
    expect(a.getLogs().length).toBe(0);
    consoleSpy.mockRestore();
  });

  it('can enable/disable at runtime', () => {
    const transport = vi.fn();
    const a = new AuditLogger({ projectId: 'test', enabled: false, transport });
    a.log(baseEntry);
    expect(transport).not.toHaveBeenCalled();
    a.setEnabled(true);
    a.log(baseEntry);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('can set transport at runtime', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = new AuditLogger({ projectId: 'test', enabled: true });
    const newTransport = vi.fn();
    a.setTransport(newTransport);
    a.log(baseEntry);
    expect(newTransport).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('returns copy of logs', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = new AuditLogger({ projectId: 'test', enabled: true });
    a.log(baseEntry);
    const logs = a.getLogs();
    logs.length = 0;
    expect(a.getLogs().length).toBe(1);
    consoleSpy.mockRestore();
  });
});
