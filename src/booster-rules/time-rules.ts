/** Time / duration / relative-date rules. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const daysAgo: BoosterRule = {
  name: 'days_ago',
  test: (i) => /^(\d+)\s+days?\s+ago/i.test(i),
  resolve: (i) => {
    const n = parseInt(m(i, /(\d+)/)![1], 10);
    const d = new Date(Date.now() - n * 86400000);
    return d.toISOString().slice(0, 10);
  },
};

const daysFromNow: BoosterRule = {
  name: 'days_from_now',
  test: (i) => /^(\d+)\s+days?\s+from\s+now/i.test(i),
  resolve: (i) => {
    const n = parseInt(m(i, /(\d+)/)![1], 10);
    return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  },
};

const dayOfWeek: BoosterRule = {
  name: 'day_of_week',
  test: (i) => /^(?:what\s+)?day\s+(?:of\s+(?:the\s+)?week\s+)?(?:is\s+|was\s+)?(\d{4}-\d{2}-\d{2})/i.test(i),
  resolve: (i) => {
    const dt = new Date(m(i, /(\d{4}-\d{2}-\d{2})/)![1]);
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getUTCDay()];
  },
};

const daysBetween: BoosterRule = {
  name: 'days_between',
  test: (i) => /^days?\s+between\s+(\d{4}-\d{2}-\d{2})\s+and\s+(\d{4}-\d{2}-\d{2})/i.test(i),
  resolve: (i) => {
    const [a, b] = m(i, /(\d{4}-\d{2}-\d{2})\s+and\s+(\d{4}-\d{2}-\d{2})/)!.slice(1).map((s) => new Date(s).getTime());
    return String(Math.round(Math.abs(b - a) / 86400000));
  },
};

const isLeapYear: BoosterRule = {
  name: 'is_leap_year',
  test: (i) => /^is\s+(\d{4})\s+(?:a\s+)?leap\s+year/i.test(i),
  resolve: (i) => {
    const y = parseInt(m(i, /(\d{4})/)![1], 10);
    return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 'Yes' : 'No';
  },
};

const epochToIso: BoosterRule = {
  name: 'epoch_to_iso',
  test: (i) => /^(?:convert\s+)?epoch\s+(\d{10,13})\s+to\s+iso/i.test(i),
  resolve: (i) => {
    let n = parseInt(m(i, /(\d{10,13})/)![1], 10);
    if (n < 1e12) n *= 1000;
    return new Date(n).toISOString();
  },
};

const isoToEpoch: BoosterRule = {
  name: 'iso_to_epoch',
  test: (i) => /^(?:convert\s+)?(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?)\s+to\s+epoch/i.test(i),
  resolve: (i) => String(Math.floor(new Date(m(i, /(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?)/)![1]).getTime() / 1000)),
};

const ageInYears: BoosterRule = {
  name: 'age_in_years',
  test: (i) => /^age\s+(?:of\s+)?(\d{4}-\d{2}-\d{2})/i.test(i),
  resolve: (i) => {
    const dob = new Date(m(i, /(\d{4}-\d{2}-\d{2})/)![1]);
    const ms = Date.now() - dob.getTime();
    return String(Math.floor(ms / (365.25 * 86400000)));
  },
};

const durationFormat: BoosterRule = {
  name: 'duration_format',
  test: (i) => /^(?:format\s+)?(?:duration\s+)?(\d+)\s+(?:seconds?|s)$/i.test(i),
  resolve: (i) => {
    let s = parseInt(m(i, /(\d+)/)![1], 10);
    const h = Math.floor(s / 3600); s %= 3600;
    const min = Math.floor(s / 60); s %= 60;
    return [h, min, s].map((n) => String(n).padStart(2, '0')).join(':');
  },
};

const minutesToHours: BoosterRule = {
  name: 'minutes_to_hours',
  test: (i) => /^(\d+)\s+minutes?\s+(?:in|to)\s+hours/i.test(i),
  resolve: (i) => (parseInt(m(i, /(\d+)/)![1], 10) / 60).toFixed(2),
};

const startOfWeek: BoosterRule = {
  name: 'start_of_week',
  test: (i) => /^start\s+of\s+(?:current\s+)?week/i.test(i),
  resolve: () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.toISOString().slice(0, 10);
  },
};

const monthName: BoosterRule = {
  name: 'month_name',
  test: (i) => /^month\s+name\s+(?:of\s+)?(\d{1,2})/i.test(i),
  resolve: (i) => {
    const n = parseInt(m(i, /(\d{1,2})/)![1], 10);
    return ['January','February','March','April','May','June','July','August','September','October','November','December'][n - 1] ?? 'invalid';
  },
};

export const timeRules: BoosterRule[] = [
  daysAgo, daysFromNow, dayOfWeek, daysBetween, isLeapYear,
  epochToIso, isoToEpoch, ageInYears, durationFormat,
  minutesToHours, startOfWeek, monthName,
];
