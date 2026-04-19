/** Color conversion booster rules. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

const hexToRgbRule: BoosterRule = {
  name: 'hex_to_rgb',
  test: (i) => /^(?:convert\s+)?#?[0-9a-f]{3,6}\s+to\s+rgb/i.test(i) || /^hex\s+(?:to\s+)?rgb\s+#?([0-9a-f]{3,6})/i.test(i),
  resolve: (i) => {
    const mm = m(i, /#?([0-9a-f]{3,6})/i)!;
    const rgb = hexToRgb(mm[1]);
    return rgb ? `rgb(${rgb.join(', ')})` : 'invalid';
  },
};

const rgbToHexRule: BoosterRule = {
  name: 'rgb_to_hex',
  test: (i) => /^(?:convert\s+)?rgb\s*\(?\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*\)?\s+to\s+hex/i.test(i),
  resolve: (i) => {
    const mm = m(i, /(\d+)[,\s]+(\d+)[,\s]+(\d+)/)!;
    return rgbToHex(+mm[1], +mm[2], +mm[3]);
  },
};

const rgbToHslRule: BoosterRule = {
  name: 'rgb_to_hsl',
  test: (i) => /^(?:convert\s+)?rgb\s*\(?\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*\)?\s+to\s+hsl/i.test(i),
  resolve: (i) => {
    const mm = m(i, /(\d+)[,\s]+(\d+)[,\s]+(\d+)/)!;
    const [h, s, l] = rgbToHsl(+mm[1], +mm[2], +mm[3]);
    return `hsl(${h}, ${s}%, ${l}%)`;
  },
};

const luminance: BoosterRule = {
  name: 'luminance',
  test: (i) => /^luminance\s+(?:of\s+)?#?([0-9a-f]{3,6})/i.test(i),
  resolve: (i) => {
    const rgb = hexToRgb(m(i, /#?([0-9a-f]{3,6})/i)![1]);
    if (!rgb) return 'invalid';
    const [r, g, b] = rgb.map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return (0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(4);
  },
};

const colorInvert: BoosterRule = {
  name: 'color_invert',
  test: (i) => /^invert\s+(?:color\s+)?#?([0-9a-f]{3,6})/i.test(i),
  resolve: (i) => {
    const rgb = hexToRgb(m(i, /#?([0-9a-f]{3,6})/i)![1]);
    return rgb ? rgbToHex(255 - rgb[0], 255 - rgb[1], 255 - rgb[2]) : 'invalid';
  },
};

const namedColor: BoosterRule = {
  name: 'named_color',
  test: (i) => /^(?:hex\s+for\s+|color\s+)(black|white|red|green|blue|yellow|cyan|magenta|orange|purple|gray|grey)/i.test(i),
  resolve: (i) => {
    const map: Record<string, string> = {
      black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
      blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
      orange: '#ffa500', purple: '#800080', gray: '#808080', grey: '#808080',
    };
    return map[m(i, /(black|white|red|green|blue|yellow|cyan|magenta|orange|purple|gray|grey)/i)![1].toLowerCase()];
  },
};

export const colorRules: BoosterRule[] = [
  hexToRgbRule, rgbToHexRule, rgbToHslRule,
  luminance, colorInvert, namedColor,
];
