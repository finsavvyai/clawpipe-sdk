/**
 * Helpers for `clawpipe analyze` — walking, parsing, cost math.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Booster } from './booster';

export const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'target', '.next', '.nuxt',
  'coverage', '.venv', 'venv', '__pycache__', '.cache',
]);

export const SCAN_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java',
]);

export const CALL_PATTERNS: { name: string; rx: RegExp }[] = [
  { name: 'openai.chat.completions', rx: /openai\.chat\.completions\.create\s*\(/g },
  { name: 'openai.completions', rx: /openai\.completions\.create\s*\(/g },
  { name: 'anthropic.messages', rx: /anthropic\.messages\.create\s*\(/g },
  { name: 'new OpenAI', rx: /new\s+OpenAI\s*\(/g },
  { name: 'new Anthropic', rx: /new\s+Anthropic\s*\(/g },
  { name: 'py openai import', rx: /from\s+openai\s+import/g },
  { name: 'py anthropic import', rx: /from\s+anthropic\s+import/g },
  { name: 'langchain invoke', rx: /\.invoke\s*\(/g },
  { name: 'complete', rx: /\.complete\s*\(/g },
  { name: 'chat', rx: /\.chat\s*\(/g },
];

// Model price per 1M input tokens (approx, USD). Used for estimates.
export const MODEL_PRICE_PER_M: Record<string, number> = {
  'gpt-4o': 5.0,
  'gpt-4o-mini': 0.15,
  'gpt-4-turbo': 10.0,
  'gpt-4': 30.0,
  'gpt-3.5-turbo': 0.5,
  'claude-3-opus': 15.0,
  'claude-3-sonnet': 3.0,
  'claude-3-haiku': 0.25,
  'claude-3-5-sonnet': 3.0,
  'claude-3-5-haiku': 0.8,
  'deepseek-chat': 0.14,
};

const MODEL_RX = /\b(gpt-4o-mini|gpt-4o|gpt-4-turbo|gpt-4|gpt-3\.5-turbo|claude-3-5-sonnet|claude-3-5-haiku|claude-3-opus|claude-3-sonnet|claude-3-haiku|deepseek-chat)\b/gi;

// Extract string literals (single, double, backtick, triple-quoted python).
const STRING_RX = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`|"""([\s\S]*?)"""/g;

export interface FileReport {
  file: string;
  callSites: number;
  models: string[];
  boostable: number;
  estMonthlyCost: number;
}

export function walkDir(root: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      walkDir(full, out);
    } else if (e.isFile() && SCAN_EXTS.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

export function countCallSites(content: string): number {
  let n = 0;
  for (const p of CALL_PATTERNS) {
    const matches = content.match(p.rx);
    if (matches) n += matches.length;
  }
  return n;
}

export function detectModels(content: string): string[] {
  const found = new Set<string>();
  const matches = content.match(MODEL_RX);
  if (matches) for (const m of matches) found.add(m.toLowerCase());
  return [...found];
}

export function extractStrings(content: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  STRING_RX.lastIndex = 0;
  while ((m = STRING_RX.exec(content)) !== null) {
    const s = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (s && s.length > 3 && s.length < 2000) out.push(s);
  }
  return out;
}

export function countBoostable(booster: Booster, strings: string[]): number {
  let n = 0;
  for (const s of strings) if (booster.tryResolve(s) !== null) n++;
  return n;
}

export function estimateFileCost(
  models: string[],
  callSites: number,
  reqPerDayPerSite = 333,  // 10K/day across ~30 avg sites
  avgTokensPerCall = 800,
): number {
  if (callSites === 0) return 0;
  const avgPrice = models.length
    ? models.reduce((a, m) => a + (MODEL_PRICE_PER_M[m] ?? 2.0), 0) / models.length
    : 2.0;
  // cost per call = avgTokens / 1M * price
  const perCall = (avgTokensPerCall / 1_000_000) * avgPrice;
  return perCall * callSites * reqPerDayPerSite * 30;
}
