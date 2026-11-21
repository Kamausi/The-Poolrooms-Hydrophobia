import { describe, it, expect } from 'vitest';
import { reflectionMode, delayedPose, trimHistory, turnUnder, tiltFor, LAG_SECONDS } from '../../src/ai/reflection.js';

const det3 = (m) => m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);

describe('reflection', () => {
  it('follows you, then lags from moderate Drift, then acts on its own at high Drift (not in the first attraction, once)', () => {
    expect(reflectionMode(10)).toBe('follow');
    expect(reflectionMode(55, { sectorIndex: 3 })).toBe('lag');
    expect(reflectionMode(75, { sectorIndex: 3 })).toBe('own');
    expect(reflectionMode(75, { sectorIndex: 0 })).toBe('lag');
    expect(reflectionMode(75, { sectorIndex: 3, spent: true })).toBe('lag');
  });
  it('the lagging pose is the one from the delay ago', () => {
    const h = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => ({ t, feet: [t, 0, 0], yaw: t }));
    expect(delayedPose(h, 1.0, LAG_SECONDS).t).toBe(0.4);
    expect(delayedPose(h, 0.3, LAG_SECONDS).t).toBe(0); // not that old yet: the oldest
    expect(delayedPose([], 1, 0.5)).toBeNull();
    expect(trimHistory(h.slice(), 5, 2).length).toBe(1);
  });
  it('turns a part over under the surface: upside down, leaning away from you, still right-handed', () => {
    // A part 1 m above the pivot, facing +z (toward the water), identity basis.
    const m = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 1, 3, 1];
    const down = turnUnder(m(), [2, 0, 3], [0, 0, 1], 0);
    expect([down[12], down[13], down[14]].map((v) => +v.toFixed(6))).toEqual([2, -1, 3]);
    expect(down[5]).toBeCloseTo(-1); // its up points down
    expect(det3(down)).toBeGreaterThan(0);
    const flat = turnUnder(m(), [2, 0, 3], [0, 0, 1], Math.PI / 2);
    expect([flat[12], flat[13], flat[14]].map((v) => +v.toFixed(6) + 0)).toEqual([2, 0, 4]); // head away from you
    expect(flat[10]).toBeCloseTo(0); expect(flat[9]).toBeCloseTo(1); // face up
    expect(det3(flat)).toBeGreaterThan(0);
    // Leaning to fit: the head ends just above the pool floor.
    const tilt = tiltFor(0.6), lean = turnUnder([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.75, 0, 1], [0, 0, 0], [0, 0, 1], tilt);
    expect(lean[13]).toBeCloseTo(-(0.6 - 0.08), 2);
    expect(lean[14]).toBeGreaterThan(1.5);
    expect(tiltFor(3)).toBeCloseTo(0);
  });
});
