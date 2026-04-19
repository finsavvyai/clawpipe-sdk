/** Physics constants and quick formulas. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const constant: BoosterRule = {
  name: 'physics_constant',
  test: (i) => /^constant\s+(speed\s+of\s+light|gravity|planck|avogadro|boltzmann|gas|coulomb|electron\s+charge|electron\s+mass|proton\s+mass|stefan)/i.test(i),
  resolve: (i) => {
    const map: Record<string, string> = {
      'speed of light': '299,792,458 m/s',
      'gravity': '9.80665 m/s²',
      'planck': '6.62607015e-34 J·s',
      'avogadro': '6.02214076e23 /mol',
      'boltzmann': '1.380649e-23 J/K',
      'gas': '8.314462618 J/(mol·K)',
      'coulomb': '8.987551787e9 N·m²/C²',
      'electron charge': '1.602176634e-19 C',
      'electron mass': '9.1093837015e-31 kg',
      'proton mass': '1.67262192369e-27 kg',
      'stefan': '5.670374419e-8 W/(m²·K⁴)',
    };
    return map[m(i, /(speed\s+of\s+light|gravity|planck|avogadro|boltzmann|gas|coulomb|electron\s+charge|electron\s+mass|proton\s+mass|stefan)/i)![1].toLowerCase()] ?? 'unknown';
  },
};

const force: BoosterRule = {
  name: 'force_ma',
  test: (i) => /^force\s+(?:mass\s+)?([\d.]+)\s*kg\s+(?:accel(?:eration)?\s+)?([\d.]+)\s*m\/s/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s*kg\s+(?:accel(?:eration)?\s+)?([\d.]+)/i)!;
    return `${(parseFloat(mm[1]) * parseFloat(mm[2])).toFixed(4)} N`;
  },
};

const kinetic: BoosterRule = {
  name: 'kinetic_energy',
  test: (i) => /^(?:ke|kinetic\s+energy)\s+(?:mass\s+)?([\d.]+)\s*kg\s+(?:velocity\s+|speed\s+)?([\d.]+)\s*m\/s/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s*kg\s+(?:velocity\s+|speed\s+)?([\d.]+)/i)!;
    return `${(0.5 * parseFloat(mm[1]) * Math.pow(parseFloat(mm[2]), 2)).toFixed(4)} J`;
  },
};

const potentialEnergy: BoosterRule = {
  name: 'potential_energy',
  test: (i) => /^(?:pe|potential\s+energy)\s+(?:mass\s+)?([\d.]+)\s*kg\s+(?:height\s+)?([\d.]+)\s*m/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s*kg\s+(?:height\s+)?([\d.]+)/i)!;
    return `${(parseFloat(mm[1]) * 9.80665 * parseFloat(mm[2])).toFixed(4)} J`;
  },
};

const ohmsLaw: BoosterRule = {
  name: 'ohms_law',
  test: (i) => /^(?:ohms?\s+law\s+)?voltage\s+(?:current\s+)?([\d.]+)\s*a\s+(?:resistance\s+)?([\d.]+)\s*(?:ohm|ω)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s*a\s+(?:resistance\s+)?([\d.]+)/i)!;
    return `${(parseFloat(mm[1]) * parseFloat(mm[2])).toFixed(4)} V`;
  },
};

const wavelengthFreq: BoosterRule = {
  name: 'wavelength_from_freq',
  test: (i) => /^wavelength\s+(?:of\s+)?([\d.]+)\s*hz/i.test(i),
  resolve: (i) => `${(299792458 / parseFloat(m(i, /([\d.]+)/)![1])).toExponential(4)} m`,
};

const freqWavelength: BoosterRule = {
  name: 'frequency_from_wavelength',
  test: (i) => /^frequency\s+(?:of\s+)?([\d.]+)\s*m/i.test(i),
  resolve: (i) => `${(299792458 / parseFloat(m(i, /([\d.]+)/)![1])).toExponential(4)} Hz`,
};

export const physicsRules: BoosterRule[] = [
  constant, force, kinetic, potentialEnergy, ohmsLaw,
  wavelengthFreq, freqWavelength,
];
