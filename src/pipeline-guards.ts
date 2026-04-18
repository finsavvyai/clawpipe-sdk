/** Pipeline-level guard registry integration for ClawPipe.prompt(). */
import { createDefaultGuards, type GuardRegistry, type GuardRule } from './guards';

export class PipelineGuards {
  private registry: GuardRegistry;

  constructor(registry?: GuardRegistry) {
    this.registry = registry ?? createDefaultGuards();
  }

  async runPre(
    prompt: string,
    rules: GuardRule[],
    ctx: { system?: string; model?: string; provider?: string },
  ): Promise<{ prompt: string; blocked: boolean; reason?: string }> {
    if (!rules.length) return { prompt, blocked: false };
    const res = await this.registry.runPre({ prompt, ...ctx }, rules);
    if (!res.allPass) {
      const hit = res.outcomes.find((o) => o.blocked);
      return { prompt: res.safePrompt ?? prompt, blocked: true, reason: hit?.reason ?? 'blocked' };
    }
    return { prompt: res.safePrompt ?? prompt, blocked: false };
  }
}
