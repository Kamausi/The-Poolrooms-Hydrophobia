import { describe, it, expect } from 'vitest';
import { createObserver, stepObserver, placeObserver, choosePerch, band, REACH, LOST, UNNOTICED, MOVES } from '../../src/ai/observer.js';
import { rng } from '../../src/math.js';

const ring = (r, n = 24) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * 6.283) * r, 0, Math.sin(i / n * 6.283) * r]);

describe('observer', () => {
  it('takes only a place you are not looking at, that can see you, in its distance band', () => {
    const cands = [...ring(5), ...ring(20), ...ring(40)];
    const inView = (p) => p[0] > 0; // you are looking along +x
    for (let i = 0; i < 50; i++) {
      const p = choosePerch(cands, { me: [0, 0, 0], inView, sees: () => true, random: rng(i) });
      const d = Math.hypot(p[0], p[2]);
      expect(p[0]).toBeLessThanOrEqual(0);
      expect(d).toBeGreaterThanOrEqual(band(0)[0]); expect(d).toBeLessThanOrEqual(band(0)[1]);
    }
    expect(choosePerch(cands, { me: [0, 0, 0], inView, sees: () => false })).toBeNull();
  });
  it('comes closer with each move, never under 9 m', () => {
    for (let m = 1; m < 10; m++) expect(band(m)[1]).toBeLessThanOrEqual(band(m - 1)[1]);
    expect(band(99)[0]).toBe(9);
  });
  it('moves when you lose sight of it, when you walk towards it, or when it goes unnoticed', () => {
    let o = createObserver(); placeObserver(o, [20, 0, 0]);
    expect(stepObserver(o, { dt: 0.1, looked: true, dist: 20 })).toBe('seen');
    expect(stepObserver(o, { dt: 1, looked: true, dist: 20 })).toBeNull(); // watched, it stays
    expect(stepObserver(o, { dt: LOST - 0.1, looked: false, dist: 20 })).toBeNull();
    expect(stepObserver(o, { dt: 0.2, looked: false, dist: 20 })).toBe('move');
    o = createObserver(); placeObserver(o, [20, 0, 0]);
    expect(stepObserver(o, { dt: 0.1, looked: true, dist: REACH - 1 })).toBe('seen');
    expect(stepObserver(o, { dt: 0.1, looked: true, dist: REACH - 1 })).toBe('move');
    o = createObserver(); placeObserver(o, [20, 0, 0]);
    expect(stepObserver(o, { dt: UNNOTICED - 1, looked: false, dist: 20 })).toBeNull();
    expect(stepObserver(o, { dt: 2, looked: false, dist: 20 })).toBe('move');
  });
  it(`leaves for good after ${MOVES} places`, () => {
    const o = createObserver();
    let last = null;
    for (let i = 0; i < MOVES; i++) { placeObserver(o, [20, 0, 0]); last = stepObserver(o, { dt: 1, looked: false, dist: REACH - 2 }); }
    expect(last).toBe('leave');
  });
});
