/**
 * Context Packer — compress context to reduce token count.
 *
 * Strategies:
 * - Remove redundant whitespace and blank lines
 * - Deduplicate repeated content blocks
 * - Truncate overly long inputs to a budget
 * - Strip common boilerplate patterns
 * - Estimate token savings
 */

export interface PackResult {
  packed: string;
  originalTokens: number;
  packedTokens: number;
  savings: string;
}

interface PackerConfig {
  maxTokens: number;
  deduplication: boolean;
  stripBoilerplate: boolean;
  compressWhitespace: boolean;
}

const DEFAULT_CONFIG: PackerConfig = {
  maxTokens: 100_000,
  deduplication: true,
  stripBoilerplate: true,
  compressWhitespace: true,
};

export class Packer {
  private config: PackerConfig;

  constructor(config: Partial<PackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Pack a prompt and optional system message. Returns compressed text and savings. */
  pack(input: string, system?: string): PackResult {
    const original = system ? `${system}\n\n${input}` : input;
    const originalTokens = this.estimateTokens(original);

    let packed = original;

    if (this.config.compressWhitespace) {
      packed = this.compressWhitespace(packed);
    }

    if (this.config.deduplication) {
      packed = this.deduplicate(packed);
    }

    if (this.config.stripBoilerplate) {
      packed = this.stripBoilerplate(packed);
    }

    packed = this.truncateToLimit(packed);

    const packedTokens = this.estimateTokens(packed);
    const savingsPercent = originalTokens > 0
      ? Math.round((1 - packedTokens / originalTokens) * 100)
      : 0;

    return {
      packed,
      originalTokens,
      packedTokens,
      savings: `${Math.max(0, savingsPercent)}%`,
    };
  }

  /** Rough token estimate: ~4 chars per token for English text. */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /** Collapse multiple blank lines and trim trailing whitespace. */
  private compressWhitespace(text: string): string {
    return text
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** Remove duplicate paragraphs or blocks that appear more than once. */
  private deduplicate(text: string): string {
    const blocks = text.split('\n\n');
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const block of blocks) {
      const normalized = block.trim().toLowerCase();
      if (normalized.length === 0) continue;
      if (normalized.length > 50 && seen.has(normalized)) continue;
      seen.add(normalized);
      unique.push(block);
    }

    return unique.join('\n\n');
  }

  /** Strip common boilerplate patterns that add little context. */
  private stripBoilerplate(text: string): string {
    const boilerplatePatterns = [
      /^\/\*\*?\s*\n(\s*\*\s*@(param|returns|throws|example).*\n)*\s*\*\//gm,
      /^\/\/\s*eslint-disable.*$/gm,
      /^\/\/\s*@ts-(ignore|expect-error|nocheck).*$/gm,
      /^'use strict';?\s*$/gm,
      /^\/\*\s*istanbul ignore (next|else)\s*\*\/$/gm,
    ];

    let result = text;
    for (const pattern of boilerplatePatterns) {
      result = result.replace(pattern, '');
    }

    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  /** Truncate text to fit within token budget. */
  private truncateToLimit(text: string): string {
    const maxChars = this.config.maxTokens * 4;
    if (text.length <= maxChars) return text;

    const truncated = text.slice(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = lastNewline > maxChars * 0.8 ? lastNewline : maxChars;

    return truncated.slice(0, cutPoint) + '\n\n[Truncated — context exceeded budget]';
  }
}
