import { describe, it, expect } from 'vitest';
import { upstreamStretch, streakFlow, ringSpot, mayHappen, RING_NEAR, RING_FAR } from '../../src/ai/wrongwater.js';
import { createWaterField, ringShape, RING_LIFE } from '../../src/render/waterfx.js';

describe('water that breaks the rules', () => {
  const ranges = [{ s0: 0, s1: 50, sec: { type: 'channel', speed: 8 } }, { s0: 50, s1: 170, sec: { type: 'flume', speed: 12 } }, { s0: 170, s1: 300, sec: { type: 'lazy', speed: 5 } }];
  it('one upstream stretch inside a long fast section, never in the first attraction', () => {
    expect(upstreamStretch(ranges, { sectorIndex: 0, random: () => 0 })).toBeNull();
    const st = upstreamStretch(ranges, { sectorIndex: 2, random: () => 0 });
    expect(st[0]).toBeCloseTo(90); expect(st[1]).toBeCloseTo(130);
    expect(upstreamStretch([{ s0: 0, s1: 300, sec: { type: 'lazy', speed: 5 } }], { sectorIndex: 2 })).toBeNull();
    expect(streakFlow(8, st, 100)).toBe(-8);
    expect(streakFlow(8, st, 140)).toBe(8);
    expect(streakFlow(8, null, 100)).toBe(8);
  });
  it('an inward ring closes on its centre: it starts wide and faint and ends narrow', () => {
    const f = createWaterField();
    f.impulse([0, 0, 0], 0.9, 0, { inward: true });
    const a = ringShape(f.rings[0], 0.1), b = ringShape(f.rings[0], RING_LIFE - 0.1);
    expect(a.inward).toBe(true);
    expect(a.radius).toBeGreaterThan(b.radius);
    expect(a.fade).toBeLessThan(b.fade);
    f.impulse([0, 0, 0], 0.9, 0);
    const n0 = ringShape(f.rings[1], 0.1), n1 = ringShape(f.rings[1], 2);
    expect(n1.radius).toBeGreaterThan(n0.radius); // the normal ring still spreads
  });
  it('where it closes: in view, not underfoot, not far; once, and only when quiet', () => {
    const near = [1, 0, 0], ok = [6, 0, 0], far = [30, 0, 0];
    expect(ringSpot([near, ok, far], [0, 0, 0])).toEqual(ok);
    expect(ringSpot([ok], [0, 0, 0], () => false)).toBeNull();
    expect(RING_NEAR).toBeLessThan(RING_FAR);
    expect(mayHappen({ sectorIndex: 1, done: false, quiet: true })).toBe(true);
    expect(mayHappen({ sectorIndex: 0, done: false, quiet: true })).toBe(false);
    expect(mayHappen({ sectorIndex: 1, done: true, quiet: true })).toBe(false);
    expect(mayHappen({ sectorIndex: 1, done: false, quiet: false })).toBe(false);
  });
});
