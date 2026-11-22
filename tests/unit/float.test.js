import { describe, it, expect } from 'vitest';
import { omega, gerstner, seaState, raftOnWaves, buoyancy, G } from '../../src/feel/float.js';

describe('float', () => {
  it('uses deep-water dispersion: long waves are faster', () => {
    const k = 2 * Math.PI / 14;
    expect(omega(14) ** 2).toBeCloseTo(G * k, 6);
    expect(omega(36) / (2 * Math.PI / 36)).toBeGreaterThan(omega(14) / k); // phase speed grows with length
  });
  it('a single wave rises and falls by its amplitude and its slope is k·A at the zero crossing', () => {
    const w = [{ amp: 0.2, length: 10, dir: [0, 1] }];
    let hi = -1, lo = 1;
    for (let z = 0; z < 10; z += 0.05) { const h = gerstner(w, 0, z, 0).height; hi = Math.max(hi, h); lo = Math.min(lo, h); }
    expect(hi).toBeCloseTo(0.2, 2);
    expect(lo).toBeCloseTo(-0.2, 2);
    expect(gerstner(w, 0, 0, 0).slope[1]).toBeCloseTo((2 * Math.PI / 10) * 0.2, 6);
    expect(gerstner(w, 0, 0, 0).slope[0]).toBe(0);
  });
  it('the raft heaves with the water and tips toward the low side', () => {
    const w = [{ amp: 0.3, length: 20, dir: [1, 0] }];
    // At x = 0, t = 0 the surface rises toward +x: the right chamber sits higher, so the left side is down.
    const r = raftOnWaves(w, 0, 0, 0);
    expect(r.roll).toBeLessThan(0);
    expect(r.pitch).toBeCloseTo(0, 6);
    const a = raftOnWaves(w, 5, 0, 0); // on the crest
    expect(a.heave).toBeGreaterThan(0.25);
  });
  it('calm channels bob a few centimetres; the wave pool carries a real swell', () => {
    const peak = (sec) => { let m = 0; for (let t = 0; t < 60; t += 0.1) m = Math.max(m, Math.abs(raftOnWaves(seaState(sec), 0, t * 7, t).heave)); return m; };
    expect(peak({})).toBeGreaterThan(0.04);
    expect(peak({})).toBeLessThan(0.12);
    expect(peak({ wavepool: true })).toBeGreaterThan(0.18);
    expect(peak({ shallow: true })).toBeLessThan(peak({}));
  });
  it('a full raft sits level at its draft', () => {
    expect(buoyancy({ left: 100, right: 100, bow: 100, stern: 100 })).toEqual({ sink: 0, roll: 0, pitch: 0 });
  });
  it('a soft side lists the raft toward it; a soft bow puts the nose down', () => {
    const left = buoyancy({ left: 10, right: 100, bow: 100, stern: 100 });
    expect(left.roll).toBeLessThan(0); // + is right side down
    expect(buoyancy({ left: 100, right: 10, bow: 100, stern: 100 }).roll).toBeCloseTo(-left.roll, 9);
    const bow = buoyancy({ left: 100, right: 100, bow: 10, stern: 100 });
    expect(bow.pitch).toBeGreaterThan(0);
    expect(bow.roll).toBe(0);
    expect(buoyancy({ left: 100, right: 100, bow: 100, stern: 10 }).pitch).toBeLessThan(0);
  });
  it('the softer the chamber, the steeper the list and the deeper the raft sits', () => {
    const at = (v) => buoyancy({ left: v, right: 100, bow: 100, stern: 100 });
    expect(Math.abs(at(20).roll)).toBeGreaterThan(Math.abs(at(60).roll));
    expect(at(20).sink).toBeGreaterThan(at(60).sink);
    expect(buoyancy({ left: 50, right: 50, bow: 50, stern: 50 }).sink).toBeGreaterThan(at(50).sink);
  });
  it('balances: the lift under the four chambers carries the load with no turning moment', () => {
    const c = { left: 30, right: 90, bow: 55, stern: 80 };
    const b = buoyancy(c), a = 0.9, l = 1.1, draft = 0.06;
    const k = (v) => 0.15 + 0.85 * v / 100;
    const z = b.sink + draft, phi = Math.tan(b.roll), psi = Math.tan(b.pitch);
    const F = { left: k(c.left) * (z - phi * a), right: k(c.right) * (z + phi * a), bow: k(c.bow) * (z + psi * l), stern: k(c.stern) * (z - psi * l) };
    expect(F.left + F.right + F.bow + F.stern).toBeCloseTo(4 * draft, 9);
    expect((F.right - F.left) * a).toBeCloseTo(0, 9);
    expect((F.bow - F.stern) * l).toBeCloseTo(0, 9);
  });
});
