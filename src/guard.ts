/**
 * Guard — prompt injection detection and PII redaction.
 *
 * Enterprise-grade input safety. Runs BEFORE any LLM call. Scans user
 * content for known jailbreak patterns and scrubs personally identifiable
 * information (PII) / secrets before they leave the process.
 */

export interface GuardConfig {
  detectInjection?: boolean;
  redactPII?: boolean;
  blockOnInjection?: boolean;
  /** Threshold [0,1] above which a prompt is considered unsafe. Default 0.5. */
  injectionThreshold?: number;
  /** Extra user-defined injection patterns. */
  customPatterns?: RegExp[];
}

export interface GuardResult {
  safe: boolean;
  injectionScore: number;
  redactedText: string;
  detections: string[];
  originalText: string;
}

export class GuardError extends Error {
  constructor(message: string, public result: GuardResult) {
    super(message);
    this.name = 'GuardError';
  }
}

/** Injection signatures. Each pattern contributes `weight` to the score. */
const INJECTION_PATTERNS: Array<{ name: string; regex: RegExp; weight: number }> = [
  { name: 'ignore_previous', regex: /\bignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?|context)\b/i, weight: 0.9 },
  { name: 'disregard_above', regex: /\b(disregard|forget|override)\s+(the\s+)?(above|previous|prior|earlier|system)\b/i, weight: 0.85 },
  { name: 'act_as_role', regex: /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as)\s+(a\s+)?(hacker|evil|unfiltered|unrestricted|jailbroken|dan|uncensored)/i, weight: 0.9 },
  { name: 'jailbreak_mode', regex: /\b(dan\s+mode|developer\s+mode|jailbreak|jailbroken|do\s+anything\s+now)\b/i, weight: 0.95 },
  { name: 'reveal_system_prompt', regex: /\b(reveal|show|print|display|output|tell\s+me)\s+(your\s+|the\s+)?(system\s+prompt|instructions|initial\s+prompt|hidden\s+prompt)\b/i, weight: 0.9 },
  { name: 'what_are_instructions', regex: /\bwhat\s+(are|were)\s+(your|the)\s+(original\s+|initial\s+)?instructions\b/i, weight: 0.8 },
  { name: 'repeat_above', regex: /\b(output|repeat|print|echo)\s+(everything\s+)?(the\s+)?above\b/i, weight: 0.75 },
  { name: 'encoding_attack', regex: /\btranslate\s+(the\s+above\s+)?to\s+(base64|hex|rot13|binary|morse)\b/i, weight: 0.8 },
  { name: 'bidi_override', regex: /[\u202A-\u202E\u2066-\u2069\u200E\u200F]/, weight: 0.95 },
  { name: 'inst_marker', regex: /\[\/?INST\]|<\|im_start\|>|<\|im_end\|>|<\|system\|>|<\|user\|>|<\|assistant\|>/i, weight: 0.7 },
  { name: 'hash_role_marker', regex: /^\s*#{3,}\s*(system|assistant|user)\b/im, weight: 0.6 },
  { name: 'new_instructions', regex: /\b(new|updated|revised)\s+instructions?\s*:/i, weight: 0.55 },
  { name: 'bypass_safety', regex: /\b(bypass|circumvent|disable|turn\s+off)\s+(safety|filters?|guidelines?|restrictions?)\b/i, weight: 0.9 },
  { name: 'end_of_prompt', regex: /\b(end\s+of\s+(prompt|instructions?|system))\b/i, weight: 0.6 },
];

/** PII patterns: [name, regex, replacement]. Order matters. */
const PII_PATTERNS: Array<[string, RegExp, string]> = [
  ['private_key', /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, '[PRIVATE_KEY]'],
  ['jwt', /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[JWT]'],
  ['api_key', /\b(?:sk-[A-Za-z0-9]{20,}|cp_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})\b/g, '[API_KEY]'],
  ['credit_card', /\b(?:\d[ -]?){13,19}\b/g, '[CREDIT_CARD]'],
  ['ssn', /\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]'],
  ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]'],
  ['phone', /(?:\+?\d{1,3}[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g, '[PHONE]'],
  ['ipv4', /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, '[IP]'],
];

export class Guard {
  private cfg: Required<Omit<GuardConfig, 'customPatterns'>> & { customPatterns: RegExp[] };

  constructor(config: GuardConfig = {}) {
    this.cfg = {
      detectInjection: config.detectInjection ?? true,
      redactPII: config.redactPII ?? true,
      blockOnInjection: config.blockOnInjection ?? false,
      injectionThreshold: config.injectionThreshold ?? 0.5,
      customPatterns: config.customPatterns ?? [],
    };
  }

  /** Run full guard check: detect injection + redact PII. */
  check(text: string): GuardResult {
    const detections: string[] = [];
    let injectionScore = 0;

    if (this.cfg.detectInjection) {
      const inj = this.detectInjection(text);
      injectionScore = inj.score;
      detections.push(...inj.patterns);
    }

    let redactedText = text;
    if (this.cfg.redactPII) {
      const { redacted, hits } = this.redactInternal(text);
      redactedText = redacted;
      detections.push(...hits);
    }

    const safe = injectionScore < this.cfg.injectionThreshold;
    return { safe, injectionScore, redactedText, detections, originalText: text };
  }

  /** Replace PII with tag tokens. */
  redact(text: string): string {
    return this.redactInternal(text).redacted;
  }

  /** Score a string for prompt-injection risk. Score is clamped to [0,1]. */
  detectInjection(text: string): { score: number; patterns: string[] } {
    const hits: string[] = [];
    let score = 0;
    for (const p of INJECTION_PATTERNS) {
      if (p.regex.test(text)) {
        hits.push(p.name);
        score += p.weight;
      }
    }
    for (let i = 0; i < this.cfg.customPatterns.length; i++) {
      if (this.cfg.customPatterns[i].test(text)) {
        hits.push(`custom_${i}`);
        score += 0.7;
      }
    }
    return { score: Math.min(1, score), patterns: hits };
  }

  private redactInternal(text: string): { redacted: string; hits: string[] } {
    const hits: string[] = [];
    let out = text;
    for (const [name, regex, replacement] of PII_PATTERNS) {
      if (regex.test(out)) {
        hits.push(name);
        out = out.replace(regex, replacement);
      }
    }
    return { redacted: out, hits };
  }
}
