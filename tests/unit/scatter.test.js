import { describe, it, expect } from 'vitest';
import { takeSpread, closestPair } from '../../src/scatter.js';
import { rng } from '../../src/math.js';

const grid = (w, h) => { const out = []; for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) out.push([x, z]); return out; };

describe('scatter', () => {
  it('keeps picks at least the minimum apart while there is room', () => {
    const cells = grid(12, 12), taken = [], r = rng(7);
    for (let i = 0; i < 8; i++) takeSpread(cells, taken, r, 3);
    expect(taken).toHaveLength(8);
    expect(closestPair(taken)).toBeGreaterThanOrEqual(3);
  });
  it('spreads further than plain random picks on the same seed', () => {
    const spread = [], plain = [];
    let sum = 0, sumPlain = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const a = grid(10, 10), b = grid(10, 10), r1 = rng(seed), r2 = rng(seed), t = [];
      for (let i = 0; i < 5; i++) takeSpread(a, t, r1, 3);
      const p = Array.from({ length: 5 }, () => b.splice(Math.floor(r2() * b.length), 1)[0]);
      sum += closestPair(t); sumPlain += closestPair(p);
      spread.push(t); plain.push(p);
    }
    expect(sum).toBeGreaterThan(sumPlain);
  });
  it('is deterministic for a seed and removes what it takes', () => {
    const run = () => { const c = grid(8, 8), t = [], r = rng(42); for (let i = 0; i < 4; i++) takeSpread(c, t, r); return { t, left: c.length }; };
    expect(run()).toEqual(run());
    expect(run().left).toBe(60);
  });
  it('still hands out cells when the map is too small to keep the distance', () => {
    const cells = grid(2, 2), taken = [], r = rng(3);
    for (let i = 0; i < 4; i++) expect(takeSpread(cells, taken, r, 5)).toBeDefined();
    expect(takeSpread(cells, taken, r, 5)).toBeUndefined();
  });
});
