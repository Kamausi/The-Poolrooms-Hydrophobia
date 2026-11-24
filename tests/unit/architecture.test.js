import { describe, it, expect } from 'vitest';
import { pools, planDrains, serviceRun, serviceRuns, problems, CELLS_PER_DRAIN } from '../../src/architecture.js';
import { SECTORS, REFERENCE_CHAPTER } from '../../src/sectors.js';

const map = [
  '##########',
  '#D..S...##',
  '#.~~~~~..#',
  '#.~~~~~..#',
  '#.~~~~~.~#',
  '#....#...#',
  '##########',
];
describe('the architectural credibility rules', () => {
  it('finds each pool, and gives every pool its drains, spread out', () => {
    const ps = pools(map);
    expect(ps.map((p) => p.length).sort()).toEqual([1, 15]);
    const d = planDrains(map);
    expect(d.length).toBe(Math.ceil(15 / CELLS_PER_DRAIN) + 1);
    for (const a of d) for (const b of d) if (a !== b) expect(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])).toBeGreaterThan(1);
  });
  it('runs a service pipe from a machine to the nearest pool edge over the floor', () => {
    const r = serviceRun(map, [4, 1]);
    expect(r[0]).toEqual([4, 1]);
    expect(r.length).toBe(1); // the panel stands at the pool's edge
    const dry = ['#####', '#S..#', '#...#', '#.~.#', '#####'];
    const run = serviceRun(dry, [1, 1]);
    expect(run.length).toBe(3);
    for (let i = 1; i < run.length; i++) expect(Math.abs(run[i][0] - run[i - 1][0]) + Math.abs(run[i][1] - run[i - 1][1])).toBe(1);
    expect(serviceRun(['###', '#S#', '###'], [1, 1])).toBeNull();
    expect(problems(['#####', '#S#~#', '#####'])).toEqual(['machine S at 1,1 serves no water']);
  });
  it('every authored map is credible', () => {
    for (const s of [...SECTORS, REFERENCE_CHAPTER]) {
      expect(problems(s.map), s.id).toEqual([]);
      expect(serviceRuns(s.map).length, s.id).toBeGreaterThan(0);
    }
  });
});
