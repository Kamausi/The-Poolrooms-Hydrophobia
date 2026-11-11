import { describe, it, expect } from 'vitest';
import { magnet, friction, wedge, wedges } from '../../src/aim.js';

const F = [0, 0, -1], R = [1, 0, 0], U = [0, 1, 0], T = Math.tan(Math.PI / 6), A = 16 / 9;

describe('aim magnetism', () => {
  it('does nothing away from targets and never snaps across the screen', () => {
    expect(magnet([0, 0], [[0.5, 0.5]])).toEqual([0, 0]);
    expect(magnet([0, 0], [])).toEqual([0, 0]);
    expect(magnet([0, 0], [null, [0.9, 0]])).toEqual([0, 0]);
  });
  it('pulls toward a near target, more when closer, never past it', () => {
    const far = magnet([0, 0], [[0.18, 0]]), near = magnet([0, 0], [[0.05, 0]]);
    expect(far[0]).toBeGreaterThan(0); expect(far[0]).toBeLessThan(0.18);
    expect(near[0] / 0.05).toBeGreaterThan(far[0] / 0.18);
    expect(near[0]).toBeLessThan(0.05);
  });
  it('strength zero is off', () => { expect(magnet([0, 0], [[0.05, 0]], { pull: 0 })).toEqual([0, 0]); });
  it('picks the nearest of several', () => { expect(magnet([0, 0], [[0.15, 0], [-0.05, 0]])[0]).toBeLessThan(0); });
});

describe('aim friction', () => {
  it('slows the stick over a target and not elsewhere', () => {
    expect(friction([0, 0], [[0.5, 0]])).toBe(1);
    expect(friction([0, 0], [[0, 0]])).toBeCloseTo(0.45);
    const mid = friction([0, 0], [[0.08, 0]]);
    expect(mid).toBeGreaterThan(0.45); expect(mid).toBeLessThan(1);
  });
});

describe('threat wedges', () => {
  it('nothing for a threat on screen', () => { expect(wedge([0.5, 0, -10], F, R, U, T, A)).toBeNull(); });
  it('points right for a threat off to the right, left for the left', () => {
    const r = wedge([20, 0, -5], F, R, U, T, A), l = wedge([-20, 0, -5], F, R, U, T, A);
    expect(r.x).toBeCloseTo(0.9); expect(r.angle).toBeGreaterThan(45); expect(r.angle).toBeLessThan(135); expect(r.behind).toBe(false);
    expect(l.x).toBeCloseTo(-0.9); expect(l.angle).toBeLessThan(-45);
  });
  it('a threat behind is drawn low, on its own side', () => {
    const b = wedge([0, 0, 6], F, R, U, T, A), bl = wedge([-8, 0, 3], F, R, U, T, A);
    expect(b.behind).toBe(true); expect(b.y).toBeCloseTo(-0.9); expect(Math.abs(b.x)).toBeLessThan(0.01);
    expect(bl.x).toBeCloseTo(-0.9); expect(bl.y).toBeLessThan(0);
  });
  it('keeps only the most urgent few', () => {
    const list = wedges([1, 2, 3, 4, 5].map((u) => ({ rel: [0, 0, u + 1], urgency: u })).concat([{ rel: [0, 0, -5], urgency: 99 }]), F, R, U, T, A);
    expect(list.map((w) => w.urgency)).toEqual([5, 4, 3]);
  });
});
