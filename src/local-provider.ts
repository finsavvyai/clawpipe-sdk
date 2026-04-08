/**
 * LocalProvider — auto-detect and route to local LLM servers.
 *
 * Checks for llamafile, Ollama, or LM Studio at common ports.
 * Local models get cost=0 routing, making them ideal for
 * development, offline use, and budget-constrained scenarios.
 */

interface LocalModel {
  provider: string;
  model: string;
  url: string;
}

interface DetectedServer {
  name: string;
  url: string;
  models: string[];
}

const KNOWN_ENDPOINTS = [
  { name: 'llamafile', url: 'http://localhost:8080' },
  { name: 'ollama', url: 'http://localhost:11434' },
  { name: 'lmstudio', url: 'http://localhost:1234' },
];

export class LocalProvider {
  private detected: DetectedServer[] = [];
  private models: LocalModel[] = [];

  /** Probe known local endpoints for running LLM servers. */
  async detect(timeoutMs = 2000): Promise<LocalModel[]> {
    this.detected = [];
    this.models = [];

    const probes = KNOWN_ENDPOINTS.map((ep) => this.probe(ep, timeoutMs));
    await Promise.allSettled(probes);

    return this.models;
  }

  /** Get detected servers. */
  getDetected(): DetectedServer[] {
    return [...this.detected];
  }

  /** Get all detected local models. */
  getModels(): LocalModel[] {
    return [...this.models];
  }

  /** Check if a local model URL is available. */
  getModelUrl(provider: string, model: string): string | null {
    const found = this.models.find(
      (m) => m.provider === provider && m.model === model,
    );
    return found?.url ?? null;
  }

  private async probe(
    endpoint: { name: string; url: string },
    timeoutMs: number,
  ): Promise<void> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const modelsUrl = endpoint.name === 'ollama'
        ? `${endpoint.url}/api/tags`
        : `${endpoint.url}/v1/models`;

      const res = await fetch(modelsUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) return;

      const data = await res.json() as Record<string, unknown>;
      const models = this.parseModels(endpoint.name, endpoint.url, data);

      if (models.length > 0) {
        this.detected.push({ name: endpoint.name, url: endpoint.url, models: models.map((m) => m.model) });
        this.models.push(...models);
      }
    } catch {
      // Server not running — skip silently
    }
  }

  private parseModels(
    serverName: string,
    baseUrl: string,
    data: Record<string, unknown>,
  ): LocalModel[] {
    const results: LocalModel[] = [];

    if (serverName === 'ollama' && Array.isArray((data as { models?: unknown[] }).models)) {
      const models = (data as { models: Array<{ name: string }> }).models;
      for (const m of models) {
        results.push({ provider: 'local-ollama', model: m.name, url: baseUrl });
      }
    } else if (Array.isArray((data as { data?: unknown[] }).data)) {
      const models = (data as { data: Array<{ id: string }> }).data;
      for (const m of models) {
        results.push({ provider: `local-${serverName}`, model: m.id, url: baseUrl });
      }
    }

    return results;
  }
}
