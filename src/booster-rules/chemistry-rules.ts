/** Chemistry — element lookups, common molar masses. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const ELEMENT: Record<string, { name: string; n: number; mass: number }> = {
  H: { name: 'Hydrogen', n: 1, mass: 1.008 }, He: { name: 'Helium', n: 2, mass: 4.0026 },
  Li: { name: 'Lithium', n: 3, mass: 6.94 }, Be: { name: 'Beryllium', n: 4, mass: 9.012 },
  B: { name: 'Boron', n: 5, mass: 10.81 }, C: { name: 'Carbon', n: 6, mass: 12.011 },
  N: { name: 'Nitrogen', n: 7, mass: 14.007 }, O: { name: 'Oxygen', n: 8, mass: 15.999 },
  F: { name: 'Fluorine', n: 9, mass: 18.998 }, Ne: { name: 'Neon', n: 10, mass: 20.18 },
  Na: { name: 'Sodium', n: 11, mass: 22.99 }, Mg: { name: 'Magnesium', n: 12, mass: 24.305 },
  Al: { name: 'Aluminum', n: 13, mass: 26.982 }, Si: { name: 'Silicon', n: 14, mass: 28.085 },
  P: { name: 'Phosphorus', n: 15, mass: 30.974 }, S: { name: 'Sulfur', n: 16, mass: 32.06 },
  Cl: { name: 'Chlorine', n: 17, mass: 35.45 }, Ar: { name: 'Argon', n: 18, mass: 39.95 },
  K: { name: 'Potassium', n: 19, mass: 39.098 }, Ca: { name: 'Calcium', n: 20, mass: 40.078 },
  Fe: { name: 'Iron', n: 26, mass: 55.845 }, Cu: { name: 'Copper', n: 29, mass: 63.546 },
  Zn: { name: 'Zinc', n: 30, mass: 65.38 }, Ag: { name: 'Silver', n: 47, mass: 107.868 },
  Au: { name: 'Gold', n: 79, mass: 196.967 }, Hg: { name: 'Mercury', n: 80, mass: 200.59 },
  Pb: { name: 'Lead', n: 82, mass: 207.2 }, U: { name: 'Uranium', n: 92, mass: 238.029 },
};

const elementName: BoosterRule = {
  name: 'element_name',
  test: (i) => /^element\s+([A-Z][a-z]?)$/i.test(i),
  resolve: (i) => {
    const sym = m(i, /([A-Z][a-z]?)$/i)![1];
    const cap = sym[0].toUpperCase() + (sym[1] ?? '').toLowerCase();
    return ELEMENT[cap]?.name ?? 'unknown';
  },
};

const atomicNumber: BoosterRule = {
  name: 'atomic_number',
  test: (i) => /^atomic\s+number\s+(?:of\s+)?([A-Z][a-z]?)$/i.test(i),
  resolve: (i) => {
    const sym = m(i, /([A-Z][a-z]?)$/i)![1];
    const cap = sym[0].toUpperCase() + (sym[1] ?? '').toLowerCase();
    return ELEMENT[cap] ? String(ELEMENT[cap].n) : 'unknown';
  },
};

const atomicMass: BoosterRule = {
  name: 'atomic_mass',
  test: (i) => /^atomic\s+mass\s+(?:of\s+)?([A-Z][a-z]?)$/i.test(i),
  resolve: (i) => {
    const sym = m(i, /([A-Z][a-z]?)$/i)![1];
    const cap = sym[0].toUpperCase() + (sym[1] ?? '').toLowerCase();
    return ELEMENT[cap] ? String(ELEMENT[cap].mass) : 'unknown';
  },
};

const molarMass: BoosterRule = {
  name: 'molar_mass',
  test: (i) => /^molar\s+mass\s+(?:of\s+)?(.+)$/i.test(i),
  resolve: (i) => {
    const formula = m(i, /^molar\s+mass\s+(?:of\s+)?(.+)$/i)![1].trim();
    let total = 0;
    const atoms = formula.matchAll(/([A-Z][a-z]?)(\d*)/g);
    for (const [, sym, count] of atoms) {
      if (!sym) continue;
      const e = ELEMENT[sym];
      if (!e) return 'unknown element: ' + sym;
      total += e.mass * (count ? parseInt(count, 10) : 1);
    }
    return total > 0 ? `${total.toFixed(3)} g/mol` : 'invalid';
  },
};

const phLookup: BoosterRule = {
  name: 'ph_classify',
  test: (i) => /^ph\s+([\d.]+)$/i.test(i),
  resolve: (i) => {
    const ph = parseFloat(m(i, /([\d.]+)/)![1]);
    if (ph < 7) return `${ph} — acidic`;
    if (ph > 7) return `${ph} — basic`;
    return `${ph} — neutral`;
  },
};

export const chemistryRules: BoosterRule[] = [
  elementName, atomicNumber, atomicMass, molarMass, phLookup,
];
