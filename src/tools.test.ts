import { describe, it, expect } from 'vitest';
import { toolsForProvider, parseToolCalls, runToolCall, type Tool } from './tools';

const sampleTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string', description: 'City name' } },
    required: ['city'],
  },
  handler: ({ city }) => ({ temp: 18, conditions: 'cloudy', city }),
};

describe('toolsForProvider', () => {
  it('OpenAI shape', () => {
    const out = toolsForProvider([sampleTool], 'openai') as Array<{ type: string; function: { name: string } }>;
    expect(out[0].type).toBe('function');
    expect(out[0].function.name).toBe('get_weather');
  });

  it('Anthropic shape', () => {
    const out = toolsForProvider([sampleTool], 'anthropic') as Array<{ name: string; input_schema: object }>;
    expect(out[0].name).toBe('get_weather');
    expect(out[0]).toHaveProperty('input_schema');
  });

  it('Gemini shape', () => {
    const out = toolsForProvider([sampleTool], 'gemini') as Array<{ functionDeclarations: Array<{ name: string }> }>;
    expect(out[0].functionDeclarations[0].name).toBe('get_weather');
  });

  it('Groq/Mistral/DeepSeek share OpenAI shape', () => {
    const out = toolsForProvider([sampleTool], 'groq') as Array<{ type: string }>;
    expect(out[0].type).toBe('function');
  });
});

describe('parseToolCalls', () => {
  it('parses OpenAI tool_calls', () => {
    const resp = { choices: [{ message: { tool_calls: [{ id: 'c1', function: { name: 'get_weather', arguments: '{"city":"Paris"}' } }] } }] };
    expect(parseToolCalls(resp, 'openai')).toEqual([{ id: 'c1', name: 'get_weather', arguments: { city: 'Paris' } }]);
  });

  it('parses Anthropic tool_use blocks', () => {
    const resp = { content: [{ type: 'text', text: 'thinking…' }, { type: 'tool_use', id: 'c2', name: 'get_weather', input: { city: 'Tokyo' } }] };
    expect(parseToolCalls(resp, 'anthropic')).toEqual([{ id: 'c2', name: 'get_weather', arguments: { city: 'Tokyo' } }]);
  });

  it('parses Gemini functionCall parts', () => {
    const resp = { candidates: [{ content: { parts: [{ functionCall: { name: 'get_weather', args: { city: 'Berlin' } } }] } }] };
    expect(parseToolCalls(resp, 'gemini')).toEqual([{ id: 'call_0', name: 'get_weather', arguments: { city: 'Berlin' } }]);
  });

  it('returns [] on empty/unknown shapes', () => {
    expect(parseToolCalls({}, 'openai')).toEqual([]);
    expect(parseToolCalls(null, 'anthropic')).toEqual([]);
  });

  it('tolerates malformed OpenAI args JSON', () => {
    const resp = { choices: [{ message: { tool_calls: [{ id: 'c1', function: { name: 'x', arguments: 'not json' } }] } }] };
    expect(parseToolCalls(resp, 'openai')[0].arguments).toEqual({});
  });
});

describe('runToolCall', () => {
  it('invokes the matching handler', async () => {
    const r = await runToolCall({ id: 'c', name: 'get_weather', arguments: { city: 'NYC' } }, [sampleTool]);
    expect(r.error).toBeUndefined();
    expect((r.result as { city: string }).city).toBe('NYC');
  });

  it('reports unknown tool', async () => {
    const r = await runToolCall({ id: 'c', name: 'missing', arguments: {} }, [sampleTool]);
    expect(r.error).toContain('unknown tool');
  });

  it('reports missing handler', async () => {
    const noHandler: Tool = { ...sampleTool, handler: undefined };
    const r = await runToolCall({ id: 'c', name: 'get_weather', arguments: { city: 'x' } }, [noHandler]);
    expect(r.error).toContain('no handler');
  });

  it('captures handler exceptions', async () => {
    const throws: Tool = { ...sampleTool, handler: () => { throw new Error('boom'); } };
    const r = await runToolCall({ id: 'c', name: 'get_weather', arguments: { city: 'x' } }, [throws]);
    expect(r.error).toBe('boom');
  });
});
