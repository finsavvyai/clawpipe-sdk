/** Finance booster rules — tips, splits, markup, compound interest. */
import { BoosterRule } from './types';

const tipRule: BoosterRule = {
  name: 'tip',
  test: (i) => /^(?:what is\s+)?(\d+)%\s+tip\s+on\s+\$?([\d.]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:what is\s+)?(\d+)%\s+tip\s+on\s+\$?([\d.]+)/i)!;
    return `$${(parseFloat(m[2]) * parseInt(m[1], 10) / 100).toFixed(2)}`;
  },
};

const splitBillRule: BoosterRule = {
  name: 'split_bill',
  test: (i) => /^split\s+\$?([\d.]+)\s+(?:by|between|among)\s+(\d+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^split\s+\$?([\d.]+)\s+(?:by|between|among)\s+(\d+)/i)!;
    return `$${(parseFloat(m[1]) / parseInt(m[2], 10)).toFixed(2)}`;
  },
};

const markupRule: BoosterRule = {
  name: 'markup',
  test: (i) => /^(\d+)%\s+markup\s+on\s+\$?([\d.]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(\d+)%\s+markup\s+on\s+\$?([\d.]+)/i)!;
    return `$${(parseFloat(m[2]) * (1 + parseInt(m[1], 10) / 100)).toFixed(2)}`;
  },
};

const discountRule: BoosterRule = {
  name: 'discount',
  test: (i) => /^(\d+)%\s+(?:off|discount)\s+(?:on\s+)?\$?([\d.]+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(\d+)%\s+(?:off|discount)\s+(?:on\s+)?\$?([\d.]+)/i)!;
    return `$${(parseFloat(m[2]) * (1 - parseInt(m[1], 10) / 100)).toFixed(2)}`;
  },
};

const compoundInterestRule: BoosterRule = {
  name: 'compound_interest',
  test: (i) => /^compound\s+interest\s+\$?([\d.]+)\s+at\s+([\d.]+)%\s+for\s+(\d+)\s+years?/i.test(i),
  resolve: (i) => {
    const m = i.match(/^compound\s+interest\s+\$?([\d.]+)\s+at\s+([\d.]+)%\s+for\s+(\d+)\s+years?/i)!;
    const p = parseFloat(m[1]);
    const r = parseFloat(m[2]) / 100;
    const t = parseInt(m[3], 10);
    return `$${(p * Math.pow(1 + r, t)).toFixed(2)}`;
  },
};

const simpleInterestRule: BoosterRule = {
  name: 'simple_interest',
  test: (i) => /^simple\s+interest\s+\$?([\d.]+)\s+at\s+([\d.]+)%\s+for\s+(\d+)\s+years?/i.test(i),
  resolve: (i) => {
    const m = i.match(/^simple\s+interest\s+\$?([\d.]+)\s+at\s+([\d.]+)%\s+for\s+(\d+)\s+years?/i)!;
    return `$${(parseFloat(m[1]) * parseFloat(m[2]) / 100 * parseInt(m[3], 10)).toFixed(2)}`;
  },
};

export const financeRules: BoosterRule[] = [
  tipRule, splitBillRule, markupRule,
  discountRule, compoundInterestRule, simpleInterestRule,
];
