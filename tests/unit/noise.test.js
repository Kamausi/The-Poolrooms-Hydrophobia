import { describe, it, expect } from 'vitest';
import { createNoise, fbm, tubeFlicker } from '../../src/render/noise.js';

describe('noise', () => {
  it('is deterministic for a seed, different for another, and stays in range', () => {
    const a = createNoise(3), b = createNoise(3), c = createNoise(4);
    let lo = 1, hi = -1, diff = 0;
    for (let i = 0; i < 2000; i++) { const x = i * 0.137, y = i * 0.071; const v = a(x, y); lo = Math.min(lo, v); hi = Math.max(hi, v); expect(v).toBe(b(x, y)); diff += Math.abs(v - c(x, y)); }
    expect(lo).toBeGreaterThanOrEqual(-1.01); expect(hi).toBeLessThanOrEqual(1.01);
    expect(hi - lo).toBeGreaterThan(1);
    expect(diff).toBeGreaterThan(100);
  });
  it('is smooth: nearby points have nearby values', () => {
    const n = createNoise(9);
    let worst = 0;
    for (let i = 0; i < 1000; i++) worst = Math.max(worst, Math.abs(n(i * 0.31, 2.2) - n(i * 0.31 + 0.001, 2.2)));
    expect(worst).toBeLessThan(0.02);
  });
  it('fbm stays near −1..1', () => {
    const n = createNoise(2);
    for (let i = 0; i < 500; i++) expect(Math.abs(fbm(n, i * 0.21, i * 0.13, 4))).toBeLessThanOrEqual(1.01);
  });
  it('a failing tube is lit most of the time, stutters in stretches, and worse tubes are out more', () => {
    const out = (bad) => { let n = 0; for (let t = 0; t < 120; t += 1 / 30) if (tubeFlicker(t, 5, bad) < 0.5) n++; return n / (120 * 30); };
    expect(out(0.3)).toBeLessThan(0.3);
    expect(out(0.3)).toBeGreaterThan(0);
    expect(out(0.9)).toBeGreaterThan(out(0.3));
  });
});
