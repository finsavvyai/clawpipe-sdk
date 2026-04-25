/** Advanced Packer — LLMLingua-inspired prompt compression without an LM. */
export interface AdvancedPackConfig {
  targetCompressionRatio?: number;
  preserveCodeBlocks?: boolean;
  preserveQuotes?: boolean;
  preserveNumbers?: boolean;
  mode?: 'conservative' | 'balanced' | 'aggressive';
}

export interface AdvancedPackResult {
  original: string;
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  savingsPercent: string;
  techniques: string[];
}

const FILLER: Array<[RegExp, string]> = [
  [/\bit'?s worth noting that\b/gi, ''],
  [/\bit is worth noting that\b/gi, ''],
  [/\bit should be noted that\b/gi, ''],
  [/\bas (?:i|we) (?:previously|already) (?:explained|mentioned|said|noted)\b[,.]?/gi, ''],
  [/\bas (?:mentioned|stated|noted) (?:earlier|previously|above)\b[,.]?/gi, ''],
  [/\bthe user mentioned earlier that\b/gi, 'the user said'],
  [/\bthe user previously (?:said|mentioned|stated) that\b/gi, 'the user said'],
  [/\bplease note that\b/gi, ''],
  [/\bkeep in mind that\b/gi, ''],
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bin the event that\b/gi, 'if'],
  [/\ba large number of\b/gi, 'many'],
  [/\bthe majority of\b/gi, 'most'],
  [/\bon a regular basis\b/gi, 'regularly'],
  [/\bin spite of the fact that\b/gi, 'although'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bin the process of\b/gi, ''],
  [/\bbasically\b/gi, ''],
  [/\bactually\b/gi, ''],
  [/\bliterally\b/gi, ''],
  [/\bessentially\b/gi, ''],
];

const QWORDS = new Set(['what', 'how', 'why', 'when', 'where', 'who', 'which']);
const LIST_SW = new Set(['the', 'a', 'an']);
export class AdvancedPacker {
  pack(text: string, config: AdvancedPackConfig = {}): AdvancedPackResult {
    const mode = config.mode ?? 'balanced';
    const ratio = config.targetCompressionRatio ?? 0.5;
    const pc = config.preserveCodeBlocks ?? true;
    const pq = config.preserveQuotes ?? true;
    const techniques: string[] = [];
    const originalTokens = this.estimateTokens(text);

    // Compact code/JSON BEFORE masking so those spans are visible.
    let pre = text;
    const c = this.compactCode(pre);
    if (c !== pre) techniques.push('code-compact');
    pre = c;
    const j = this.compactJson(pre);
    if (j !== pre) techniques.push('json-compact');
    pre = j;

    const { masked, spans } = this.mask(pre, pc, pq);
    let work = masked;

    const f = this.removeFillerPhrases(work);
    if (f !== work) techniques.push('filler-phrases');
    work = f;

    if (mode !== 'conservative') {
      const ls = this.stripListingFillers(work);
      if (ls !== work) techniques.push('listing-stopwords');
      work = ls;
    }
    if (mode === 'aggressive') {
      const e = this.extractEntities(work);
      if (e !== work) techniques.push('entity-extract');
      work = e;
    }

    if (mode !== 'conservative') {
      const curT = this.estimateTokens(this.unmask(work, spans));
      const target = originalTokens * (1 - ratio);
      const need = curT > target ? 1 - target / Math.max(1, curT) : 0.2;
      const floor = mode === 'aggressive' ? 0.4 : 0.25;
      work = this.dropLowValueSentences(work, Math.max(floor, Math.min(0.8, need)));
      techniques.push('sentence-drop');
    }

    work = work.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/ ([,.;:!?])/g, '$1').trim();
    const compressed = this.unmask(work, spans);
    const compressedTokens = this.estimateTokens(compressed);
    const savings = originalTokens > 0 ? Math.round((1 - compressedTokens / originalTokens) * 100) : 0;
    return { original: text, compressed, originalTokens, compressedTokens, savingsPercent: `${Math.max(0, savings)}%`, techniques };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  removeFillerPhrases(text: string): string {
    let out = text;
    for (const [p, r] of FILLER) out = out.replace(p, r);
    return out.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1');
  }

  compactJson(text: string): string {
    return text.replace(/\{[\s\S]*?\}/g, (m) => {
      try { return JSON.stringify(JSON.parse(m)); } catch { return m; }
    });
  }

