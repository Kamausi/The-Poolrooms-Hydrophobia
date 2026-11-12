import { describe, it, expect } from 'vitest';
import { planColumns, pushOutOfColumns, columnBlocks, planArches } from '../../src/poolrooms.js';
import { SECTORS, REFERENCE_CHAPTER } from '../../src/sectors.js';

const grid = (map) => { const H = map.length, W = map[0].length; const at = (x, z) => (z < 0 || z >= H || x < 0 || x >= W ? '#' : map[z][x]); return { W, H, at, isWall: (x, z) => at(x, z) === '#' }; };
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

describe('Poolrooms grammar', () => {
  it('columns only stand where four cells are open, never adjacent, never near what you must reach', () => {
    for (const s of [...SECTORS, REFERENCE_CHAPTER]) {
      const g = grid(s.map);
      const avoid = [];
      s.map.forEach((r, z) => [...r].forEach((c, x) => { if ('DSPLh'.includes(c)) avoid.push([x * 4 + 2, 0, z * 4 + 2]); }));
      const cols = planColumns({ ...g, hash, cell: 4, avoid });
      for (const c of cols) {
        const x = c.x / 4, z = c.z / 4;
        expect([g.at(x - 1, z - 1), g.at(x, z - 1), g.at(x - 1, z), g.at(x, z)].every((ch) => '.~uk'.includes(ch))).toBe(true);
        expect(avoid.every((a) => Math.hypot(a[0] - c.x, a[2] - c.z) >= 3)).toBe(true);
      }
      for (const a of cols) for (const b of cols) if (a !== b) expect(Math.abs(a.x - b.x) + Math.abs(a.z - b.z)).toBeGreaterThan(4);
    }
  });
  it('a column pushes you out and blocks a line through it', () => {
    const cols = [{ x: 4, z: 4, r: 0.6 }];
    const p = pushOutOfColumns([4.2, 0, 4], cols, 0.45);
    expect(Math.hypot(p[0] - 4, p[2] - 4)).toBeCloseTo(1.05, 5);
    expect(columnBlocks([0, 0, 4], [8, 0, 4], cols)).toBe(true);
    expect(columnBlocks([0, 0, 0], [8, 0, 0], cols)).toBe(false);
  });
  it('arches mark where a corridor opens into a wider space', () => {
    const g = grid(['#####', '#...#', '##.##', '#...#', '#####']);
    const arches = planArches({ ...g });
    expect(arches.length).toBeGreaterThan(0);
  });
});

import { planColonnade, archRadius } from '../../src/poolrooms.js';
describe('the colonnade on the raft route', () => {
  it('gives narrow, short and open-sky rooms no columns', () => {
    expect(planColonnade({ length: 60, half: 3 })).toEqual([]);
    expect(planColonnade({ length: 10, half: 8 })).toEqual([]);
    expect(planColonnade({ length: 60, half: 8, sky: true })).toEqual([]);
  });
  it('stands pairs against both walls, clear of the mouths and of the middle of the room', () => {
    const c = planColonnade({ length: 60, half: 8 });
    expect(c.length).toBeGreaterThan(0); expect(c.length).toBeLessThanOrEqual(8); expect(c.length % 2).toBe(0);
    for (const k of c) { expect(k.u).toBeGreaterThanOrEqual(4); expect(k.u).toBeLessThanOrEqual(56); expect(Math.abs(k.v)).toBeCloseTo(7.3); expect(Math.abs(k.v) + k.r).toBeLessThan(8); }
    expect(c.filter((k) => k.v < 0).length).toBe(c.length / 2);
  });
  it('an arch fits under the ceiling or is left out', () => {
    expect(archRadius(2.6, 5)).toBeCloseTo(3.15);
    expect(archRadius(4.8, 5)).toBe(0);
  });
});
