import { describe, it, expect } from 'vitest';
import { driftStage, sideWord, OPPOSITE, pickPassed } from '../../src/ai/driftfx.js';

describe('driftfx', () => {
  it('names the Drift stages at 30, 50 and 70', () => {
    expect([0, 29, 30, 49, 50, 69, 70, 100].map(driftStage)).toEqual(['none', 'none', 'low', 'low', 'moderate', 'moderate', 'high', 'high']);
  });
  it('says where a thing is relative to your facing, in the game convention', () => {
    const f = [-Math.sin(0), -Math.cos(0)]; // yaw 0 faces -z
    expect(sideWord(f, [0, -5])).toBe('ahead');
    expect(sideWord(f, [0, 5])).toBe('behind you');
    expect(sideWord(f, [5, 0])).toBe('to your right');
    expect(sideWord(f, [-5, 0])).toBe('to your left');
    for (const w of Object.keys(OPPOSITE)) expect(OPPOSITE[OPPOSITE[w]]).toBe(w);
  });
  it('puts the moved object only on a spot you passed, at a distance, out of view', () => {
    const trail = [0, 5, 10, 20, 30, 50].map((t) => ({ t, pos: [t, 0, 0] }));
    const p = pickPassed(trail, { now: 60, me: [25, 0, 0], inView: (q) => q[0] > 25, random: () => 0 });
    expect(p).toEqual([20, 0, 0]); // 40 s ago is too long ago for [10..], [30] is in view, [50] too recent
    expect(pickPassed(trail, { now: 60, me: [25, 0, 0], inView: () => true })).toBeNull();
  });
});