  compactCode(text: string): string {
    return text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, body) => {
      let code: string = body;
      code = code.replace(/\/\*(?!\*)[\s\S]*?\*\//g, '');
      code = code.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      code = code.replace(/^\s*\n/gm, '');
      code = code.replace(/\(\s*\n\s+/g, '(').replace(/,\s*\n\s+/g, ', ');
      return '```' + lang + '\n' + code.trim() + '\n```';
    });
  }

  dropLowValueSentences(text: string, reduction: number): string {
    return text.split(/\n\n+/).map((p) => this.dropInPara(p, reduction)).join('\n\n');
  }

  private dropInPara(p: string, reduction: number): string {
    const guarded = p.replace(/(\d)\.(\d)/g, '$1\u0001$2');
    const rawSents = guarded.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g);
    const sents = rawSents?.map((s) => s.replace(/\u0001/g, '.'));
    if (!sents || sents.length <= 2) return p;
    const scored = sents.map((s, i) => ({ s, i, score: this.scoreSentence(s, i, sents.length) }));
    // Hard preservation: first, last, anything containing digits or preserved spans.
    const protectedIdx = new Set<number>();
    for (const x of scored) {
      if (x.i === 0 || x.i === sents.length - 1 || /\d|\u0000/.test(x.s)) protectedIdx.add(x.i);
    }
    const droppable = scored.filter((x) => !protectedIdx.has(x.i)).sort((a, b) => a.score - b.score);
    const n = Math.min(droppable.length, Math.ceil(sents.length * reduction));
    const drop = new Set(droppable.slice(0, n).map((x) => x.i));
    return scored.filter((x) => !drop.has(x.i)).map((x) => x.s).join(' ').replace(/\s+/g, ' ').trim();
  }

  private scoreSentence(s: string, i: number, total: number): number {
    let score = 0;
    if (i === 0 || i === total - 1) score += 10;
    if (/\d/.test(s)) score += 5;
    score += (s.match(/\b[A-Z][a-zA-Z]+/g) || []).length * 2;
    const w = s.trim().split(/\s+/).length;
    if (w >= 4 && w <= 25) score += 2;
    if (QWORDS.has(s.trim().split(/\s+/)[0]?.toLowerCase() || '')) score += 3;
    if (/PLACEHOLDER_\d+|\u0000/.test(s)) score += 4;
    return score;
  }

  extractEntities(text: string): string {
    return text.split(/\n\n+/).map((para) => {
      const sents = para.match(/[^.!?]+[.!?]+/g) || [para];
      return sents.map((s) => {
        const subj = (s.match(/^\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/) || [])[1];
        if (!subj) return s.trim();
        const facts: string[] = [];
        const role = s.match(/is (?:an? )?([a-z][\w\s]+?)(?:\s+(?:who|that|which|and)|[,.])/i);
        if (role) facts.push(role[1].trim());
        const org = s.match(/(?:works? (?:at|for)|employed by) ([A-Z][\w\s&]+?)(?:\s+and|[,.])/);
        if (org) facts.push(org[1].trim());
        const loc = s.match(/lives? in ([A-Z][\w\s]+?)(?:\s+and|[,.]|$)/);
        if (loc) facts.push(loc[1].trim());
        return facts.length ? `${subj}: ${facts.join(', ')}` : s.trim();
      }).join(' ');
    }).join('\n\n');
  }

  private stripListingFillers(text: string): string {
    return text.split('\n').map((line) => {
      if (!/^\s*[-*+]\s+/.test(line)) return line;
      return line.split(/\s+/).filter((w, i) => i === 0 || !LIST_SW.has(w.toLowerCase())).join(' ');
    }).join('\n');
  }

  private mask(text: string, code: boolean, quotes: boolean): { masked: string; spans: string[] } {
    const spans: string[] = [];
    let m = text;
    if (code) {
      m = m.replace(/```[\s\S]*?```/g, (x) => { spans.push(x); return `\u0000CODE${spans.length - 1}\u0000`; });
      m = m.replace(/`[^`\n]+`/g, (x) => { spans.push(x); return `\u0000IC${spans.length - 1}\u0000`; });
    }
    if (quotes) m = m.replace(/"[^"\n]{2,}"/g, (x) => { spans.push(x); return `\u0000Q${spans.length - 1}\u0000`; });
    return { masked: m, spans };
  }

  private unmask(text: string, spans: string[]): string {
    return text.replace(/\u0000(?:CODE|IC|Q)(\d+)\u0000/g, (_m, i) => spans[Number(i)] ?? '');
  }
}
