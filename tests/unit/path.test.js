import { describe, it, expect } from 'vitest';
import { findPath, flowField, flowStep, nextCorner, straight } from '../../src/ai/path.js';

// A wall down the middle with one gap at the bottom.
const MAP = [
  '#######',
  '#..#..#',
  '#..#..#',
  '#..#..#',
  '#.....#',
  '#######',
];
const W = MAP[0].length, H = MAP.length;
const open = (x, z) => z >= 0 && z < H && x >= 0 && x < W && MAP[z][x] !== '#';

describe('path', () => {
  it('A* goes round the wall through the gap', () => {
    const p = findPath(open, W, H, [1, 1], [5, 1]);
    expect(p[0]).toEqual([1, 1]);
    expect(p[p.length - 1]).toEqual([5, 1]);
    expect(p.some(([, z]) => z === 4)).toBe(true); // through the gap row
    for (const [x, z] of p) expect(open(x, z)).toBe(true);
  });
  it('never cuts a corner past a wall', () => {
    const p = findPath(open, W, H, [2, 3], [4, 3]);
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1], [bx, bz] = p[i];
      if (ax !== bx && az !== bz) { expect(open(bx, az)).toBe(true); expect(open(ax, bz)).toBe(true); }
    }
  });
  it('is shortest: the cost matches the flow field', () => {
    const p = findPath(open, W, H, [1, 1], [5, 1]);
    let c = 0; for (let i = 1; i < p.length; i++) c += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    const f = flowField(open, W, H, [5, 1]);
    expect(c).toBeCloseTo(f.cost[1 * W + 1], 5);
  });
  it('returns null for a goal it cannot reach or a wall', () => {
    const sealed = (x, z) => open(x, z) && !(z === 4 && x === 3);
    expect(findPath(sealed, W, H, [1, 1], [5, 1])).toBeNull();
    expect(findPath(open, W, H, [1, 1], [3, 1])).toBeNull();
  });
  it('a flow field walks every cell downhill to the goal', () => {
    const f = flowField(open, W, H, [5, 1]);
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      if (!open(x, z)) continue;
      let c = [x, z], n = 0;
      while (c && !(c[0] === 5 && c[1] === 1) && n++ < 50) c = flowStep(f, open, c[0], c[1]);
      expect(c).toEqual([5, 1]);
    }
    expect(flowStep(f, open, 5, 1)).toBeNull();
  });
  it('heads for the furthest corner it can see', () => {
    const p = findPath(open, W, H, [1, 1], [5, 1]);
    const clearAll = () => true, none = () => false;
    expect(nextCorner(p, p[0], clearAll)).toEqual(p[p.length - 1]);
    expect(nextCorner(p, p[0], none)).toEqual(p[1]);
  });
});
describe('straight', () => {
  it('sees along an open row and not through the wall', () => {
    expect(straight(open, [1, 4], [5, 4])).toBe(true);
    expect(straight(open, [1, 1], [5, 1])).toBe(false);
    expect(straight(open, [2, 3], [4, 4])).toBe(false); // would clip the end of the wall
  });
});
