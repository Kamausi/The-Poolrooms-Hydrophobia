import { describe, it, expect } from 'vitest';
import { createWaterField, ringShape, wakeStrips, onWakeArm, streaks, foamLevel, causticStrength, causticDrift, RING_SLOTS, RING_LIFE, KELVIN } from '../../src/render/waterfx.js';

describe('waterfx', () => {
  it('keeps several rings at once and reuses the oldest slot when full', () => {
    const f = createWaterField();
    for (let i = 0; i < RING_SLOTS; i++) f.impulse([i, 0, 0], 'shot', i * 0.1);
    expect(f.live(0.6)).toBe(RING_SLOTS);
    expect(f.impulse([9, 0, 9], 'splash', 0.7)).toBe(0); // the oldest
    expect(f.rings[0]).toMatchObject({ x: 9, z: 9, t0: 0.7, k: 1 });
    expect(f.live(0.7 + RING_LIFE + 1)).toBe(0);
  });
  it('rings widen and fade, then are gone', () => {
    const f = createWaterField(); f.impulse([0, 0.2, 0], 'splash', 0);
    const a = ringShape(f.rings[0], 0.1), b = ringShape(f.rings[0], 1.5);
    expect(b.radius).toBeGreaterThan(a.radius);
    expect(b.fade).toBeLessThan(a.fade);
    expect(a.at[1]).toBe(0.2);
    expect(ringShape(f.rings[0], RING_LIFE + 0.01)).toBeNull();
  });
  it('hands only strong rings to the engine ripple', () => {
    const f = createWaterField();
    f.impulse([1, 0, 1], 'step', 0);
    expect(f.strongest()).toBeNull();
    f.impulse([2, 0.5, 3], 'paddle', 1);
    expect(f.strongest()).toEqual({ at: [2, 0.5, 3], time: 1 });
  });
  it('lays the wake arms at the Kelvin angle behind the raft, scaled by speed', () => {
    const pos = [0, 0, 0], heading = [0, -1]; // moving toward -z
    const [left, right, trail] = wakeStrips(pos, heading, 6);
    for (const arm of [left, right]) {
      const tip = [arm.centre[0] * 2, 0, arm.centre[2] * 2];
      expect(onWakeArm(tip, pos, heading)).toBe(true);
      expect(tip[2]).toBeGreaterThan(0); // behind
    }
    expect(Math.abs(Math.atan2(left.centre[0], left.centre[2]))).toBeCloseTo(KELVIN, 5);
    expect(onWakeArm([0, 0, 5], pos, heading)).toBe(false); // the centre line is the trail, not an arm
    expect(trail.centre[0]).toBeCloseTo(0);
    expect(wakeStrips(pos, heading, 3)[0].length).toBeLessThan(left.length);
    expect(wakeStrips(pos, heading, 0.1)).toEqual([]);
  });
  it('carries current streaks along the span and fades them where they wrap', () => {
    const a = streaks(4, 20, 2, 0), b = streaks(4, 20, 2, 1);
    expect(b[1].along).not.toBe(a[1].along);
    for (const s of b) { expect(s.along).toBeGreaterThanOrEqual(0); expect(s.along).toBeLessThan(20); expect(Math.abs(s.side)).toBeLessThanOrEqual(0.75); }
    expect(streaks(4, 20, 0, 3).every((s) => s.fade === 0)).toBe(true); // still water carries nothing
  });
  it('makes foam from fast flow, waves and falls, not from still water', () => {
    expect(foamLevel()).toBe(0);
    expect(foamLevel({ flow: 1 })).toBe(0);
    expect(foamLevel({ flow: 5 })).toBeGreaterThan(0.3);
    expect(foamLevel({ waves: 1, falls: 1 })).toBe(1);
  });
  it('dims caustics in murky or rough water, and keeps the two sheets moving apart', () => {
    expect(causticStrength({ turbidity: 0.3 })).toBeLessThan(causticStrength({ turbidity: 0.03 }));
    expect(causticStrength({ rough: 1 })).toBeLessThan(causticStrength({}));
    expect(causticStrength({ light: 0 })).toBe(0);
    const [a, b] = causticDrift(5);
    expect(a).not.toEqual(b);
    expect(Math.max(...a.map(Math.abs), ...b.map(Math.abs))).toBeLessThanOrEqual(0.35);
  });
});
