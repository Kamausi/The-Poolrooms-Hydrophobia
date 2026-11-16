import { describe, it, expect } from 'vitest';
import { createFloater, stepFloater, knock, floaterBasis } from '../../src/feel/body.js';
import { seaState, raftOnWaves } from '../../src/feel/float.js';

describe('floating body', () => {
  it('dropped from above, it settles at its waterline on still water', () => {
    const b = createFloater({ draft: 0.08 }); b.y = 0.6;
    for (let t = 0; t < 6; t += 1 / 60) stepFloater(b, [], t, 1 / 60);
    expect(b.y).toBeCloseTo(-0.08, 2);
    expect(Math.abs(b.vy)).toBeLessThan(0.01);
  });
  it('rides the waves: it follows the surface height, a little behind', () => {
    const w = seaState({ wavepool: true }), b = createFloater();
    let err = 0, n = 0;
    for (let t = 0; t < 20; t += 1 / 60) { stepFloater(b, w, t, 1 / 60); if (t > 5) { err += Math.abs(b.y + b.draft - raftOnWaves(w, b.x, b.z, t, b.half).heave); n++; } }
    expect(err / n).toBeLessThan(0.08);
  });
  it('drifts at the current, and a knock sends it aside, spinning, until the water stops it', () => {
    const b = createFloater();
    for (let t = 0; t < 5; t += 1 / 60) stepFloater(b, [], t, 1 / 60, 2);
    expect(b.vz).toBeCloseTo(2, 1);
    knock(b, 3, 0, -0.6, 4);
    const x0 = b.x;
    for (let t = 0; t < 8; t += 1 / 60) stepFloater(b, [], t, 1 / 60, 2);
    expect(b.x - x0).toBeGreaterThan(1.2);
    expect(Math.abs(b.vx)).toBeLessThan(0.01);
    expect(Math.abs(b.vs)).toBeLessThan(0.01);
    expect(b.spin).toBeGreaterThan(1);
  });
  it('is stable at 30 fps steps', () => {
    const b = createFloater(); knock(b, 5, 2, -3, 8);
    for (let t = 0; t < 10; t += 1 / 30) stepFloater(b, seaState({ wavepool: true }), t, 1 / 30);
    expect([b.x, b.y, b.roll, b.pitch].every(Number.isFinite)).toBe(true);
    expect(Math.abs(b.roll)).toBeLessThan(0.6);
  });
  it('draws with an orthonormal basis that leans with its roll', () => {
    const b = createFloater(); b.roll = 0.3;
    const { right, up, forward } = floaterBasis(b, [1, 0, 0], [0, 0, 1]);
    const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
    expect(dot(right, up)).toBeCloseTo(0, 6); expect(dot(up, forward)).toBeCloseTo(0, 6);
    expect(Math.hypot(...up)).toBeCloseTo(1, 6);
    expect(up[0]).toBeGreaterThan(0.2); // leaning toward its right side
  });
});
