import { describe, it, expect, afterEach } from 'vitest';
import { WeightStore, StoredWeight } from './weight-store';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

function makeTempStore(): WeightStore {
  const dir = mkdtempSync(join(tmpdir(), 'clawpipe-test-'));
  return new WeightStore(dir);
}

describe('WeightStore', () => {
  const stores: WeightStore[] = [];

  afterEach(() => {
    for (const s of stores) {
      const dir = join(s.getPath(), '..');
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    }
    stores.length = 0;
  });

  it('saves and loads weights', () => {
    const store = makeTempStore();
    stores.push(store);

    const weights = new Map<string, StoredWeight>();
    weights.set('openai:gpt-4o', { totalCalls: 10, avgLatencyMs: 500, avgTokensOut: 200, score: 0.8 });
    weights.set('anthropic:claude-3-haiku', { totalCalls: 5, avgLatencyMs: 300, avgTokensOut: 150, score: 0.9 });

    store.save(weights);
    const loaded = store.load();

    expect(loaded.size).toBe(2);
    expect(loaded.get('openai:gpt-4o')?.totalCalls).toBe(10);
    expect(loaded.get('anthropic:claude-3-haiku')?.score).toBe(0.9);
  });

  it('returns empty map when file does not exist', () => {
    const store = makeTempStore();
    stores.push(store);
    const loaded = store.load();
    expect(loaded.size).toBe(0);
  });

  it('handles corrupted file gracefully', () => {
    const store = makeTempStore();
    stores.push(store);

    const { writeFileSync } = require('node:fs');
    writeFileSync(store.getPath(), 'not json!!!', 'utf-8');

    const loaded = store.load();
    expect(loaded.size).toBe(0);
  });

  it('skips invalid weight entries', () => {
    const store = makeTempStore();
    stores.push(store);

    const { writeFileSync } = require('node:fs');
    writeFileSync(store.getPath(), JSON.stringify({
      'valid:model': { totalCalls: 1, avgLatencyMs: 100, avgTokensOut: 50, score: 0.5 },
      'invalid:model': { totalCalls: 'nope' },
    }), 'utf-8');

    const loaded = store.load();
    expect(loaded.size).toBe(1);
    expect(loaded.has('valid:model')).toBe(true);
  });
});
