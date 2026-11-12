import { describe, it, expect } from 'vitest';
import { assignShadows, handLamp, tilesFor, ATLAS_TILES } from '../../src/shadows.js';

const L = (x, extra = {}) => ({ position: [x, 3, 0], intensity: 10, range: 9.5, ...extra });

describe('shadow assignment', () => {
  it('the nearest fixtures cast, the rest do not', () => {
    const out = assignShadows([L(10), L(2), L(5), L(1)], [0, 1.6, 0], 2);
    expect(out.map((l) => !!l.castShadow)).toEqual([false, true, false, true]);
  });
  it('never asks for more tiles than the atlas has, counting spot lights', () => {
    for (const spots of [0, 1, 6, 8]) for (const count of [0, 1, 2, 3, 9]) {
      const out = assignShadows(Array.from({ length: 10 }, (_, i) => L(i)), [0, 0, 0], count, spots);
      expect(tilesFor(out.filter((l) => l.castShadow).length, spots)).toBeLessThanOrEqual(ATLAS_TILES);
    }
  });
  it('ignores dim and short-range lights (flashes, strips)', () => {
    const out = assignShadows([L(1, { range: 3 }), L(2, { intensity: 1 }), L(6)], [0, 0, 0], 1);
    expect(out.map((l) => !!l.castShadow)).toEqual([false, false, true]);
  });
  it('the hand lamp is a shadowed spot along the view, a little below and right of the eye', () => {
    const s = handLamp([0, 1.6, 0], [0, 0, -1], [1, 0, 0]);
    expect(s.direction).toEqual([0, 0, -1]); expect(s.castShadow).toBe(true);
    expect(s.position[0]).toBeGreaterThan(0); expect(s.position[1]).toBeLessThan(1.6);
    expect(s.angle).toBeGreaterThan(0.01); expect(s.angle).toBeLessThan(Math.PI / 2);
  });
});
