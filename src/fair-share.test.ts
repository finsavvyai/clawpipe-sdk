import { describe, it, expect } from 'vitest';
import { FairShare } from './fair-share';

describe('FairShare', () => {
  it('one active key gets full group quota', () => {
    const fs = new FairShare({ groupLimitPerWindow: 1000 });
    fs.record('k1');
    expect(fs.quotaFor('k1')).toBe(1000);
  });

  it('quota shrinks as more keys become active', () => {
    const fs = new FairShare({ groupLimitPerWindow: 1000 });
    fs.record('k1'); fs.record('k2'); fs.record('k3'); fs.record('k4');
    expect(fs.quotaFor('k1')).toBe(250);
  });

  it('isAllowed enforces per-key cap', () => {
    const fs = new FairShare({ groupLimitPerWindow: 3 });
    fs.record('k1'); fs.record('k1');
    expect(fs.isAllowed('k1')).toBe(true);
    fs.record('k1');
    expect(fs.isAllowed('k1')).toBe(false);
  });

  it('inactive keys drop out and quota grows back', () => {
    const fs = new FairShare({ groupLimitPerWindow: 1000, activeIfSeenWithinMs: 1 });
    fs.record('k1'); fs.record('k2');
    expect(fs.quotaFor('k1')).toBe(500);
    return new Promise<void>((resolve) => setTimeout(() => {
      fs.record('k1');
      expect(fs.quotaFor('k1')).toBe(1000);
      resolve();
    }, 5));
  });

  it('activeKeys lists recent keys', () => {
    const fs = new FairShare();
    fs.record('a'); fs.record('b');
    expect(fs.activeKeys().sort()).toEqual(['a', 'b']);
  });

  it('reset clears state', () => {
    const fs = new FairShare();
    fs.record('x');
    fs.reset();
    expect(fs.activeKeys()).toEqual([]);
  });
});
