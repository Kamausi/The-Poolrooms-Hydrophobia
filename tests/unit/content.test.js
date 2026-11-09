import { describe, it, expect } from 'vitest';
import { SECTORS, REFERENCE_CHAPTER } from '../../src/sectors.js';
import { buildPlan } from '../../src/plans.js';
import { rng } from '../../src/math.js';

const ALL = [...SECTORS, REFERENCE_CHAPTER];
const reach = (map, open) => {
  const g = map.map((r) => [...r]);
  const find = (ch) => { const o = []; g.forEach((r, z) => r.forEach((c, x) => c === ch && o.push([x, z]))); return o; };
  const D = find('D')[0], T = find('T');
  const seen = new Set([D.join()]); const q = [D];
  while (q.length) {
    const [x, z] = q.shift();
    const nb = [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]];
    const ti = T.findIndex(([a, b]) => a === x && b === z);
    if (ti >= 0 && T[ti ^ 1]) nb.push(T[ti ^ 1]);
    for (const [nx, nz] of nb) {
      const c = g[nz]?.[nx];
      if (!c || c === '#' || c === 'x' || c === 'o') continue;
      if (!open && (c === 'B' || c === 'K' || c === 'G')) continue;
      const k = `${nx},${nz}`;
      if (!seen.has(k)) { seen.add(k); q.push([nx, nz]); }
    }
  }
  return { seen, find };
};

describe('dock maps', () => {
  for (const s of ALL) {
    it(`${s.id}: rectangular, has a dock, an item and a machine, all reachable`, () => {
      expect(new Set(s.map.map((r) => r.length)).size).toBe(1);
      const { seen, find } = reach(s.map, true);
      for (const ch of 'DPS') expect(find(ch).length).toBeGreaterThan(0);
      for (const c of [...find('P'), ...find('S')]) expect(seen.has(c.join())).toBe(true);
    });
  }
  it('the Closed Wave Pool has its rooms: gallery, basin, annex key, window, two tower sites', () => {
    const { find } = reach(REFERENCE_CHAPTER.map, true);
    expect(find('y').length).toBeGreaterThan(10);
    expect(find('~').length).toBeGreaterThan(30);
    expect(find('L').length).toBe(2);
    expect(find('o').length).toBe(1);
    expect(find('P').every(([x]) => x <= 3)).toBe(true); // the pressure key is in the west annex
    expect(REFERENCE_CHAPTER.explore.lifeguard).toBe('inspect');
  });
});

describe('ride plans', () => {
  for (const s of SECTORS) {
    it(`${s.id}: the same seed builds the same plan, with a dock on it`, () => {
      const a = buildPlan(s, rng(11)), b = buildPlan(s, rng(11));
      const shape = (p) => JSON.stringify(p.map((i) => [i.type, i.label, i.length, i.exits?.length]));
      expect(shape(a)).toBe(shape(b));
      expect(a.some((i) => i.type === 'pool' && i.dock)).toBe(true);
    });
  }
});
