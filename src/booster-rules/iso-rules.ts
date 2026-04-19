/** ISO code lookups — country, currency, language, timezone. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const COUNTRY: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', FR: 'France', DE: 'Germany',
  IT: 'Italy', ES: 'Spain', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway',
  DK: 'Denmark', FI: 'Finland', PL: 'Poland', JP: 'Japan', CN: 'China',
  KR: 'South Korea', IN: 'India', BR: 'Brazil', MX: 'Mexico', CA: 'Canada',
  AU: 'Australia', NZ: 'New Zealand', IL: 'Israel', AE: 'UAE', SA: 'Saudi Arabia',
  ZA: 'South Africa', EG: 'Egypt', SG: 'Singapore', HK: 'Hong Kong', TW: 'Taiwan',
};
const CURRENCY: Record<string, string> = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'Pound Sterling', JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan', CHF: 'Swiss Franc', CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar', NZD: 'New Zealand Dollar', SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone', DKK: 'Danish Krone', INR: 'Indian Rupee',
  KRW: 'South Korean Won', BRL: 'Brazilian Real', MXN: 'Mexican Peso',
  ILS: 'Israeli Shekel', AED: 'UAE Dirham', SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar', TWD: 'Taiwan Dollar', ZAR: 'South African Rand',
  PLN: 'Polish Zloty',
};
const LANG: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', hi: 'Hindi', bn: 'Bengali', he: 'Hebrew', tr: 'Turkish',
  pl: 'Polish', nl: 'Dutch', sv: 'Swedish', da: 'Danish', no: 'Norwegian',
  fi: 'Finnish', cs: 'Czech', el: 'Greek', th: 'Thai', vi: 'Vietnamese',
};
const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', CHF: 'Fr',
  ILS: '₪', INR: '₹', KRW: '₩', RUB: '₽', BTC: '₿',
};

const countryRule: BoosterRule = {
  name: 'country_from_iso',
  test: (i) => /^country\s+(?:for\s+|of\s+)?([A-Z]{2})$/i.test(i),
  resolve: (i) => COUNTRY[m(i, /([A-Za-z]{2})$/)![1].toUpperCase()] ?? 'unknown',
};

const currencyRule: BoosterRule = {
  name: 'currency_from_code',
  test: (i) => /^currency\s+(?:for\s+|of\s+)?([A-Z]{3})$/i.test(i),
  resolve: (i) => CURRENCY[m(i, /([A-Za-z]{3})$/)![1].toUpperCase()] ?? 'unknown',
};

const symbolRule: BoosterRule = {
  name: 'currency_symbol',
  test: (i) => /^symbol\s+(?:for\s+)?([A-Z]{3})$/i.test(i),
  resolve: (i) => CURRENCY_SYMBOL[m(i, /([A-Za-z]{3})$/)![1].toUpperCase()] ?? '?',
};

const langRule: BoosterRule = {
  name: 'language_from_iso',
  test: (i) => /^language\s+(?:for\s+|of\s+)?([a-z]{2})$/i.test(i),
  resolve: (i) => LANG[m(i, /([A-Za-z]{2})$/)![1].toLowerCase()] ?? 'unknown',
};

const continentRule: BoosterRule = {
  name: 'continent_from_country',
  test: (i) => /^continent\s+(?:for\s+|of\s+)?([A-Z]{2})$/i.test(i),
  resolve: (i) => {
    const c = m(i, /([A-Za-z]{2})$/)![1].toUpperCase();
    const map: Record<string, string> = {
      US: 'North America', CA: 'North America', MX: 'North America',
      BR: 'South America', AR: 'South America', CL: 'South America',
      GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe',
      NL: 'Europe', SE: 'Europe', NO: 'Europe', DK: 'Europe', PL: 'Europe',
      CN: 'Asia', JP: 'Asia', KR: 'Asia', IN: 'Asia', SG: 'Asia',
      AU: 'Oceania', NZ: 'Oceania',
      ZA: 'Africa', EG: 'Africa', NG: 'Africa', KE: 'Africa',
      IL: 'Asia', AE: 'Asia', SA: 'Asia',
    };
    return map[c] ?? 'unknown';
  },
};

const tzOffsetRule: BoosterRule = {
  name: 'tz_offset',
  test: (i) => /^(?:utc|tz|timezone)\s+offset\s+(?:for\s+|of\s+)?([A-Za-z\/_]+)$/i.test(i),
  resolve: (i) => {
    const tz = m(i, /([A-Za-z\/_]+)$/)![1];
    try {
      const fmt = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' });
      return fmt.formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? 'unknown';
    } catch { return 'invalid timezone'; }
  },
};

const callingCodeRule: BoosterRule = {
  name: 'calling_code',
  test: (i) => /^(?:phone|calling|dial)\s+code\s+(?:for\s+)?([A-Z]{2})$/i.test(i),
  resolve: (i) => {
    const map: Record<string, string> = {
      US: '+1', CA: '+1', GB: '+44', FR: '+33', DE: '+49', IT: '+39', ES: '+34',
      NL: '+31', SE: '+46', NO: '+47', DK: '+45', JP: '+81', CN: '+86', KR: '+82',
      IN: '+91', BR: '+55', MX: '+52', AU: '+61', NZ: '+64', IL: '+972', AE: '+971',
      SA: '+966', SG: '+65', HK: '+852', TW: '+886', ZA: '+27',
    };
    return map[m(i, /([A-Za-z]{2})$/)![1].toUpperCase()] ?? 'unknown';
  },
};

export const isoRules: BoosterRule[] = [
  countryRule, currencyRule, symbolRule, langRule,
  continentRule, tzOffsetRule, callingCodeRule,
];
