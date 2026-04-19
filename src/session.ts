/** Multi-turn conversation Session for ClawPipe.
 *
 * Ported from OpenSyber's ClawSession + Durable Object pattern. Holds
 * conversation history, applies the full pipeline on every turn, exposes
 * compact telemetry per session.
 *
 * Storage is pluggable: in-memory by default; pass a SessionStore to
 * persist (D1, KV, Durable Object SQLite, Redis, anything).
 */
import type { ClawPipe } from './index';
import type { PromptOptions, PipelineMeta } from './types';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  ts: number;
}

export interface SessionState {
  id: string;
  projectId: string;
  messages: Message[];
  createdAt: number;
  totalCostUsd: number;
  totalTokensIn: number;
  totalTokensOut: number;
  turns: number;
}

export interface SessionStore {
  load(id: string): Promise<SessionState | null>;
  save(state: SessionState): Promise<void>;
  delete(id: string): Promise<void>;
}

export class MemorySessionStore implements SessionStore {
  private map = new Map<string, SessionState>();
  async load(id: string) { return this.map.get(id) ?? null; }
  async save(s: SessionState) { this.map.set(s.id, s); }
  async delete(id: string) { this.map.delete(id); }
}

export class ClawSession {
  private state: SessionState;

  constructor(
    private pipe: ClawPipe,
    state: SessionState,
    private store: SessionStore,
    private maxTurns = 50,
  ) {
    this.state = state;
  }

  static async create(
    pipe: ClawPipe, projectId: string,
    store: SessionStore = new MemorySessionStore(),
    system?: string,
  ): Promise<ClawSession> {
    const state: SessionState = {
      id: crypto.randomUUID(), projectId,
      messages: system ? [{ role: 'system', content: system, ts: Date.now() }] : [],
      createdAt: Date.now(), totalCostUsd: 0, totalTokensIn: 0, totalTokensOut: 0, turns: 0,
    };
    await store.save(state);
    return new ClawSession(pipe, state, store);
  }

  static async resume(
    pipe: ClawPipe, id: string, store: SessionStore,
  ): Promise<ClawSession | null> {
    const state = await store.load(id);
    return state ? new ClawSession(pipe, state, store) : null;
  }

  async ask(input: string, options: PromptOptions = {}): Promise<{ text: string; meta: PipelineMeta }> {
    if (this.state.turns >= this.maxTurns) {
      throw new Error(`session ${this.state.id} exceeded max ${this.maxTurns} turns`);
    }
    this.state.messages.push({ role: 'user', content: input, ts: Date.now() });
    const transcript = this.transcript();
    const result = await this.pipe.prompt(transcript, options);
    this.state.messages.push({ role: 'assistant', content: result.text, ts: Date.now() });
    this.state.turns += 1;
    this.state.totalCostUsd += result.meta.estimatedCostUsd;
    this.state.totalTokensIn += result.meta.tokensIn;
    this.state.totalTokensOut += result.meta.tokensOut;
    await this.store.save(this.state);
    return result;
  }

  /** Render messages as a single prompt the pipeline can compress + cache. */
  private transcript(): string {
    const sys = this.state.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const turns = this.state.messages.filter((m) => m.role !== 'system')
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    return sys ? `${sys}\n\n${turns}` : turns;
  }

  get id(): string { return this.state.id; }
  get history(): Message[] { return [...this.state.messages]; }
  stats() {
    return {
      turns: this.state.turns,
      totalCostUsd: this.state.totalCostUsd,
      totalTokensIn: this.state.totalTokensIn,
      totalTokensOut: this.state.totalTokensOut,
      durationMs: Date.now() - this.state.createdAt,
    };
  }

  async destroy(): Promise<void> { await this.store.delete(this.state.id); }
}
