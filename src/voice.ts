/**
 * Voice — speech-to-text and text-to-speech pipeline stages.
 *
 * Integrates with local voice servers:
 * - Voicebox (TTS): localhost:5000/synthesize
 * - Whisper.cpp (STT): localhost:8081/inference
 *
 * Enables voice-in → pipeline → voice-out workflows.
 */

export interface VoiceConfig {
  sttUrl?: string;
  ttsUrl?: string;
  ttsVoice?: string;
  ttsLanguage?: string;
}

export interface SttResult {
  text: string;
  language?: string;
  durationMs: number;
}

export interface TtsResult {
  audio: ArrayBuffer;
  durationMs: number;
  format: string;
}

const DEFAULT_STT = 'http://localhost:8081/inference';
const DEFAULT_TTS = 'http://localhost:5000/synthesize';

export class Voice {
  private sttUrl: string;
  private ttsUrl: string;
  private ttsVoice: string;
  private ttsLanguage: string;

  constructor(config: VoiceConfig = {}) {
    this.sttUrl = config.sttUrl ?? DEFAULT_STT;
    this.ttsUrl = config.ttsUrl ?? DEFAULT_TTS;
    this.ttsVoice = config.ttsVoice ?? 'default';
    this.ttsLanguage = config.ttsLanguage ?? 'en';
  }

  /** Convert speech audio to text using a local STT server. */
  async transcribe(audio: ArrayBuffer): Promise<SttResult> {
    const start = Date.now();
    const formData = new FormData();
    formData.append('file', new Blob([audio], { type: 'audio/wav' }), 'audio.wav');
    formData.append('response_format', 'json');

    const res = await fetch(this.sttUrl, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`STT error: ${res.status}`);

    const data = await res.json() as { text: string; language?: string };
    return {
      text: data.text.trim(),
      language: data.language,
      durationMs: Date.now() - start,
    };
  }

  /** Convert text to speech audio using a local TTS server. */
  async synthesize(text: string): Promise<TtsResult> {
    const start = Date.now();
    const res = await fetch(this.ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: this.ttsVoice,
        language: this.ttsLanguage,
      }),
    });

    if (!res.ok) throw new Error(`TTS error: ${res.status}`);

    const audio = await res.arrayBuffer();
    return {
      audio,
      durationMs: Date.now() - start,
      format: res.headers.get('content-type') ?? 'audio/wav',
    };
  }

  /** Check if STT server is available. */
  async isSttAvailable(): Promise<boolean> {
    return this.checkEndpoint(this.sttUrl.replace('/inference', '/health'));
  }

  /** Check if TTS server is available. */
  async isTtsAvailable(): Promise<boolean> {
    return this.checkEndpoint(this.ttsUrl.replace('/synthesize', '/health'));
  }

  private async checkEndpoint(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }
}
