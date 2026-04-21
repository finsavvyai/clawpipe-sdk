/**
 * LLM-as-judge quality scorer.
 * Sends a prompt+response pair to a judge model and returns a quality score 0–1.
 */

export interface ScorerConfig {
  apiKey: string;
  model?: string;   // default: gpt-4o-mini
  baseUrl?: string; // default: https://api.openai.com/v1
}

const JUDGE_PROMPT = (prompt: string, response: string): string =>
  `You are a response quality judge.\nRate how well the response answers the prompt on a scale 0.0 to 1.0.\nConsider: relevance, completeness, and accuracy equally.\nRespond ONLY with valid JSON: {"score": <number between 0 and 1>}\n\nPrompt: ${prompt}\nResponse: ${response}`;

export async function scoreResponse(
  prompt: string,
  response: string,
  config: ScorerConfig,
): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `${config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model ?? 'gpt-4o-mini',
          messages: [{ role: 'user', content: JUDGE_PROMPT(prompt, response) }],
          max_tokens: 50,
        }),
        signal: controller.signal,
      },
    );
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return parseScore(data.choices?.[0]?.message?.content ?? '');
  } catch {
    return 0.5;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseScore(text: string): number {
  try {
    const parsed = JSON.parse(text) as { score?: unknown };
    const s = Number(parsed.score);
    return isNaN(s) ? 0.5 : Math.min(1, Math.max(0, s));
  } catch {
    return 0.5;
  }
}
