/**
 * `clawpipe analyze` — scan a codebase and estimate savings with ClawPipe.
 *
 * Usage:
 *   clawpipe analyze .
 *   clawpipe analyze /path --output json --limit 5
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Booster } from './booster';
import {
  walkDir, countCallSites, detectModels, extractStrings, countBoostable,
  estimateFileCost, FileReport, MODEL_PRICE_PER_M,
} from './cli-analyze-helpers';

export interface AnalyzeOptions {
  outputJson?: boolean;
  limit?: number;
}

export interface AnalyzeReport {
  root: string;
  filesScanned: number;
  filesWithCalls: number;
  totalCallSites: number;
  models: { name: string; calls: number }[];
  boostableCalls: number;
  monthlyCostUsd: number;
  savings: {
    booster: number;
    router: number;
    cache: number;
    packer: number;
    total: number;
    percent: number;
  };
  monthlyCostWithClawPipeUsd: number;
  topFiles: FileReport[];
}

export function runAnalyze(root: string, options: AnalyzeOptions = {}): AnalyzeReport {
  const absRoot = path.resolve(root);
  if (!fs.existsSync(absRoot)) throw new Error(`Path not found: ${absRoot}`);
  const files = walkDir(absRoot);
  const booster = new Booster();
  const fileReports: FileReport[] = [];
  const modelCounts = new Map<string, number>();
  let totalCallSites = 0;
  let totalBoostable = 0;

  for (const f of files) {
    let content = '';
    try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const callSites = countCallSites(content);
    if (callSites === 0) continue;
    const models = detectModels(content);
    const strings = extractStrings(content);
    const boostable = countBoostable(booster, strings);
    const estMonthlyCost = estimateFileCost(models, callSites);
    fileReports.push({
      file: path.relative(absRoot, f),
      callSites, models, boostable, estMonthlyCost,
    });
    totalCallSites += callSites;
    totalBoostable += boostable;
    for (const m of models) modelCounts.set(m, (modelCounts.get(m) ?? 0) + callSites);
  }

  const monthlyCostUsd = fileReports.reduce((a, f) => a + f.estMonthlyCost, 0);
  const savings = computeSavings(monthlyCostUsd, totalBoostable, totalCallSites, modelCounts);
  fileReports.sort((a, b) => b.estMonthlyCost - a.estMonthlyCost);

  return {
    root: absRoot,
    filesScanned: files.length,
    filesWithCalls: fileReports.length,
    totalCallSites,
    models: [...modelCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, calls]) => ({ name, calls })),
    boostableCalls: totalBoostable,
    monthlyCostUsd: round(monthlyCostUsd),
    savings,
    monthlyCostWithClawPipeUsd: round(monthlyCostUsd - savings.total),
    topFiles: fileReports.slice(0, options.limit ?? 10),
  };
}

function computeSavings(
  cost: number, boostable: number, calls: number, modelCounts: Map<string, number>,
): AnalyzeReport['savings'] {
  const boostRatio = calls > 0 ? boostable / calls : 0;
  const boosterSave = cost * boostRatio * 1.0;
  // Router: assume 40% of calls on premium models could drop to mini/haiku (85% cheaper).
  let premium = 0;
  for (const [m, n] of modelCounts) {
    if (/gpt-4o$|gpt-4-turbo|gpt-4$|claude-3-opus|claude-3-5-sonnet|claude-3-sonnet/.test(m)) {
      premium += n;
    }
  }
  const premiumRatio = calls > 0 ? premium / calls : 0;
  const routerSave = cost * premiumRatio * 0.85;
  const remainingAfter = Math.max(0, cost - boosterSave - routerSave);
  const cacheSave = remainingAfter * 0.3;   // 30% cache hit
  const packerSave = (remainingAfter - cacheSave) * 0.2;  // 20% token reduction
  const total = boosterSave + routerSave + cacheSave + packerSave;
  return {
    booster: round(boosterSave),
    router: round(routerSave),
    cache: round(cacheSave),
    packer: round(packerSave),
    total: round(total),
    percent: cost > 0 ? Math.round((total / cost) * 100) : 0,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatReport(r: AnalyzeReport): string {
  const lines: string[] = [];
  const c = (s: string, code: string) => `\x1b[${code}m${s}\x1b[0m`;
  lines.push(c('\nClawPipe Code Analysis', '1;36'));
  lines.push('======================\n');
  lines.push(`Scanning ${r.root} ...\n`);
  lines.push(`Files scanned:        ${r.filesScanned}`);
  lines.push(`Files with LLM calls: ${r.filesWithCalls}`);
  lines.push(`API call sites:       ${r.totalCallSites}\n`);
  if (r.models.length) {
    lines.push('Detected models:');
    for (const m of r.models) {
      const price = MODEL_PRICE_PER_M[m.name] ?? 2.0;
      lines.push(`  - ${m.name.padEnd(20)} (${m.calls} calls, $${price}/M tokens)`);
    }
    lines.push('');
  }
  lines.push(`Estimated monthly cost: ${c('$' + r.monthlyCostUsd.toFixed(0), '1;33')}`);
  lines.push('  (based on ~10K req/day spread across detected call sites)\n');
  lines.push('Optimization opportunities:');
  lines.push(`  - ${r.boostableCalls} boostable calls (math, JSON, dates) -> $${r.savings.booster.toFixed(0)}/mo saved`);
  lines.push(`  - Over-modeled calls (premium -> mini/haiku)     -> $${r.savings.router.toFixed(0)}/mo saved`);
  lines.push(`  - ~30% cache hit potential                       -> $${r.savings.cache.toFixed(0)}/mo saved`);
  lines.push(`  - 20% token reduction (Packer)                   -> $${r.savings.packer.toFixed(0)}/mo saved\n`);
  lines.push(`Estimated monthly savings: ${c('$' + r.savings.total.toFixed(0) + ' (' + r.savings.percent + '%)', '1;32')}`);
  lines.push(`Your monthly cost with ClawPipe: ${c('$' + r.monthlyCostWithClawPipeUsd.toFixed(0), '1;32')}\n`);
  if (r.topFiles.length) {
    lines.push('Top files to optimize:');
    r.topFiles.forEach((f, i) => {
      lines.push(`  ${i + 1}. ${f.file.padEnd(40)} - ${f.callSites} calls, $${f.estMonthlyCost.toFixed(0)}/mo`);
    });
    lines.push('');
  }
  lines.push(c('Ready to save? Run: npm install clawpipe-ai', '1;36'));
  return lines.join('\n');
}

export function analyzeCommand(args: string[]): void {
  const target = args.find((a, i) => i > 0 && !a.startsWith('--') && args[i - 1] !== '--output' && args[i - 1] !== '--limit') ?? '.';
  const outIdx = args.indexOf('--output');
  const outputJson = outIdx >= 0 && args[outIdx + 1] === 'json';
  const limIdx = args.indexOf('--limit');
  const limit = limIdx >= 0 ? parseInt(args[limIdx + 1] ?? '10', 10) : 10;
  const report = runAnalyze(target, { outputJson, limit });
  if (outputJson) console.log(JSON.stringify(report, null, 2));
  else console.log(formatReport(report));
}
