// Tile ageing parameters (src/tileflavour.js): one authored tile family, varied by place, age, damp and flooding.
import { describe, it, expect } from 'vitest';
import { tileFlavour } from '../../src/tileflavour.js';
import { SECTORS } from '../../src/sectors.js';

describe('tile flavour', () => {
  it('ages deeper attractions: more off-batch tiles and cracks, duller glaze', () => {
    const young = tileFlavour({ depth: 4 }), old = tileFlavour({ depth: 40 });
    expect(old.batchTiles).toBeGreaterThan(young.batchTiles);
    expect(old.cracks).toBeGreaterThan(young.cracks);
    expect(old.glaze).toBeLessThan(young.glaze);
  });
  it('makes damp attractions stain more', () => {
    const dry = tileFlavour({ id: 'welcome-pools', depth: 8 }), damp = tileFlavour({ id: 'filtration-works', depth: 8 });
    expect(damp.stainPatches).toBeGreaterThan(dry.stainPatches);
    expect(damp.drips).toBeGreaterThan(dry.drips);
  });
  it('makes a room that stood flooded damper: more stains and drips', () => {
    const dry = tileFlavour({ depth: 8 }), wet = tileFlavour({ depth: 8 }, { flooded: 1 });
    expect(wet.stainPatches).toBeGreaterThan(dry.stainPatches);
    expect(wet.drips).toBeGreaterThan(dry.drips);
  });
  it('gives every attraction its own seed, and a flooded room a different one', () => {
    const seeds = new Set(SECTORS.map((s) => tileFlavour(s).seed));
    expect(seeds.size).toBe(SECTORS.length);
    expect(tileFlavour(SECTORS[2], { flooded: 1 }).seed).not.toBe(tileFlavour(SECTORS[2]).seed);
  });
  it('keeps every amount in a drawable range', () => {
    for (const s of SECTORS) for (const flooded of [0, 0.5, 1]) {
      const t = tileFlavour(s, { flooded });
      for (const k of ['batchStrength', 'glaze', 'stainAlpha', 'dripAlpha']) { expect(t[k]).toBeGreaterThan(0); expect(t[k]).toBeLessThan(0.5); }
      expect(t.batchTiles).toBeLessThanOrEqual(64);
    }
  });
});
