import { describe, it, expect } from 'vitest';
import { sabine, criticalDistance, reverbFor, ROOMS, ABSORB, AIR } from '../../src/audio/acoustics.js';

describe('acoustics', () => {
  it('Sabine: RT60 = 0.161 V / A', () => {
    const r = sabine({ w: 10, h: 4, l: 10, floor: 'open', walls: 'open', ceiling: 'open' });
    const A = 100 + 100 + 160 + 4 * AIR * 400;
    expect(r.A).toBeCloseTo(A, 9);
    expect(r.rt60).toBeCloseTo((0.161 * 400) / A, 9);
  });
  it('a tiled room rings far longer than the same room with an acoustic ceiling', () => {
    const tiled = sabine({ w: 6, h: 3, l: 10 }).rt60, damped = sabine({ w: 6, h: 3, l: 10, ceiling: 'ceiling' }).rt60;
    expect(tiled).toBeGreaterThan(damped * 3);
    expect(ABSORB.tile).toBeLessThan(ABSORB.ceiling);
  });
  it('bigger rooms of the same surfaces ring longer, and air keeps them finite', () => {
    const small = sabine({ w: 4, h: 3, l: 4 }).rt60, big = sabine({ w: 40, h: 12, l: 40 }).rt60;
    expect(big).toBeGreaterThan(small);
    expect(big).toBeLessThan((0.161 * 40 * 12 * 40) / (4 * AIR * 40 * 12 * 40) + 1e-9);
  });
  it('critical distance grows with volume and shrinks with reverberation', () => {
    expect(criticalDistance(1000, 1)).toBeGreaterThan(criticalDistance(100, 1));
    expect(criticalDistance(1000, 4)).toBeLessThan(criticalDistance(1000, 1));
  });
  it('the game spaces keep their character: the hall rings longest, the Safe Room is driest', () => {
    const v = Object.fromEntries(Object.entries(ROOMS).map(([k, r]) => [k, reverbFor(r)]));
    expect(v.hall.rt60).toBeGreaterThan(v.tile.rt60);
    expect(v.tile.rt60).toBeGreaterThan(v.room.rt60);
    expect(v.dry.rt60).toBeLessThan(0.4);
    expect(v.dry.wet).toBeLessThan(v.tile.wet);
    for (const r of Object.values(v)) { expect(r.seconds).toBeGreaterThanOrEqual(0.2); expect(r.seconds).toBeLessThanOrEqual(5); expect(r.wet).toBeLessThanOrEqual(0.45); }
  });
});
