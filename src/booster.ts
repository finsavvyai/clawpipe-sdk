/**
 * Agent Booster — deterministic transforms that skip LLM calls.
 *
 * Resolves prompts locally when the answer can be computed without AI:
 * - JSON extraction and formatting
 * - Math expressions
 * - Date/time queries
 * - Regex-based transforms
 * - Simple lookups and conversions
 */

interface BoosterRule {
  name: string;
  test: (input: string) => boolean;
  resolve: (input: string) => string;
}

export class Booster {
  private rules: BoosterRule[] = [];

  constructor() {
    this.registerDefaults();
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

  private registerDefaults(): void {
    this.rules.push(
      this.jsonFormatRule(),
      this.mathRule(),
      this.dateRule(),
      this.unitConversionRule(),
      this.uuidRule(),
      this.base64Rule(),
    );
  }

  private jsonFormatRule(): BoosterRule {
    return {
      name: 'json-format',
      test: (input) => {
        const lower = input.toLowerCase();
        return (lower.startsWith('format this json') || lower.startsWith('pretty print'))
          && input.includes('{');
      },
      resolve: (input) => {
        const jsonStart = input.indexOf('{');
        const jsonStr = input.slice(jsonStart);
        return JSON.stringify(JSON.parse(jsonStr), null, 2);
      },
    };
  }

  private mathRule(): BoosterRule {
    const mathPattern = /^(?:calculate|compute|what is|evaluate|solve)\s+(.+)/i;
    const safeExprPattern = /^[\d\s+\-*/().,%^]+$/;
    return {
      name: 'math',
      test: (input) => {
        const match = input.match(mathPattern);
        if (!match) return false;
        return safeExprPattern.test(match[1].trim());
      },
      resolve: (input) => {
        const match = input.match(mathPattern)!;
        const expr = match[1].trim().replace('^', '**');
        const result = new Function(`return (${expr})`)();
        return String(result);
      },
    };
  }

  private dateRule(): BoosterRule {
    const datePatterns = [
      /what(?:'s| is) (?:the )?(?:current )?(?:date|time|day)/i,
      /(?:today|now|current date)/i,
    ];
    return {
      name: 'date',
      test: (input) => datePatterns.some((p) => p.test(input) && input.length < 60),
      resolve: () => new Date().toISOString(),
    };
  }

  private unitConversionRule(): BoosterRule {
    const pattern = /convert\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)/i;
    const conversions: Record<string, Record<string, number>> = {
      km: { miles: 0.621371, m: 1000, ft: 3280.84 },
      miles: { km: 1.60934, m: 1609.34, ft: 5280 },
      kg: { lbs: 2.20462, g: 1000, oz: 35.274 },
      lbs: { kg: 0.453592, g: 453.592, oz: 16 },
      c: { f: (v: number) => v * 9 / 5 + 32, k: (v: number) => v + 273.15 },
      f: { c: (v: number) => (v - 32) * 5 / 9, k: (v: number) => (v - 32) * 5 / 9 + 273.15 },
    };
    return {
      name: 'unit-conversion',
      test: (input) => pattern.test(input),
      resolve: (input) => {
        const match = input.match(pattern)!;
        const value = parseFloat(match[1]);
        const from = match[2].toLowerCase();
        const to = match[3].toLowerCase();
        const conv = conversions[from]?.[to];
        if (conv === undefined) throw new Error('Unknown conversion');
        const result = typeof conv === 'function' ? conv(value) : value * conv;
        return `${value} ${from} = ${Number(result.toFixed(4))} ${to}`;
      },
    };
  }

  private uuidRule(): BoosterRule {
    return {
      name: 'uuid',
      test: (input) => /generate\s+(?:a\s+)?uuid/i.test(input),
      resolve: () => crypto.randomUUID(),
    };
  }

  private base64Rule(): BoosterRule {
    const encodePattern = /base64\s+encode\s+(.+)/i;
    const decodePattern = /base64\s+decode\s+(.+)/i;
    return {
      name: 'base64',
      test: (input) => encodePattern.test(input) || decodePattern.test(input),
      resolve: (input) => {
        const enc = input.match(encodePattern);
        if (enc) return Buffer.from(enc[1].trim()).toString('base64');
        const dec = input.match(decodePattern);
        if (dec) return Buffer.from(dec[1].trim(), 'base64').toString('utf-8');
        throw new Error('No match');
      },
    };
  }
}
