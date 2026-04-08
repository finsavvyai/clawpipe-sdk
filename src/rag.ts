/**
 * RAG — Retrieval-Augmented Generation pipeline stage.
 *
 * Retrieves relevant documents from a vector store and prepends
 * them as context to the prompt before sending to the LLM.
 * Supports pluggable retrieval backends.
 */

export interface RagConfig {
  maxDocuments?: number;
  maxTokens?: number;
  retrieveFn: (query: string, limit: number) => Promise<RagDocument[]>;
  templateFn?: (docs: RagDocument[], query: string) => string;
}

export interface RagDocument {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RagResult {
  augmentedPrompt: string;
  documents: RagDocument[];
  originalPrompt: string;
  contextTokensEstimate: number;
}

export class Rag {
  private maxDocuments: number;
  private maxTokens: number;
  private retrieve: (query: string, limit: number) => Promise<RagDocument[]>;
  private template: (docs: RagDocument[], query: string) => string;

  constructor(config: RagConfig) {
    this.maxDocuments = config.maxDocuments ?? 5;
    this.maxTokens = config.maxTokens ?? 4000;
    this.retrieve = config.retrieveFn;
    this.template = config.templateFn ?? defaultTemplate;
  }

  /** Retrieve documents and augment the prompt. */
  async augment(prompt: string): Promise<RagResult> {
    const docs = await this.retrieve(prompt, this.maxDocuments);
    const trimmed = this.trimToTokenBudget(docs);
    const augmented = this.template(trimmed, prompt);

    return {
      augmentedPrompt: augmented,
      documents: trimmed,
      originalPrompt: prompt,
      contextTokensEstimate: estimateTokens(augmented) - estimateTokens(prompt),
    };
  }

  /** Trim documents to fit within token budget. */
  private trimToTokenBudget(docs: RagDocument[]): RagDocument[] {
    const result: RagDocument[] = [];
    let tokens = 0;

    for (const doc of docs) {
      const docTokens = estimateTokens(doc.content);
      if (tokens + docTokens > this.maxTokens) break;
      result.push(doc);
      tokens += docTokens;
    }

    return result;
  }
}

function defaultTemplate(docs: RagDocument[], query: string): string {
  if (docs.length === 0) return query;

  const context = docs
    .map((d, i) => `[${i + 1}] ${d.content}`)
    .join('\n\n');

  return `Use the following context to answer the question.\n\nContext:\n${context}\n\nQuestion: ${query}`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
