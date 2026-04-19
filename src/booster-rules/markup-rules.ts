/** Markup transforms — markdown <-> html, csv parsing, JSON helpers. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const mdToHtml: BoosterRule = {
  name: 'md_to_html',
  test: (i) => /^markdown\s+to\s+html\s+([\s\S]+)/i.test(i) || /^md\s+to\s+html\s+([\s\S]+)/i.test(i),
  resolve: (i) => {
    let s = i.replace(/^(?:markdown|md)\s+to\s+html\s+/i, '');
    s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>')
         .replace(/^## (.+)$/gm, '<h2>$1</h2>')
         .replace(/^# (.+)$/gm, '<h1>$1</h1>')
         .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
         .replace(/\*([^*]+)\*/g, '<em>$1</em>')
         .replace(/`([^`]+)`/g, '<code>$1</code>')
         .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return s;
  },
};

const htmlEscape: BoosterRule = {
  name: 'html_escape',
  test: (i) => /^html\s+escape\s+(.+)/i.test(i),
  resolve: (i) => m(i, /^html\s+escape\s+(.+)/i)![1]
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
};

const htmlUnescape: BoosterRule = {
  name: 'html_unescape',
  test: (i) => /^html\s+unescape\s+(.+)/i.test(i),
  resolve: (i) => m(i, /^html\s+unescape\s+(.+)/i)![1]
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
};

const csvRowCount: BoosterRule = {
  name: 'csv_row_count',
  test: (i) => /^(?:count\s+)?csv\s+rows?\s+([\s\S]+)/i.test(i),
  resolve: (i) => String(m(i, /^(?:count\s+)?csv\s+rows?\s+([\s\S]+)/i)![1].trim().split(/\r?\n/).filter(Boolean).length),
};

const csvHeaders: BoosterRule = {
  name: 'csv_headers',
  test: (i) => /^csv\s+headers?\s+([\s\S]+)/i.test(i),
  resolve: (i) => m(i, /^csv\s+headers?\s+([\s\S]+)/i)![1].trim().split(/\r?\n/)[0].split(',').map((s) => s.trim()).join(', '),
};

const jsonPretty: BoosterRule = {
  name: 'json_pretty',
  test: (i) => /^pretty\s+json\s+([\s\S]+)/i.test(i),
  resolve: (i) => JSON.stringify(JSON.parse(m(i, /^pretty\s+json\s+([\s\S]+)/i)![1].trim()), null, 2),
};

const yamlMockToJson: BoosterRule = {
  name: 'simple_yaml_to_json',
  test: (i) => /^yaml\s+to\s+json\s+([\s\S]+)/i.test(i),
  resolve: (i) => {
    const lines = m(i, /^yaml\s+to\s+json\s+([\s\S]+)/i)![1].trim().split(/\r?\n/);
    const obj: Record<string, string> = {};
    for (const line of lines) {
      const mm = line.match(/^([\w.-]+)\s*:\s*(.+)$/);
      if (mm) obj[mm[1]] = mm[2].replace(/^['"]|['"]$/g, '');
    }
    return JSON.stringify(obj);
  },
};

const tableToCsv: BoosterRule = {
  name: 'md_table_to_csv',
  test: (i) => /^table\s+to\s+csv\s+([\s\S]+\|[\s\S]+)/i.test(i),
  resolve: (i) => {
    const lines = m(i, /^table\s+to\s+csv\s+([\s\S]+)/i)![1].trim().split(/\r?\n/)
      .filter((l) => l.includes('|') && !/^\s*\|?\s*[-:|\s]+\s*\|?\s*$/.test(l));
    return lines.map((l) => l.split('|').slice(1, -1).map((s) => s.trim()).join(',')).join('\n');
  },
};

export const markupRules: BoosterRule[] = [
  mdToHtml, htmlEscape, htmlUnescape,
  csvRowCount, csvHeaders, jsonPretty, yamlMockToJson, tableToCsv,
];
