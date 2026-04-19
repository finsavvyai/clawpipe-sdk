/** Cross-provider tool / function calling unifier.
 *
 * Each provider speaks a different schema for "the model can call my code":
 *   OpenAI:    tools: [{type:'function', function:{name, description, parameters}}]
 *   Anthropic: tools: [{name, description, input_schema}]
 *   Gemini:    tools: [{functionDeclarations: [{name, description, parameters}]}]
 *   Mistral:   tools: [{type:'function', function:{name, description, parameters}}]
 *
 * ClawPipe Tool is the canonical shape; convert helpers translate to/from
 * each provider's wire format.
 */

export interface JsonSchema {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  description?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: JsonSchema;
  /** Optional handler invoked when the model picks this tool. */
  handler?: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'groq' | 'deepseek';

/** Convert canonical Tool[] -> provider-specific wire format. */
export function toolsForProvider(tools: Tool[], provider: ProviderName): unknown {
  if (provider === 'anthropic') {
    return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
  }
  if (provider === 'gemini') {
    return [{
      functionDeclarations: tools.map((t) => ({
        name: t.name, description: t.description, parameters: t.parameters,
      })),
    }];
  }
  // OpenAI / Mistral / Groq / DeepSeek all share OpenAI's shape.
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/** Parse tool calls back from a provider response into the canonical shape. */
export function parseToolCalls(response: unknown, provider: ProviderName): ToolCall[] {
  if (!response || typeof response !== 'object') return [];

  if (provider === 'anthropic') {
    const r = response as { content?: Array<{ type: string; id: string; name: string; input: Record<string, unknown> }> };
    return (r.content ?? [])
      .filter((b) => b.type === 'tool_use')
      .map((b) => ({ id: b.id, name: b.name, arguments: b.input }));
  }

  if (provider === 'gemini') {
    type FCResp = { candidates?: Array<{ content?: { parts?: Array<{ functionCall?: { name: string; args: Record<string, unknown> } }> } }> };
    const r = response as FCResp;
    const parts = r.candidates?.[0]?.content?.parts ?? [];
    return parts
      .filter((p) => !!p.functionCall)
      .map((p, i) => ({ id: `call_${i}`, name: p.functionCall!.name, arguments: p.functionCall!.args }));
  }

  // OpenAI-shaped
  type OAResp = { choices?: Array<{ message?: { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> };
  const r = response as OAResp;
  const calls = r.choices?.[0]?.message?.tool_calls ?? [];
  return calls.map((c) => ({
    id: c.id,
    name: c.function.name,
    arguments: safeJson(c.function.arguments),
  }));
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s) as Record<string, unknown>; }
  catch { return {}; }
}

/** Run a parsed ToolCall against the canonical Tool[] handlers. */
export async function runToolCall(call: ToolCall, tools: Tool[]): Promise<{ id: string; name: string; result: unknown; error?: string }> {
  const tool = tools.find((t) => t.name === call.name);
  if (!tool) return { id: call.id, name: call.name, result: null, error: `unknown tool: ${call.name}` };
  if (!tool.handler) return { id: call.id, name: call.name, result: null, error: `no handler registered for ${call.name}` };
  try {
    const result = await tool.handler(call.arguments);
    return { id: call.id, name: call.name, result };
  } catch (e) {
    return { id: call.id, name: call.name, result: null, error: e instanceof Error ? e.message : String(e) };
  }
}
