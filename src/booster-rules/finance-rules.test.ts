import { describe, it, expect } from 'vitest';
import { financeRules } from './finance-rules';

const find = (name: string) => financeRules.find((r) => r.name === name)!;

describe('financeRules', () => {
  it('tip', () => expect(find('tip').resolve('20% tip on $50')).toBe('$10.00'));
  it('split_bill', () => expect(find('split_bill').resolve('split $100 by 4')).toBe('$25.00'));
  it('markup', () => expect(find('markup').resolve('25% markup on $80')).toBe('$100.00'));
  it('discount', () => expect(find('discount').resolve('30% off $200')).toBe('$140.00'));
  it('compound_interest', () => expect(find('compound_interest').resolve('compound interest $1000 at 5% for 10 years')).toBe('$1628.89'));
  it('simple_interest', () => expect(find('simple_interest').resolve('simple interest $1000 at 5% for 10 years')).toBe('$500.00'));
});
