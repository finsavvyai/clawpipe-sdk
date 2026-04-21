/** Gateway prompt client — fetch and render versioned prompt templates. */

export interface PromptClientConfig {
  gatewayUrl: string;
  apiKey: string;
}

interface CacheEntry { rendered: string; expiresAt: number }

export class PromptClient {
  private cache = new Map<string, CacheEntry>();
  private config: PromptClientConfig;

  constructor(config: PromptClientConfig) {
    this.config = config;
  }

  /**
   * Fetch prompt `name` from the gateway, render `variables` into it, and return the result.
   * Cached in memory for `ttl` seconds (default 300).
   */
  async promptVersion(
    name: string,
    variables: Record<string, string> = {},
    options: { version?: number; ttl?: number } = {},
  ): Promise<string> {
    const ttl = options.ttl ?? 300;
    const cacheKey = `${name}:${options.version ?? 'latest'}:${JSON.stringify(variables)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.rendered;

    const headers = { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' };

    const listRes = await fetch(`${this.config.gatewayUrl}/v1/prompts`, { headers });
    if (!listRes.ok) throw new Error(`ClawPipe: failed to list prompts (${listRes.status})`);
    const listData = await listRes.json() as { prompts?: Array<{ id: string; name: string }> };
    const prompts = listData.prompts ?? (listData as unknown as Array<{ id: string; name: string }>);
    const found = (Array.isArray(prompts) ? prompts : []).find(p => p.name === name);
    if (!found) throw new Error(`ClawPipe: prompt "${name}" not found`);

    const renderRes = await fetch(`${this.config.gatewayUrl}/v1/prompts/${found.id}/render`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ version: options.version, variables }),
    });
    if (!renderRes.ok) throw new Error(`ClawPipe: render failed (${renderRes.status})`);
    const renderData = await renderRes.json() as { prompt?: string; rendered?: string };
    const rendered = renderData.rendered ?? renderData.prompt ?? '';

    this.cache.set(cacheKey, { rendered, expiresAt: Date.now() + ttl * 1000 });
    return rendered;
  }

  clearCache(): void { this.cache.clear(); }
}
