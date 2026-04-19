/** Science / engineering rules. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const speedOfLight = 299_792_458;

const cToF: BoosterRule = {
  name: 'c_to_f',
  test: (i) => /^(-?[\d.]+)\s*°?\s*c\s+(?:to|in)\s+°?f/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /(-?[\d.]+)/)![1]) * 9 / 5 + 32).toFixed(2)} °F`,
};

const fToC: BoosterRule = {
  name: 'f_to_c',
  test: (i) => /^(-?[\d.]+)\s*°?\s*f\s+(?:to|in)\s+°?c/i.test(i),
  resolve: (i) => `${((parseFloat(m(i, /(-?[\d.]+)/)![1]) - 32) * 5 / 9).toFixed(2)} °C`,
};

const cToK: BoosterRule = {
  name: 'c_to_k',
  test: (i) => /^(-?[\d.]+)\s*°?\s*c\s+(?:to|in)\s+k/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /(-?[\d.]+)/)![1]) + 273.15).toFixed(2)} K`,
};

const kmToMi: BoosterRule = {
  name: 'km_to_mi',
  test: (i) => /^([\d.]+)\s*km\s+(?:to|in)\s+(?:mi|miles)/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /([\d.]+)/)![1]) * 0.621371).toFixed(2)} mi`,
};

const miToKm: BoosterRule = {
  name: 'mi_to_km',
  test: (i) => /^([\d.]+)\s*(?:mi|miles)\s+(?:to|in)\s+km/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /([\d.]+)/)![1]) * 1.60934).toFixed(2)} km`,
};

const mToFt: BoosterRule = {
  name: 'm_to_ft',
  test: (i) => /^([\d.]+)\s*m\s+(?:to|in)\s+(?:ft|feet)/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /([\d.]+)/)![1]) * 3.28084).toFixed(2)} ft`,
};

const kgToLb: BoosterRule = {
  name: 'kg_to_lb',
  test: (i) => /^([\d.]+)\s*kg\s+(?:to|in)\s+(?:lb|lbs|pounds)/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /([\d.]+)/)![1]) * 2.20462).toFixed(2)} lb`,
};

const lbToKg: BoosterRule = {
  name: 'lb_to_kg',
  test: (i) => /^([\d.]+)\s*(?:lb|lbs|pounds)\s+(?:to|in)\s+kg/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /([\d.]+)/)![1]) * 0.453592).toFixed(2)} kg`,
};

const energyToJ: BoosterRule = {
  name: 'kwh_to_j',
  test: (i) => /^([\d.]+)\s*kwh\s+(?:to|in)\s+j(?:oules)?/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /([\d.]+)/)![1]) * 3_600_000).toExponential(3)} J`,
};

const distanceLightSec: BoosterRule = {
  name: 'distance_light_seconds',
  test: (i) => /^(?:distance\s+)?(\d+(?:\.\d+)?)\s+light[-\s]seconds?/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /([\d.]+)/)![1]) * speedOfLight / 1000).toLocaleString()} km`,
};

const bmiCalc: BoosterRule = {
  name: 'bmi',
  test: (i) => /^bmi\s+(?:weight\s+)?([\d.]+)\s*kg\s+(?:height\s+)?([\d.]+)\s*m/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s*kg\s+(?:height\s+)?([\d.]+)\s*m/i)!;
    return (parseFloat(mm[1]) / Math.pow(parseFloat(mm[2]), 2)).toFixed(1);
  },
};

const speedToMph: BoosterRule = {
  name: 'kmh_to_mph',
  test: (i) => /^([\d.]+)\s*km\/?h\s+(?:to|in)\s+mph/i.test(i),
  resolve: (i) => `${(parseFloat(m(i, /([\d.]+)/)![1]) * 0.621371).toFixed(2)} mph`,
};

export const scienceRules: BoosterRule[] = [
  cToF, fToC, cToK, kmToMi, miToKm, mToFt,
  kgToLb, lbToKg, energyToJ, distanceLightSec, bmiCalc, speedToMph,
];
