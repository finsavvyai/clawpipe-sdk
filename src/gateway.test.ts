import { describe, it, expect } from 'vitest';
import { GatewayError } from './gateway';

describe('GatewayError', () => {
  it('includes status code and body', () => {
    const err = new GatewayError(500, 'Internal Server Error');
    expect(err.statusCode).toBe(500);
    expect(err.responseBody).toBe('Internal Server Error');
    expect(err.message).toContain('500');
    expect(err.message).toContain('Internal Server Error');
    expect(err.name).toBe('GatewayError');
  });

  it('handles empty body', () => {
    const err = new GatewayError(404, '');
    expect(err.message).toContain('404');
    expect(err.responseBody).toBe('');
  });

  it('truncates long body in message', () => {
    const longBody = 'x'.repeat(500);
    const err = new GatewayError(400, longBody);
    expect(err.message.length).toBeLessThan(300);
  });
});
