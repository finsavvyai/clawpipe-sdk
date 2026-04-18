/** Plugin registry with preCall / postCall execution. */
import type { GuardPlugin, GuardContext, GuardOutcome } from './types';

export interface GuardRule {
  guard: string;
  config?: unknown;
  blockOnFail?: boolean;
}

export interface GuardRunResult {
  allPass: boolean;
  outcomes: Array<GuardOutcome & { guard: string; blocked: boolean }>;
  safePrompt?: string;
}

export class GuardRegistry {
  private plugins = new Map<string, GuardPlugin>();

  register(plugin: GuardPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  registerAll(plugins: GuardPlugin[]): void {
    for (const p of plugins) this.register(p);
  }

  get(name: string): GuardPlugin | undefined {
    return this.plugins.get(name);
  }

  list(): string[] {
    return [...this.plugins.keys()];
  }

  async runPre(ctx: GuardContext, rules: GuardRule[]): Promise<GuardRunResult> {
    const outcomes: GuardRunResult['outcomes'] = [];
    let allPass = true;
    let prompt = ctx.prompt;
    for (const rule of rules) {
      const plugin = this.plugins.get(rule.guard);
      if (!plugin?.preCall) continue;
      const out = await plugin.preCall({ ...ctx, prompt }, rule.config);
      const blocked = !out.pass && rule.blockOnFail !== false;
      outcomes.push({ ...out, guard: rule.guard, blocked });
      if (out.replacement) prompt = out.replacement;
      if (blocked) { allPass = false; break; }
      if (!out.pass) allPass = false;
    }
    return { allPass, outcomes, safePrompt: prompt };
  }

  async runPost(response: string, ctx: GuardContext, rules: GuardRule[]): Promise<GuardRunResult> {
    const outcomes: GuardRunResult['outcomes'] = [];
    let allPass = true;
    let out_response = response;
    for (const rule of rules) {
      const plugin = this.plugins.get(rule.guard);
      if (!plugin?.postCall) continue;
      const out = await plugin.postCall(out_response, ctx, rule.config);
      const blocked = !out.pass && rule.blockOnFail !== false;
      outcomes.push({ ...out, guard: rule.guard, blocked });
      if (out.replacement) out_response = out.replacement;
      if (blocked) { allPass = false; break; }
      if (!out.pass) allPass = false;
    }
    return { allPass, outcomes, safePrompt: out_response };
  }
}
