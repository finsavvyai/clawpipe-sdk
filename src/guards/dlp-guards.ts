/** DLP guard pack — ported from sdlc.cc's compliance/PII detection.
 *
 * 10 guards covering 12+ PII classes. Defaults to redact (replace), but
 * each can flip to blockOnFail for stricter regulated workloads.
 */
import type { GuardPlugin } from './types';

const re = (pattern: RegExp, label: string): GuardPlugin['preCall'] =>
  (ctx) => ({ pass: true, replacement: ctx.prompt.replace(pattern, label) });

const detect = (pattern: RegExp, label: string): GuardPlugin['preCall'] =>
  (ctx) => {
    const hit = pattern.test(ctx.prompt);
    return hit ? { pass: false, reason: `contains ${label}` } : { pass: true };
  };

export const ssnGuard: GuardPlugin = {
  name: 'dlp_ssn',
  preCall: re(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]'),
};

export const creditCardGuard: GuardPlugin = {
  name: 'dlp_credit_card',
  preCall: re(/\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[CC]'),
};

export const phoneGuard: GuardPlugin = {
  name: 'dlp_phone',
  preCall: re(/\b(?:\+?1[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}\b/g, '[PHONE]'),
};

export const emailGuard: GuardPlugin = {
  name: 'dlp_email',
  preCall: re(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]'),
};

export const ipGuard: GuardPlugin = {
  name: 'dlp_ip',
  preCall: re(/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g, '[IP]'),
};

export const ipv6Guard: GuardPlugin = {
  name: 'dlp_ipv6',
  preCall: re(/\b(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\b/g, '[IPV6]'),
};

export const ibanGuard: GuardPlugin = {
  name: 'dlp_iban',
  preCall: re(/\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g, '[IBAN]'),
};

export const passportGuard: GuardPlugin = {
  name: 'dlp_passport_us',
  preCall: re(/\b[A-Z]\d{8}\b/g, '[PASSPORT]'),
};

export const apiKeyLeakGuard: GuardPlugin = {
  name: 'dlp_api_key_leak',
  preCall: re(/\b(?:sk-[A-Za-z0-9]{20,}|xoxb-[A-Za-z0-9-]+|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16})\b/g, '[API_KEY]'),
};

export const dobGuard: GuardPlugin = {
  name: 'dlp_dob',
  preCall: re(/\b(?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b/g, '[DOB]'),
};

/** Strict variants — same patterns, but BLOCK instead of redact. Pair with
 *  blockOnFail for compliance environments (HIPAA / FINRA / GDPR strict). */
export const blockSsnGuard: GuardPlugin = {
  name: 'dlp_block_ssn',
  preCall: detect(/\b\d{3}-\d{2}-\d{4}\b/, 'SSN'),
};

export const blockCreditCardGuard: GuardPlugin = {
  name: 'dlp_block_credit_card',
  preCall: detect(/\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/, 'credit card'),
};

export const dlpGuards: GuardPlugin[] = [
  ssnGuard, creditCardGuard, phoneGuard, emailGuard,
  ipGuard, ipv6Guard, ibanGuard, passportGuard,
  apiKeyLeakGuard, dobGuard,
  blockSsnGuard, blockCreditCardGuard,
];
