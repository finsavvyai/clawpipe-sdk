/**
 * Moderation — output content scanning for LLM responses.
 *
 * Runs AFTER the provider call. Flags responses that leak secrets,
 * echo the system prompt, contain PII, or spam the user with URLs.
 */

export interface ModerationResult {
  safe: boolean;
  flags: string[];
}

const API_KEY_RE = /\b(?:sk-[A-Za-z0-9]{20,}|cp_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})\b/;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const PRIVATE_KEY_RE = /-----BEGIN [A-Z ]+PRIVATE KEY-----/;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;
const CREDIT_CARD_RE = /\b(?:\d[ -]?){13,19}\b/;
const URL_RE = /https?:\/\/[^\s)]+/g;

const SYSTEM_MARKERS = [
  /<\|im_start\|>/i,
  /\[INST\]/i,
  /\byou\s+are\s+a\s+helpful\s+assistant\b/i,
  /\bsystem\s+prompt\s*:/i,
  /^\s*###\s*system\b/im,
];

export interface ModerationConfig {
  /** Max allowed URLs before flagging as spam. Default 5. */
  maxUrls?: number;
  /** Block response on any flag. Default false (warn only). */
  blockOnFlag?: boolean;
}

export class Moderation {
  private maxUrls: number;
  private blockOnFlag: boolean;

  constructor(config: ModerationConfig = {}) {
    this.maxUrls = config.maxUrls ?? 5;
    this.blockOnFlag = config.blockOnFlag ?? false;
  }

  /** Scan LLM output and return safety flags. */
  check(text: string): ModerationResult {
    const flags: string[] = [];

    if (API_KEY_RE.test(text)) flags.push('api_key_leak');
    if (JWT_RE.test(text)) flags.push('jwt_leak');
    if (PRIVATE_KEY_RE.test(text)) flags.push('private_key_leak');

    if (EMAIL_RE.test(text)) flags.push('pii_email');
    if (SSN_RE.test(text)) flags.push('pii_ssn');
    if (CREDIT_CARD_RE.test(text)) flags.push('pii_credit_card');

    const urls = text.match(URL_RE);
    if (urls && urls.length > this.maxUrls) flags.push('excessive_urls');

    for (const marker of SYSTEM_MARKERS) {
      if (marker.test(text)) {
        flags.push('system_prompt_leak');
        break;
      }
    }

    return { safe: flags.length === 0, flags };
  }

  /** True if the moderation should block the response based on config. */
  shouldBlock(result: ModerationResult): boolean {
    return this.blockOnFlag && !result.safe;
  }
}
