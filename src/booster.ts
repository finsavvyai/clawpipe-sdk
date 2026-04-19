/**
 * Agent Booster — deterministic transforms that skip LLM calls.
 *
 * Resolves prompts locally when the answer can be computed without AI.
 * Rules are split into modules under ./booster-rules/.
 */

import {
  BoosterRule,
  coreRules,
  stringRules,
  textRules,
  dataRules,
  datetimeRules,
  mathRules,
  codeRules,
  statsRules,
  encodingRules,
  financeRules,
  regexRules,
  formatRules,
  colorRules,
  devRules,
  timeRules,
  scienceRules,
  logicRules,
  miscRules,
  isoRules,
  cryptoRules,
  awsRules,
  markupRules,
  geometryRules,
  stringExtraRules,
  mathExtraRules,
  physicsRules,
  chemistryRules,
  musicRules,
  financeExtraRules,
} from './booster-rules';

export type { BoosterRule } from './booster-rules';

const allDefaultRules: BoosterRule[] = [
  ...coreRules,
  ...stringRules,
  ...textRules,
  ...dataRules,
  ...datetimeRules,
  ...mathRules,
  ...codeRules,
  ...statsRules,
  ...encodingRules,
  ...financeRules,
  ...regexRules,
  ...formatRules,
  ...colorRules,
  ...devRules,
  ...timeRules,
  ...scienceRules,
  ...logicRules,
  ...miscRules,
  ...isoRules,
  ...cryptoRules,
  ...awsRules,
  ...markupRules,
  ...geometryRules,
  ...stringExtraRules,
  ...mathExtraRules,
  ...physicsRules,
  ...chemistryRules,
  ...musicRules,
  ...financeExtraRules,
];

export class Booster {
  private rules: BoosterRule[] = [];

  constructor() {
    this.rules.push(...allDefaultRules);
  }

  /** Try to resolve the prompt without an LLM. Returns null if no rule matches. */
  tryResolve(input: string): string | null {
    const trimmed = input.trim();
    for (const rule of this.rules) {
      if (rule.test(trimmed)) {
        try {
          return rule.resolve(trimmed);
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  /** Register a custom booster rule. */
  addRule(rule: BoosterRule): void {
    this.rules.push(rule);
  }

  /** Get count of registered rules. */
  get ruleCount(): number {
    return this.rules.length;
  }
}
