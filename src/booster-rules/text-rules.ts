/**
 * Text extraction and stripping booster rules.
 */
import { BoosterRule } from './types';

const extractEmailsRule: BoosterRule = {
  name: 'extract_emails',
  test: (i) => /^(?:extract|find|get|list)\s+emails?\s+(?:from|in)\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:extract|find|get|list)\s+emails?\s+(?:from|in)\s*:?\s+(.+)/i)!;
    const emails = m[1].match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    return emails ? emails.join(', ') : 'No emails found';
  },
};

const extractUrlsRule: BoosterRule = {
  name: 'extract_urls',
  test: (i) => /^(?:extract|find|get|list)\s+urls?\s+(?:from|in)\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:extract|find|get|list)\s+urls?\s+(?:from|in)\s*:?\s+(.+)/i)!;
    const urls = m[1].match(/https?:\/\/[^\s,)>"']+/g);
    return urls ? urls.join(', ') : 'No URLs found';
  },
};

const extractNumbersRule: BoosterRule = {
  name: 'extract_numbers',
  test: (i) => /^(?:extract|find|get|list)\s+numbers?\s+(?:from|in)\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:extract|find|get|list)\s+numbers?\s+(?:from|in)\s*:?\s+(.+)/i)!;
    const nums = m[1].match(/-?\d+\.?\d*/g);
    return nums ? nums.join(', ') : 'No numbers found';
  },
};

const markdownStripRule: BoosterRule = {
  name: 'markdown_strip',
  test: (i) => /^(?:strip|remove)\s+markdown\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:strip|remove)\s+markdown\s*:?\s+(.+)/i)!;
    return m[1]
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/!\[.*?\]\(.+?\)/g, '')
      .trim();
  },
};

const htmlStripRule: BoosterRule = {
  name: 'html_strip',
  test: (i) => /^(?:strip|remove)\s+html\s*:?\s+(.+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:strip|remove)\s+html\s*:?\s+(.+)/i)!;
    return m[1].replace(/<[^>]*>/g, '').trim();
  },
};

export const textRules: BoosterRule[] = [
  extractEmailsRule, extractUrlsRule, extractNumbersRule,
  markdownStripRule, htmlStripRule,
];
