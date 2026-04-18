/** Guardrail plugin contract. */
export interface GuardContext {
  prompt: string;
  system?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, string>;
}

export interface GuardOutcome {
  pass: boolean;
  reason?: string;
  replacement?: string;
}

export interface GuardPlugin {
  name: string;
  preCall?: (ctx: GuardContext, config: unknown) => GuardOutcome | Promise<GuardOutcome>;
  postCall?: (response: string, ctx: GuardContext, config: unknown) => GuardOutcome | Promise<GuardOutcome>;
}
