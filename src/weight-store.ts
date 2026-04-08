/**
 * WeightStore — persists router weights to a local JSON file.
 *
 * Enables cross-session learning by saving/loading weights
 * from .clawpipe/weights.json in the current working directory.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface StoredWeight {
  totalCalls: number;
  avgLatencyMs: number;
  avgTokensOut: number;
  score: number;
}

const DIR_NAME = '.clawpipe';
const FILE_NAME = 'weights.json';

export class WeightStore {
  private filePath: string;

  constructor(basePath?: string) {
    const dir = join(basePath ?? process.cwd(), DIR_NAME);
    this.filePath = join(dir, FILE_NAME);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  /** Save weights to disk. */
  save(weights: Map<string, StoredWeight>): void {
    const data: Record<string, StoredWeight> = {};
    for (const [key, value] of weights) {
      data[key] = value;
    }
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** Load weights from disk. Returns empty map if file missing. */
  load(): Map<string, StoredWeight> {
    if (!existsSync(this.filePath)) return new Map();
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, StoredWeight>;
      const map = new Map<string, StoredWeight>();
      for (const [key, value] of Object.entries(data)) {
        if (isValidWeight(value)) map.set(key, value);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  /** Get the file path for testing. */
  getPath(): string {
    return this.filePath;
  }
}

function isValidWeight(w: unknown): w is StoredWeight {
  if (!w || typeof w !== 'object') return false;
  const obj = w as Record<string, unknown>;
  return (
    typeof obj.totalCalls === 'number' &&
    typeof obj.avgLatencyMs === 'number' &&
    typeof obj.avgTokensOut === 'number' &&
    typeof obj.score === 'number'
  );
}
