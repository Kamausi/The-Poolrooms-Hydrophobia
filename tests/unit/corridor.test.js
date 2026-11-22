import { describe, it, expect } from 'vitest';
import { reachable, safeToClose, chooseClosure } from '../../src/ai/corridor.js';

// A loop (two ways round) on the left, a dead-end corridor on the right.
const MAP = [
  '#########',
  '#.....#.#',
  '#.###.#.#',
  '#.....#.#',
  '#######.#',
  '#.......#',
  '#########',
];
const W = MAP[0].length, H = MAP.length;
const open = (x, z) => MAP[z]?.[x] === '.';

describe('corridors that change', () => {
  it('counts what can be reached, with and without a cell', () => {
    expect(reachable(open, W, H, [1, 1])).toBe(12); // the loop
    expect(reachable(open, W, H, [1, 1], [3, 1])).toBe(11);
  });
  it('a cell in a loop can be closed; a cell on the only way through cannot; nor the cell you stand in', () => {
    expect(safeToClose(open, W, H, [1, 1], [3, 1])).toBe(true);
    expect(safeToClose(open, W, H, [1, 5], [7, 4])).toBe(false); // the only link to the top-right corridor
    expect(safeToClose(open, W, H, [3, 1], [3, 1])).toBe(false);
  });
  it('chooses a cell you passed a while ago that is safe, unseen and empty', () => {
    const when = { '3,1': 0, '3,3': 5, '7,4': 0 };
    const lastAt = (c) => when[c.join()];
    const base = { open, W, H, start: [1, 1], now: 40, lastAt };
    expect(chooseClosure([[7, 4], [3, 3]], { ...base, start: [1, 5] })).toBeNull(); // 7,4 is a bridge; 3,3 is not reachable from there anyway
    expect(chooseClosure([[3, 1], [3, 3]], base)).toEqual([3, 1]);
    expect(chooseClosure([[3, 1], [3, 3]], { ...base, seen: (c) => c[1] === 1 })).toEqual([3, 3]);
    expect(chooseClosure([[3, 1], [3, 3]], { ...base, busy: () => true })).toBeNull();
    expect(chooseClosure([[3, 1]], { ...base, now: 10 })).toBeNull(); // you were there too recently
    expect(chooseClosure([[5, 2]], base)).toBeNull(); // never walked there
  });
});
