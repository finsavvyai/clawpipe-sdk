/** One-line config presets: Quality Mode and Cheap Mode.
 *
 * Quality Mode — swarm-vote + strict guard. Optimizes for correctness.
 * Cheap Mode   — aggressive cache + long packer + strict allowlist to cheap
 *                providers. Optimizes for cost.
 */
import type { ClawPipeConfig } from './types';

type Preset = Partial<ClawPipeConfig>;

export const QualityMode: Preset = {
  enableBooster: true,
  enablePacker: true,
  enableCache: false,
  enableGuard: true,
  guardBlockOnInjection: true,
  enableAudit: true,
};

export const CheapMode: Preset = {
  enableBooster: true,
  enablePacker: true,
  enableCache: true,
  cacheTtlMs: 24 * 60 * 60 * 1000,
  enableGuard: true,
  guardBlockOnInjection: false,
  allowlist: [
    { provider: 'deepseek' },
    { provider: 'groq' },
    { provider: 'mistral', model: 'mistral-small-latest' },
    { provider: 'anthropic', model: 'claude-haiku-4-5' },
    { provider: 'openai', model: 'gpt-4o-mini' },
  ],
};

export const BalancedMode: Preset = {
  enableBooster: true,
  enablePacker: true,
  enableCache: true,
  cacheTtlMs: 60 * 60 * 1000,
  enableGuard: true,
};

export function withPreset(
  base: ClawPipeConfig,
  preset: Preset,
): ClawPipeConfig {
  return { ...base, ...preset };
}
