import { describe, it, expect, vi } from 'vitest';
import { Rag, RagDocument } from './rag';

const mockDocs: RagDocument[] = [
  { id: '1', content: 'Recursion is when a function calls itself.', score: 0.95 },
  { id: '2', content: 'Base cases prevent infinite recursion.', score: 0.88 },
  { id: '3', content: 'The call stack tracks recursive calls.', score: 0.82 },
];

function mockRetrieve(query: string, limit: number): Promise<RagDocument[]> {
  return Promise.resolve(mockDocs.slice(0, limit));
}

describe('Rag', () => {
  it('augments prompt with retrieved documents', async () => {
    const rag = new Rag({ retrieveFn: mockRetrieve });
    const result = await rag.augment('What is recursion?');

    expect(result.documents).toHaveLength(3);
    expect(result.augmentedPrompt).toContain('Context:');
    expect(result.augmentedPrompt).toContain('Recursion is when');
    expect(result.augmentedPrompt).toContain('What is recursion?');
    expect(result.originalPrompt).toBe('What is recursion?');
    expect(result.contextTokensEstimate).toBeGreaterThan(0);
  });

  it('respects maxDocuments limit', async () => {
    const rag = new Rag({ retrieveFn: mockRetrieve, maxDocuments: 1 });
    const result = await rag.augment('test');
    expect(result.documents).toHaveLength(1);
  });

  it('respects token budget', async () => {
    const rag = new Rag({
      retrieveFn: mockRetrieve,
      maxTokens: 15,
    });
    const result = await rag.augment('test');
    expect(result.documents.length).toBeLessThan(3);
  });

  it('returns original prompt when no docs retrieved', async () => {
    const rag = new Rag({
      retrieveFn: () => Promise.resolve([]),
    });
    const result = await rag.augment('What is recursion?');
    expect(result.augmentedPrompt).toBe('What is recursion?');
    expect(result.documents).toHaveLength(0);
  });

  it('supports custom template function', async () => {
    const rag = new Rag({
      retrieveFn: mockRetrieve,
      templateFn: (docs, query) => `DOCS: ${docs.length} | Q: ${query}`,
    });
    const result = await rag.augment('test');
    expect(result.augmentedPrompt).toBe('DOCS: 3 | Q: test');
  });

  it('calls retrieve function with correct limit', async () => {
    const spy = vi.fn().mockResolvedValue([]);
    const rag = new Rag({ retrieveFn: spy, maxDocuments: 7 });
    await rag.augment('test');
    expect(spy).toHaveBeenCalledWith('test', 7);
  });
});
