#!/usr/bin/env node
/**
 * ClawPipe CLI — quick prompts, stats, and pipeline management.
 *
 * Usage:
 *   clawpipe prompt "What is 2+2?"
 *   clawpipe stats
 *   clawpipe test
 *   clawpipe config
 */

import { ClawPipe } from './index';
import { analyzeCommand } from './cli-analyze';

const HELP = `
ClawPipe CLI — The intelligent AI pipeline.

Usage:
  clawpipe prompt <text>     Send a prompt through the pipeline
  clawpipe analyze [path]    Scan a codebase and estimate savings
  clawpipe test              Test pipeline connectivity
  clawpipe stats             Show telemetry stats
  clawpipe config            Show current configuration
  clawpipe version           Show version
  clawpipe help              Show this help

Options:
  --provider <name>          Force a specific provider
  --model <name>             Force a specific model
  --no-cache                 Disable cache for this request
  --no-booster               Disable booster for this request
  --system <text>            Set system prompt
  --trace                    Show pipeline stage timing breakdown
  --output json              (analyze) Emit machine-readable JSON
  --limit <n>                (analyze) Number of top files to show

Environment:
  CLAWPIPE_API_KEY           API key (required for gateway calls)
  CLAWPIPE_PROJECT_ID        Project ID (default: "cli")
  CLAWPIPE_GATEWAY_URL       Custom gateway URL
`.trim();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help') {
    console.log(HELP);
    return;
  }

  if (command === 'version' || command === '--version') {
    console.log('clawpipe-ai v3.0.0');
    return;
  }

  if (command === 'analyze') {
    analyzeCommand(args);
    return;
  }

  const pipe = createClient(args);

  if (command === 'test') {
    await runTest(pipe);
  } else if (command === 'prompt') {
    await runPrompt(pipe, args);
  } else if (command === 'stats') {
    showStats(pipe);
  } else if (command === 'export') {
    exportStats(pipe);
  } else if (command === 'config') {
    showConfig();
  } else {
    console.error(`Unknown command: ${command}. Run "clawpipe help" for usage.`);
    process.exit(1);
  }
}

function createClient(args: string[]): ClawPipe {
  return new ClawPipe({
    apiKey: process.env.CLAWPIPE_API_KEY ?? 'cp_cli_local',
    projectId: process.env.CLAWPIPE_PROJECT_ID ?? 'cli',
    gatewayUrl: process.env.CLAWPIPE_GATEWAY_URL,
    enableCache: !args.includes('--no-cache'),
    enableBooster: !args.includes('--no-booster'),
    enableTrace: args.includes('--trace'),
  });
}

async function runTest(pipe: ClawPipe): Promise<void> {
  console.log('Testing pipeline stages...\n');

  const tests = [
    { name: 'Booster (math)', input: 'Calculate 42 * 2', expect: 'boosted' },
    { name: 'Booster (date)', input: "What's the current date", expect: 'boosted' },
    { name: 'Booster (uuid)', input: 'Generate a UUID', expect: 'boosted' },
    { name: 'Packer', input: 'Hello\n\n\n\nworld', expect: 'packed' },
    { name: 'Cache (miss)', input: 'Test cache ' + Date.now(), expect: 'miss' },
  ];

  for (const t of tests) {
    const result = await pipe.prompt(t.input);
    const status = result.meta.boosted ? 'boosted' : result.meta.cached ? 'cached' : 'gateway';
    const icon = status === t.expect || (t.expect === 'miss' && status === 'gateway') ? 'ok' : '!!';
    console.log(`  [${icon}] ${t.name}: ${status} (${result.meta.latencyMs}ms)`);
  }

  console.log('\nPipeline test complete.');
}

async function runPrompt(pipe: ClawPipe, args: string[]): Promise<void> {
  const textParts: string[] = [];
  let system: string | undefined;
  let provider: string | undefined;
  let model: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--system' && args[i + 1]) { system = args[++i]; continue; }
    if (args[i] === '--provider' && args[i + 1]) { provider = args[++i]; continue; }
    if (args[i] === '--model' && args[i + 1]) { model = args[++i]; continue; }
    if (args[i].startsWith('--')) continue;
    textParts.push(args[i]);
  }

  const text = textParts.join(' ').trim();
  if (!text) {
    console.error('Error: prompt cannot be empty.\nUsage: clawpipe prompt "your prompt here"');
    process.exit(1);
  }

  const result = await pipe.prompt(text, { system, provider, model });
  console.log(result.text);
  console.error(`\n--- meta: ${result.meta.route}/${result.meta.model} | ` +
    `${result.meta.latencyMs}ms | savings: ${result.meta.contextSavings} | ` +
    `cached: ${result.meta.cached} | boosted: ${result.meta.boosted}`);
  if (result.trace) console.error(`\n--- trace:\n${result.trace}`);
}

function showStats(pipe: ClawPipe): void {
  const stats = pipe.stats();
  console.log('ClawPipe Telemetry:\n');
  console.log(`  Requests:     ${stats.totalRequests}`);
  console.log(`  Tokens in:    ${stats.totalTokensIn}`);
  console.log(`  Tokens out:   ${stats.totalTokensOut}`);
  console.log(`  Total cost:   $${stats.totalCostUsd}`);
  console.log(`  Cache hits:   ${stats.totalSavedByCache}`);
  console.log(`  Booster hits: ${stats.totalSavedByBooster}`);
  console.log(`  Avg latency:  ${stats.avgLatencyMs}ms`);
  console.log(`  Cache rate:   ${stats.cacheHitRate}`);
}

function exportStats(pipe: ClawPipe): void {
  console.log(JSON.stringify(pipe.stats(), null, 2));
}

function showConfig(): void {
  console.log('ClawPipe Configuration:\n');
  console.log(`  API Key:      ${process.env.CLAWPIPE_API_KEY ? '***' + (process.env.CLAWPIPE_API_KEY).slice(-4) : '(not set)'}`);
  console.log(`  Project ID:   ${process.env.CLAWPIPE_PROJECT_ID ?? 'cli'}`);
  console.log(`  Gateway URL:  ${process.env.CLAWPIPE_GATEWAY_URL ?? 'https://api.clawpipe.ai/v1'}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
