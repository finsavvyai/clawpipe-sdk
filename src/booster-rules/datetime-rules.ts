/**
 * Date/time computation booster rules.
 */
import { BoosterRule } from './types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseDate(s: string): Date {
  const d = new Date(s.trim());
  if (isNaN(d.getTime())) throw new Error('Invalid date');
  return d;
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.round(ms / 86_400_000);
}

const daysBetweenRule: BoosterRule = {
  name: 'days_between',
  test: (i) => /^(?:days between|how many days between|difference between)\s+(\S+)\s+and\s+(\S+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:days between|how many days between|difference between)\s+(\S+)\s+and\s+(\S+)/i)!;
    return String(daysBetween(parseDate(m[1]), parseDate(m[2])));
  },
};

const addDaysRule: BoosterRule = {
  name: 'add_days',
  test: (i) => /^add\s+(\d+)\s+days?\s+to\s+(\S+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^add\s+(\d+)\s+days?\s+to\s+(\S+)/i)!;
    const d = parseDate(m[2]);
    d.setDate(d.getDate() + parseInt(m[1], 10));
    return d.toISOString().slice(0, 10);
  },
};

const dayOfWeekRule: BoosterRule = {
  name: 'day_of_week',
  test: (i) => /^(?:what day is|day of week for|which day is)\s+(\S+)/i.test(i),
  resolve: (i) => {
    const m = i.match(/^(?:what day is|day of week for|which day is)\s+(\S+)/i)!;
    return DAYS[parseDate(m[1]).getUTCDay()];
  },
};

const isWeekendRule: BoosterRule = {
  name: 'is_weekend',
  test: (i) => /^is\s+(\S+)\s+a?\s*weekend/i.test(i),
  resolve: (i) => {
    const m = i.match(/^is\s+(\S+)\s+a?\s*weekend/i)!;
    const d = parseDate(m[1]);
    const day = d.getUTCDay();
    const name = DAYS[day];
    return (day === 0 || day === 6) ? `Yes, it's ${name}` : `No, it's ${name}`;
  },
};

export const datetimeRules: BoosterRule[] = [
  daysBetweenRule, addDaysRule, dayOfWeekRule, isWeekendRule,
];
