/** 15 default guards — ported from Portkey plugins/default + LiteLLM. */
import type { GuardPlugin } from './types';

export const containsGuard: GuardPlugin = {
  name: 'contains',
  preCall: (ctx, cfg) => {
    const needles = (cfg as { words?: string[] })?.words ?? [];
    const hit = needles.find((w) => ctx.prompt.includes(w));
    return hit ? { pass: false, reason: `contains forbidden word: ${hit}` } : { pass: true };
  },
};

export const regexMatchGuard: GuardPlugin = {
  name: 'regex_match',
  preCall: (ctx, cfg) => {
    const pattern = (cfg as { pattern?: string })?.pattern;
    if (!pattern) return { pass: true };
    return new RegExp(pattern).test(ctx.prompt)
      ? { pass: false, reason: `matches disallowed pattern ${pattern}` }
      : { pass: true };
  },
};

export const regexReplaceGuard: GuardPlugin = {
  name: 'regex_replace',
  preCall: (ctx, cfg) => {
    const c = cfg as { pattern: string; replacement: string; flags?: string };
    const replacement = ctx.prompt.replace(new RegExp(c.pattern, c.flags ?? 'g'), c.replacement);
    return { pass: true, replacement };
  },
};

export const jsonSchemaGuard: GuardPlugin = {
  name: 'json_schema',
  postCall: (response) => {
    try { JSON.parse(response); return { pass: true }; }
    catch { return { pass: false, reason: 'response is not valid JSON' }; }
  },
};

export const wordCountGuard: GuardPlugin = {
  name: 'word_count',
  postCall: (response, _ctx, cfg) => {
    const c = cfg as { min?: number; max?: number };
    const n = response.trim().split(/\s+/).filter(Boolean).length;
    if (c.min !== undefined && n < c.min) return { pass: false, reason: `word count ${n} < ${c.min}` };
    if (c.max !== undefined && n > c.max) return { pass: false, reason: `word count ${n} > ${c.max}` };
    return { pass: true };
  },
};

export const sentenceCountGuard: GuardPlugin = {
  name: 'sentence_count',
  postCall: (response, _ctx, cfg) => {
    const c = cfg as { min?: number; max?: number };
    const n = response.split(/[.!?]+/).filter((s) => s.trim().length).length;
    if (c.min !== undefined && n < c.min) return { pass: false, reason: `sentence count ${n} < ${c.min}` };
    if (c.max !== undefined && n > c.max) return { pass: false, reason: `sentence count ${n} > ${c.max}` };
    return { pass: true };
  },
};

export const characterCountGuard: GuardPlugin = {
  name: 'character_count',
  postCall: (response, _ctx, cfg) => {
    const c = cfg as { min?: number; max?: number };
    const n = response.length;
    if (c.min !== undefined && n < c.min) return { pass: false, reason: `char count ${n} < ${c.min}` };
    if (c.max !== undefined && n > c.max) return { pass: false, reason: `char count ${n} > ${c.max}` };
    return { pass: true };
  },
};

export const endsWithGuard: GuardPlugin = {
  name: 'ends_with',
  postCall: (response, _ctx, cfg) => {
    const suffix = (cfg as { suffix?: string })?.suffix;
    if (!suffix) return { pass: true };
    return response.trimEnd().endsWith(suffix) ? { pass: true } : { pass: false, reason: `does not end with ${suffix}` };
  },
};

export const validUrlsGuard: GuardPlugin = {
  name: 'valid_urls',
  postCall: (response) => {
    const urls = response.match(/https?:\/\/\S+/g) ?? [];
    for (const u of urls) {
      try { new URL(u); }
      catch { return { pass: false, reason: `invalid URL: ${u}` }; }
    }
    return { pass: true };
  },
};

export const containsCodeGuard: GuardPlugin = {
  name: 'contains_code',
  postCall: (response, _ctx, cfg) => {
    const required = (cfg as { required?: boolean })?.required ?? true;
    const hasCode = /```/.test(response) || /^\s*[a-zA-Z_][\w.]*\s*\(/m.test(response);
    if (required && !hasCode) return { pass: false, reason: 'response missing code block' };
    if (!required && hasCode) return { pass: false, reason: 'response unexpectedly contains code' };
    return { pass: true };
  },
};

export const modelWhitelistGuard: GuardPlugin = {
  name: 'model_whitelist',
  preCall: (ctx, cfg) => {
    const list = (cfg as { models?: string[] })?.models ?? [];
    if (!ctx.model) return { pass: true };
    return list.includes(ctx.model) ? { pass: true } : { pass: false, reason: `model ${ctx.model} not whitelisted` };
  },
};

export const requiredMetadataKeysGuard: GuardPlugin = {
  name: 'required_metadata_keys',
  preCall: (ctx, cfg) => {
    const keys = (cfg as { keys?: string[] })?.keys ?? [];
    const missing = keys.filter((k) => !ctx.metadata?.[k]);
    return missing.length ? { pass: false, reason: `missing metadata: ${missing.join(', ')}` } : { pass: true };
  },
};

export const webhookGuard: GuardPlugin = {
  name: 'webhook',
  preCall: async (ctx, cfg) => {
    const url = (cfg as { url?: string })?.url;
    if (!url) return { pass: true };
    try {
      const res = await fetch(url, { method: 'POST', body: JSON.stringify(ctx) });
      const body = await res.json() as { pass?: boolean; reason?: string };
      return { pass: body.pass !== false, reason: body.reason };
    } catch { return { pass: true, reason: 'webhook unreachable, failing open' }; }
  },
};

export const logGuard: GuardPlugin = {
  name: 'log',
  preCall: (ctx, cfg) => {
    const tag = (cfg as { tag?: string })?.tag ?? 'guard_log';
    console.log(JSON.stringify({ tag, promptLen: ctx.prompt.length, model: ctx.model }));
    return { pass: true };
  },
};

export const piiRedactGuard: GuardPlugin = {
  name: 'pii_redact',
  preCall: (ctx) => {
    const replacement = ctx.prompt
      .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\b(?:\d[ -]?){13,19}\b/g, '[CC]');
    return { pass: true, replacement };
  },
};

export const defaultGuards: GuardPlugin[] = [
  containsGuard, regexMatchGuard, regexReplaceGuard, jsonSchemaGuard,
  wordCountGuard, sentenceCountGuard, characterCountGuard, endsWithGuard,
  validUrlsGuard, containsCodeGuard, modelWhitelistGuard,
  requiredMetadataKeysGuard, webhookGuard, logGuard, piiRedactGuard,
];
