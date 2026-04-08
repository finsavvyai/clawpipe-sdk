/**
 * Safe math expression evaluator — recursive descent parser.
 * No eval() or new Function(). Supports +, -, *, /, %, ** and parentheses.
 */

export function safeEvalMath(expr: string): number {
  let pos = 0;
  const ch = () => expr[pos] ?? '';
  const skip = () => { while (ch() === ' ') pos++; };

  const parseNumber = (): number => {
    skip();
    let num = '';
    if (ch() === '-') { num += '-'; pos++; }
    while (/[\d.]/.test(ch())) { num += ch(); pos++; }
    if (!num || num === '-') throw new Error('Expected number');
    return parseFloat(num);
  };

  const parseFactor = (): number => {
    skip();
    if (ch() === '(') {
      pos++;
      const val = parseExpr();
      skip();
      if (ch() === ')') pos++;
      return val;
    }
    return parseNumber();
  };

  const parsePower = (): number => {
    let base = parseFactor();
    skip();
    if (expr.slice(pos, pos + 2) === '**') {
      pos += 2;
      base = Math.pow(base, parsePower());
    }
    return base;
  };

  const parseTerm = (): number => {
    let val = parsePower();
    skip();
    while (ch() === '*' || ch() === '/' || ch() === '%') {
      const op = ch(); pos++;
      if (op === '*' && ch() === '*') { pos--; break; }
      const right = parsePower();
      if (op === '*') val *= right;
      else if (op === '/') val /= right;
      else val %= right;
      skip();
    }
    return val;
  };

  const parseExpr = (): number => {
    let val = parseTerm();
    skip();
    while (ch() === '+' || ch() === '-') {
      const op = ch(); pos++;
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
      skip();
    }
    return val;
  };

  const result = parseExpr();
  skip();
  if (pos < expr.length) throw new Error('Unexpected character');
  return result;
}
