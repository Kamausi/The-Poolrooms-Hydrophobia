import { describe, it, expect } from 'vitest';
import { ventRoute, ventCells, VENT_REACH } from '../../src/audio/vents.js';

const vents = [[0, 3, 0], [12, 3, 0], [40, 3, 0]];

describe('sound through vents', () => {
  it('a sound near one vent reaches a listener near another, from the listener\'s vent, quieter the longer the way', () => {
    const r = ventRoute([1, 1, 0], [11, 1.6, 0], vents);
    expect(r.at).toBe(vents[1]);
    expect(r.from).toBe(vents[0]);
    expect(r.gain).toBeGreaterThan(0.15);
    expect(r.gain).toBeLessThanOrEqual(0.8);
    const far = ventRoute([1, 1, 0], [39, 1.6, 0], vents);
    expect(far.gain).toBeLessThan(r.gain);
  });
  it('no route when either end is out of reach of a vent, when both use the same vent, or when the vent is behind a wall', () => {
    expect(ventRoute([20, 1, 0], [11, 1.6, 0], vents)).toBeNull(); // the sound is far from any vent
    expect(ventRoute([1, 1, 0], [26, 1.6, 0], vents)).toBeNull(); // you are far from any vent
    expect(ventRoute([1, 1, 0], [2, 1.6, 0], vents)).toBeNull(); // same vent: that is not through a duct
    expect(ventRoute([1, 1, 0], [11, 1.6, 0], vents, { sees: (a, b) => b !== vents[1] })).toBeNull();
    expect(VENT_REACH).toBeGreaterThan(3);
  });
  it('vents go where allowed, at the given share of cells', () => {
    const cells = Array.from({ length: 100 }, (_, i) => [i % 10, Math.floor(i / 10)]);
    const v = ventCells(cells, { ok: (x) => x !== 0, seed: (x, z) => ((x * 7 + z * 13) % 100) / 100, share: 0.2 });
    expect(v.every(([x]) => x !== 0)).toBe(true);
    expect(v.length).toBeGreaterThan(5);
    expect(v.length).toBeLessThan(30);
  });
});
