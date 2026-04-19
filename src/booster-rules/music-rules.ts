/** Music — note frequencies, scales, intervals. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteToFreq(note: string, octave: number): number {
  const idx = NOTES.indexOf(note.toUpperCase().replace('B', '#').replace('##', '#').replace(/^([A-G])\#/, (s) => s).slice(0, 2).replace('B', ''));
  // simpler: use direct lookup
  const map: Record<string, number> = {};
  NOTES.forEach((n, i) => { map[n] = i; });
  const i = map[note.toUpperCase()] ?? -1;
  if (i < 0) return NaN;
  // A4 = 440Hz, A is index 9
  const semitonesFromA4 = (octave - 4) * 12 + (i - 9);
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

const noteFreq: BoosterRule = {
  name: 'note_frequency',
  test: (i) => /^(?:freq(?:uency)?\s+(?:of\s+)?)?([A-G]#?)([0-8])$/i.test(i.trim()),
  resolve: (i) => {
    const mm = m(i.trim(), /([A-G]#?)([0-8])$/i)!;
    const f = noteToFreq(mm[1], parseInt(mm[2], 10));
    return isNaN(f) ? 'invalid note' : `${f.toFixed(2)} Hz`;
  },
};

const majorScale: BoosterRule = {
  name: 'major_scale',
  test: (i) => /^major\s+scale\s+(?:of\s+|in\s+)?([A-G]#?)$/i.test(i),
  resolve: (i) => {
    const root = m(i, /([A-G]#?)$/i)![1].toUpperCase();
    const start = NOTES.indexOf(root);
    if (start < 0) return 'invalid root';
    const intervals = [0, 2, 4, 5, 7, 9, 11, 12];
    return intervals.map((iv) => NOTES[(start + iv) % 12]).join(' ');
  },
};

const minorScale: BoosterRule = {
  name: 'minor_scale',
  test: (i) => /^(?:natural\s+)?minor\s+scale\s+(?:of\s+|in\s+)?([A-G]#?)$/i.test(i),
  resolve: (i) => {
    const root = m(i, /([A-G]#?)$/i)![1].toUpperCase();
    const start = NOTES.indexOf(root);
    if (start < 0) return 'invalid root';
    const intervals = [0, 2, 3, 5, 7, 8, 10, 12];
    return intervals.map((iv) => NOTES[(start + iv) % 12]).join(' ');
  },
};

const interval: BoosterRule = {
  name: 'interval_semitones',
  test: (i) => /^semitones\s+(?:between|from)\s+([A-G]#?)([0-8])\s+(?:and|to)\s+([A-G]#?)([0-8])/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([A-G]#?)([0-8])\s+(?:and|to)\s+([A-G]#?)([0-8])/i)!;
    const a = NOTES.indexOf(mm[1].toUpperCase()) + parseInt(mm[2], 10) * 12;
    const b = NOTES.indexOf(mm[3].toUpperCase()) + parseInt(mm[4], 10) * 12;
    return String(Math.abs(b - a));
  },
};

const bpmDuration: BoosterRule = {
  name: 'bpm_to_ms',
  test: (i) => /^bpm\s+(\d+)\s+(?:to\s+ms|in\s+ms)/i.test(i),
  resolve: (i) => `${(60000 / parseInt(m(i, /(\d+)/)![1], 10)).toFixed(2)} ms per beat`,
};

export const musicRules: BoosterRule[] = [
  noteFreq, majorScale, minorScale, interval, bpmDuration,
];
