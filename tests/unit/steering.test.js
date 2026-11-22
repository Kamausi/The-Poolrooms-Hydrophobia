import { describe, it, expect } from 'vitest';
import { arrive, separation, steer } from '../../src/ai/steering.js';

describe('steering', () => {
  it('arrive runs at full speed far away and eases to a stop at the target', () => {
    expect(Math.hypot(...arrive([0, 0, 0], [10, 0, 0], { maxSpeed: 3 }))).toBeCloseTo(3);
    expect(Math.hypot(...arrive([0, 0, 0], [0.8, 0, 0], { maxSpeed: 3, slow: 1.6 }))).toBeCloseTo(1.5);
    expect(arrive([0, 0, 0], [0.05, 0, 0])).toEqual([0, 0]);
  });
  it('separation pushes away from close neighbours only', () => {
    const [x] = separation([0, 0, 0], [[0.3, 0, 0]]);
    expect(x).toBeLessThan(0);
    expect(separation([0, 0, 0], [[2, 0, 0]])).toEqual([0, 0]);
    expect(Math.abs(separation([0, 0, 0], [[0.2, 0, 0]])[0])).toBeGreaterThan(Math.abs(separation([0, 0, 0], [[0.6, 0, 0]])[0]));
  });
  it('an agent reaches its point, slows into it and stays', () => {
    const a = { pos: [0, 0, 0] };
    let top = 0;
    for (let i = 0; i < 300; i++) { steer(a, [6, 0, 0], [], 1 / 60); top = Math.max(top, Math.hypot(...a.vel)); }
    expect(Math.hypot(a.pos[0] - 6, a.pos[2])).toBeLessThan(0.2);
    expect(Math.hypot(...a.vel)).toBeLessThan(0.1);
    expect(top).toBeLessThanOrEqual(3.6 + 1e-9);
  });
  it('acceleration is limited: no instant turn or start', () => {
    const a = { pos: [0, 0, 0] };
    steer(a, [10, 0, 0], [], 1 / 60, { accel: 12 });
    expect(Math.hypot(...a.vel)).toBeCloseTo(0.2, 5);
  });
  it('two agents sent to the same spot end up apart', () => {
    const a = { pos: [0, 0, 0] }, b = { pos: [0.1, 0, 2] };
    for (let i = 0; i < 400; i++) { steer(a, [3, 0, 1], [b.pos], 1 / 60); steer(b, [3, 0, 1], [a.pos], 1 / 60); }
    expect(Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2])).toBeGreaterThan(0.5);
  });
});
