/** Extra finance — sales tax, EMI, ROI, currency unit conversion. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const salesTax: BoosterRule = {
  name: 'sales_tax',
  test: (i) => /^(?:sales\s+)?tax\s+([\d.]+)%\s+on\s+\$?([\d.]+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)%\s+on\s+\$?([\d.]+)/i)!;
    return `$${(parseFloat(mm[2]) * parseFloat(mm[1]) / 100).toFixed(2)}`;
  },
};

const totalWithTax: BoosterRule = {
  name: 'total_with_tax',
  test: (i) => /^total\s+\$?([\d.]+)\s+plus\s+([\d.]+)%/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\$?([\d.]+)\s+plus\s+([\d.]+)%/i)!;
    return `$${(parseFloat(mm[1]) * (1 + parseFloat(mm[2]) / 100)).toFixed(2)}`;
  },
};

const emiCalc: BoosterRule = {
  name: 'emi',
  test: (i) => /^emi\s+(?:principal\s+)?\$?([\d.]+)\s+(?:rate\s+)?([\d.]+)%\s+(?:term\s+|months\s+)?(\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\$?([\d.]+)\s+(?:rate\s+)?([\d.]+)%\s+(?:term\s+|months\s+)?(\d+)/i)!;
    const p = parseFloat(mm[1]); const r = parseFloat(mm[2]) / 100 / 12; const n = parseInt(mm[3], 10);
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return `$${emi.toFixed(2)}/mo`;
  },
};

const roi: BoosterRule = {
  name: 'roi',
  test: (i) => /^roi\s+(?:gain\s+)?\$?(-?[\d.]+)\s+(?:cost\s+)?\$?([\d.]+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\$?(-?[\d.]+)\s+(?:cost\s+)?\$?([\d.]+)/i)!;
    return `${(parseFloat(mm[1]) / parseFloat(mm[2]) * 100).toFixed(2)}%`;
  },
};

const cagr: BoosterRule = {
  name: 'cagr',
  test: (i) => /^cagr\s+(?:start\s+)?\$?([\d.]+)\s+(?:end\s+)?\$?([\d.]+)\s+(?:years?\s+)?(\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\$?([\d.]+)\s+(?:end\s+)?\$?([\d.]+)\s+(?:years?\s+)?(\d+)/i)!;
    return `${((Math.pow(parseFloat(mm[2]) / parseFloat(mm[1]), 1 / parseInt(mm[3], 10)) - 1) * 100).toFixed(2)}%`;
  },
};

const annuity: BoosterRule = {
  name: 'annuity_future',
  test: (i) => /^annuity\s+(?:payment\s+)?\$?([\d.]+)\s+(?:rate\s+)?([\d.]+)%\s+(?:years?\s+)?(\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\$?([\d.]+)\s+(?:rate\s+)?([\d.]+)%\s+(?:years?\s+)?(\d+)/i)!;
    const pmt = parseFloat(mm[1]); const r = parseFloat(mm[2]) / 100; const n = parseInt(mm[3], 10);
    const fv = pmt * ((Math.pow(1 + r, n) - 1) / r);
    return `$${fv.toFixed(2)}`;
  },
};

const breakEven: BoosterRule = {
  name: 'break_even_units',
  test: (i) => /^break\s*even\s+(?:fixed\s+)?\$?([\d.]+)\s+(?:price\s+)?\$?([\d.]+)\s+(?:cost\s+)?\$?([\d.]+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /\$?([\d.]+)\s+(?:price\s+)?\$?([\d.]+)\s+(?:cost\s+)?\$?([\d.]+)/i)!;
    const fixed = parseFloat(mm[1]); const price = parseFloat(mm[2]); const cost = parseFloat(mm[3]);
    return `${Math.ceil(fixed / (price - cost))} units`;
  },
};

export const financeExtraRules: BoosterRule[] = [
  salesTax, totalWithTax, emiCalc, roi, cagr, annuity, breakEven,
];
