import { describe, it, expect } from 'vitest';
import { discLayout, createLaneRope, DISCS, SPACING } from '../../src/lanerope.js';

describe('lane rope', () => {
  it('lays a float out as a run of discs centred on its target, along the cable', () => {
    const d = discLayout([1, 2, 3], [0, 0, 1]);
    expect(d).toHaveLength(DISCS);
    const mid = d.reduce((a, x) => a + x.pos[2], 0) / d.length;
    expect(mid).toBeCloseTo(3);
    d.forEach((x) => { expect(x.pos[0]).toBe(1); expect(x.pos[1]).toBe(2); });
    expect(d[1].pos[2] - d[0].pos[2]).toBeCloseTo(SPACING);
  });
  it('alternates colour in blocks of two', () => {
    expect(discLayout([0, 0, 0], [1, 0, 0]).map((x) => x.red)).toEqual([true, true, false, false, true, true]);
  });
  it('draws every disc from one shared geometry and two materials, and hides a popped float', () => {
    const parts = [];
    const P = (name, geometry, material) => { const p = { name, geometry, material, matrix: new Float32Array(16) }; parts.push(p); return p; };
    const rope = createLaneRope(P, 'Test rope', 3);
    const discs = rope.discs.flat();
    expect(discs).toHaveLength(3 * DISCS);
    expect(new Set(discs.map((p) => p.geometry)).size).toBe(1);
    expect(new Set(discs.map((p) => p.material)).size).toBe(2);
    rope.place([-2, 0.2, 0], [2, 0.2, 0], [[-1.2, 0.2, 0], [0, 0.2, 0], [1.2, 0.2, 0]], [true, false, true]);
    expect(Math.abs(rope.discs[0][0].matrix[12] + 1.2)).toBeLessThan(0.3);
    expect(Math.hypot(...rope.discs[1][0].matrix.slice(0, 3))).toBeLessThan(0.001); // hidden: collapsed to nothing
    expect(rope.cable.matrix[13]).toBeCloseTo(0.2);
    expect(rope.anchors[0].eye.matrix[12]).toBeCloseTo(-2);
    expect(rope.all()).toHaveLength(1 + 3 * DISCS + 4);
    // No wall at the far end: no anchor bolted to thin air.
    rope.place([-2, 0.2, 0], [2, 0.2, 0], [[-1.2, 0.2, 0], [0, 0.2, 0], [1.2, 0.2, 0]], [true, true, true], () => 0, [true, false]);
    const size = (p) => Math.hypot(p.matrix[0], p.matrix[1], p.matrix[2]);
    expect(size(rope.anchors[0].plate)).toBeGreaterThan(0.01);
    expect(size(rope.anchors[1].plate)).toBeLessThan(0.001);
  });
});
