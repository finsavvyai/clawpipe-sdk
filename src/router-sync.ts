/** Gateway sync helpers for Router — fetch/push weights + quality scores. */

import { mergeWeights } from './router';
import type { LearnedWeight } from './router';

export interface SyncConfig {
  gatewayUrl?: string;
  apiKey?: string;
  globalLearning?: boolean;
}

/** Fetch remote weights and merge with local. Returns merged map or the original on failure. */
export async function fetchRemoteWeights(
  config: SyncConfig,
  local: Record<string, LearnedWeight>,
): Promise<Record<string, LearnedWeight> | null> {
  if (!config.globalLearning || !config.gatewayUrl) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${config.gatewayUrl}/v1/weights`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json() as { weights?: Record<string, LearnedWeight> };
    return data.weights ? mergeWeights(local, data.weights) : null;
  } catch (e) {
    console.warn('ClawPipe: weight fetch failed', (e as Error).message);
    return null;
  }
}

/** Push weights to gateway. Fire-and-forget — never throws. */
export async function pushRemoteWeights(
  config: SyncConfig,
  weights: Record<string, LearnedWeight>,
): Promise<void> {
  if (!config.globalLearning || !config.gatewayUrl || !config.apiKey) return;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${config.gatewayUrl}/v1/weights`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) console.warn(`ClawPipe: weight sync failed ${res.status}`);
  } catch (e) {
    console.warn('ClawPipe: weight sync error', (e as Error).message);
  }
}

/** Push a quality score to gateway. Fire-and-forget — never throws. */
export function pushQualityScore(
  config: SyncConfig,
  payload: { request_id: string; model: string; provider: string; score: number },
): void {
  if (!config.globalLearning || !config.gatewayUrl || !config.apiKey) return;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  fetch(`${config.gatewayUrl}/v1/quality`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).then(() => clearTimeout(t)).catch(() => clearTimeout(t));
}
