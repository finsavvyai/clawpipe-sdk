/** Geometry — area, perimeter, volume of common shapes. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);
const PI = Math.PI;

const areaCircle: BoosterRule = {
  name: 'area_circle',
  test: (i) => /^area\s+(?:of\s+)?circle\s+(?:radius\s+)?([\d.]+)/i.test(i),
  resolve: (i) => (PI * Math.pow(parseFloat(m(i, /([\d.]+)/)![1]), 2)).toFixed(4),
};

const circumference: BoosterRule = {
  name: 'circumference',
  test: (i) => /^circumference\s+(?:of\s+circle\s+)?(?:radius\s+)?([\d.]+)/i.test(i),
  resolve: (i) => (2 * PI * parseFloat(m(i, /([\d.]+)/)![1])).toFixed(4),
};

const areaSquare: BoosterRule = {
  name: 'area_square',
  test: (i) => /^area\s+(?:of\s+)?square\s+(?:side\s+)?([\d.]+)/i.test(i),
  resolve: (i) => Math.pow(parseFloat(m(i, /([\d.]+)/)![1]), 2).toString(),
};

const areaRect: BoosterRule = {
  name: 'area_rectangle',
  test: (i) => /^area\s+(?:of\s+)?rect(?:angle)?\s+([\d.]+)\s+(?:x|by|times)\s+([\d.]+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s+(?:x|by|times)\s+([\d.]+)/i)!;
    return String(parseFloat(mm[1]) * parseFloat(mm[2]));
  },
};

const areaTriangle: BoosterRule = {
  name: 'area_triangle',
  test: (i) => /^area\s+(?:of\s+)?triangle\s+(?:base\s+)?([\d.]+)\s+(?:height\s+)?([\d.]+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s+(?:height\s+)?([\d.]+)/)!;
    return (0.5 * parseFloat(mm[1]) * parseFloat(mm[2])).toString();
  },
};

const volumeCube: BoosterRule = {
  name: 'volume_cube',
  test: (i) => /^volume\s+(?:of\s+)?cube\s+(?:side\s+)?([\d.]+)/i.test(i),
  resolve: (i) => Math.pow(parseFloat(m(i, /([\d.]+)/)![1]), 3).toString(),
};

const volumeSphere: BoosterRule = {
  name: 'volume_sphere',
  test: (i) => /^volume\s+(?:of\s+)?sphere\s+(?:radius\s+)?([\d.]+)/i.test(i),
  resolve: (i) => ((4 / 3) * PI * Math.pow(parseFloat(m(i, /([\d.]+)/)![1]), 3)).toFixed(4),
};

const volumeCyl: BoosterRule = {
  name: 'volume_cylinder',
  test: (i) => /^volume\s+(?:of\s+)?cylinder\s+(?:radius\s+)?([\d.]+)\s+(?:height\s+)?([\d.]+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s+(?:height\s+)?([\d.]+)/)!;
    return (PI * Math.pow(parseFloat(mm[1]), 2) * parseFloat(mm[2])).toFixed(4);
  },
};

const pythag: BoosterRule = {
  name: 'pythagorean',
  test: (i) => /^hypotenuse\s+(?:of\s+)?(?:legs?\s+)?([\d.]+)\s+(?:and\s+)?([\d.]+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /([\d.]+)\s+(?:and\s+)?([\d.]+)/)!;
    return Math.sqrt(Math.pow(parseFloat(mm[1]), 2) + Math.pow(parseFloat(mm[2]), 2)).toFixed(4);
  },
};

const radDeg: BoosterRule = {
  name: 'rad_to_deg',
  test: (i) => /^([\d.]+)\s*rad\s+(?:to|in)\s+deg/i.test(i),
  resolve: (i) => (parseFloat(m(i, /([\d.]+)/)![1]) * 180 / PI).toFixed(4),
};

const degRad: BoosterRule = {
  name: 'deg_to_rad',
  test: (i) => /^([\d.]+)\s*deg\s+(?:to|in)\s+rad/i.test(i),
  resolve: (i) => (parseFloat(m(i, /([\d.]+)/)![1]) * PI / 180).toFixed(4),
};

export const geometryRules: BoosterRule[] = [
  areaCircle, circumference, areaSquare, areaRect, areaTriangle,
  volumeCube, volumeSphere, volumeCyl, pythag, radDeg, degRad,
];
