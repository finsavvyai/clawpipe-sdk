/** Extra string ops — palindrome, anagram, levenshtein, etc. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

const isPalindrome: BoosterRule = {
  name: 'is_palindrome',
  test: (i) => /^(?:is\s+)?palindrome\s+(.+)/i.test(i),
  resolve: (i) => {
    const s = m(i, /^(?:is\s+)?palindrome\s+(.+)/i)![1].toLowerCase().replace(/[^a-z0-9]/g, '');
    return s === [...s].reverse().join('') ? 'Yes' : 'No';
  },
};

const isAnagram: BoosterRule = {
  name: 'is_anagram',
  test: (i) => /^(?:is\s+)?anagram\s+(.+?)\s+(?:and|of)\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^(?:is\s+)?anagram\s+(.+?)\s+(?:and|of)\s+(.+)/i)!;
    const norm = (s: string) => [...s.toLowerCase().replace(/[^a-z]/g, '')].sort().join('');
    return norm(mm[1]) === norm(mm[2]) ? 'Yes' : 'No';
  },
};

const editDistance: BoosterRule = {
  name: 'edit_distance',
  test: (i) => /^(?:levenshtein|edit\s+distance)\s+(.+?)\s+(?:and|to)\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^(?:levenshtein|edit\s+distance)\s+(.+?)\s+(?:and|to)\s+(.+)/i)!;
    return String(levenshtein(mm[1].trim(), mm[2].trim()));
  },
};

const similarity: BoosterRule = {
  name: 'string_similarity',
  test: (i) => /^similarity\s+(.+?)\s+(?:and|to)\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^similarity\s+(.+?)\s+(?:and|to)\s+(.+)/i)!;
    const a = mm[1].trim(), b = mm[2].trim();
    const dist = levenshtein(a, b);
    const max = Math.max(a.length, b.length);
    return max === 0 ? '1.00' : (1 - dist / max).toFixed(2);
  },
};

const containsSubstring: BoosterRule = {
  name: 'contains_substring',
  test: (i) => /^does\s+(.+?)\s+contain\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^does\s+(.+?)\s+contain\s+(.+)/i)!;
    return mm[1].includes(mm[2].trim()) ? 'Yes' : 'No';
  },
};

const startsWith: BoosterRule = {
  name: 'starts_with',
  test: (i) => /^does\s+(.+?)\s+start\s+with\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^does\s+(.+?)\s+start\s+with\s+(.+)/i)!;
    return mm[1].startsWith(mm[2].trim()) ? 'Yes' : 'No';
  },
};

const endsWithRule: BoosterRule = {
  name: 'ends_with',
  test: (i) => /^does\s+(.+?)\s+end\s+with\s+(.+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^does\s+(.+?)\s+end\s+with\s+(.+)/i)!;
    return mm[1].endsWith(mm[2].trim()) ? 'Yes' : 'No';
  },
};

const wordsInString: BoosterRule = {
  name: 'words_in',
  test: (i) => /^(?:words\s+in|tokenize)\s+(.+)/i.test(i),
  resolve: (i) => m(i, /^(?:words\s+in|tokenize)\s+(.+)/i)![1].split(/\s+/).filter(Boolean).join(', '),
};

const longestWord: BoosterRule = {
  name: 'longest_word',
  test: (i) => /^longest\s+word\s+(?:in\s+)?(.+)/i.test(i),
  resolve: (i) => m(i, /^longest\s+word\s+(?:in\s+)?(.+)/i)![1].split(/\s+/).filter(Boolean)
    .reduce((a, b) => (b.length > a.length ? b : a), ''),
};

const vowelCount: BoosterRule = {
  name: 'vowel_count',
  test: (i) => /^(?:vowel\s+count|count\s+vowels)\s+(?:in\s+)?(.+)/i.test(i),
  resolve: (i) => String((m(i, /^(?:vowel\s+count|count\s+vowels)\s+(?:in\s+)?(.+)/i)![1].match(/[aeiou]/gi) ?? []).length),
};

const consonantCount: BoosterRule = {
  name: 'consonant_count',
  test: (i) => /^(?:consonant\s+count|count\s+consonants)\s+(?:in\s+)?(.+)/i.test(i),
  resolve: (i) => String((m(i, /^(?:consonant\s+count|count\s+consonants)\s+(?:in\s+)?(.+)/i)![1].match(/[bcdfghjklmnpqrstvwxyz]/gi) ?? []).length),
};

const swapCase: BoosterRule = {
  name: 'swap_case',
  test: (i) => /^swap\s+case\s+(.+)/i.test(i),
  resolve: (i) => m(i, /^swap\s+case\s+(.+)/i)![1].replace(/[a-zA-Z]/g, (c) => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()),
};

export const stringExtraRules: BoosterRule[] = [
  isPalindrome, isAnagram, editDistance, similarity,
  containsSubstring, startsWith, endsWithRule, wordsInString,
  longestWord, vowelCount, consonantCount, swapCase,
];
