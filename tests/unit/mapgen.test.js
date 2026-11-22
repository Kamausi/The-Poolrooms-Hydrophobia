import { describe, it, expect } from 'vitest';
import { learn, collapse, solvable, generateDock, changed, kindOf } from '../../src/mapgen.js';
import { SECTORS, REFERENCE_CHAPTER } from '../../src/sectors.js';
import { rng } from '../../src/math.js';

const corpus = [...SECTORS.map((s) => s.map), REFERENCE_CHAPTER.map];

describe('mapgen', () => {
  it('learns only adjacencies that occur in the authored maps', () => {
    const r = learn([['###', '#.#', '###']]);
    expect(r.allow[1][0].has('#')).toBe(true); // floor, then wall to its right
    expect(r.allow[1][0].has('~')).toBe(false);
  });
  it('WFC fills the open cells so every pair of neighbours is one it learned', () => {
    const rules = learn(corpus);
    const fixed = Array.from({ length: 9 }, (_, z) => Array.from({ length: 11 }, (_, x) => (x === 0 || z === 0 || x === 10 || z === 8 ? '#' : null)));
    const out = collapse(rules, fixed, rng(5));
    expect(out).not.toBeNull();
    const K = ['#', '.', '~'], D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let z = 0; z < 9; z++) for (let x = 0; x < 11; x++) D.forEach(([dx, dz], d) => {
      const b = out[z + dz]?.[x + dx];
      if (b) expect(rules.allow[K.indexOf(out[z][x])][d].has(b)).toBe(true);
    });
  });
  it('every authored map passes the solvability rules', () => {
    for (const m of corpus) expect(solvable(m)).toBe(true);
  });
  it('a generated dock keeps every feature in place, changes terrain, and is solvable; same seed, same dock', () => {
    for (const s of SECTORS) {
      const a = generateDock(s.map, corpus, 3), b = generateDock(s.map, corpus, 3);
      expect(a.map).toEqual(b.map);
      expect(solvable(a.map)).toBe(true);
      for (let z = 0; z < s.map.length; z++) for (let x = 0; x < s.map[z].length; x++) {
        const c = s.map[z][x];
        if (c !== '#' && c !== '.' && c !== '~') expect(a.map[z][x]).toBe(c);
      }
      if (!a.fallback) expect(changed(a.map, s.map)).toBeGreaterThan(0);
    }
  });
  it('an unsolvable base falls back to itself', () => {
    const broken = ['#####', '#D#P#', '##S##', '#####'];
    expect(generateDock(broken, corpus, 1).fallback).toBe(true);
    expect(kindOf('u')).toBe('~');
  });
});
