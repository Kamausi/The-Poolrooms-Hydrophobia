import { describe, it, expect } from 'vitest';
import { FRAGMENTS, TIER_PASSES, buildChain } from '../../src/postchain.js';

const INPUTS = ['sceneColor', 'sceneDepth', 'resolution', 'time'];

describe('the post chain', () => {
  it('every fragment fits the engine: size, no preprocessor, counted loops, one userPass, ASCII', () => {
    for (const [name, f] of Object.entries(FRAGMENTS)) {
      expect(new TextEncoder().encode(f).length, name).toBeLessThanOrEqual(4096);
      expect(f, name).not.toMatch(/#|\\|\bwhile\b|\bdo\b|\buniform\b|u67_/);
      expect(f.match(/vec4 userPass\(vec2 uv\)/g)?.length, name).toBe(1);
      expect(/^[\x00-\x7f]*$/.test(f), name).toBe(true);
      for (const loop of f.match(/for \([^)]*\)/g) || []) expect(loop, name).toMatch(/^for \(int i = \d+; i < \d+; i\+\+\)$/);
    }
  });
  it('every uniform a fragment reads is supplied, and nothing reuses an engine name', () => {
    for (const tier of ['medium', 'high', 'ultra']) for (const p of buildChain(tier, { drift: 50, health: 20, hurt: 1, wet: 1, under: 1, damp: 1, waterLevel: 0.2 })) {
      const names = Object.keys(p.uniforms);
      expect(names.length).toBeLessThanOrEqual(16);
      for (const n of names) { expect(n).toMatch(/^[a-z][A-Za-z0-9]{0,31}$/); expect(INPUTS).not.toContain(n); expect(p.fragment).toMatch(new RegExp(`\\b${n}\\b`)); }
      for (const v of Object.values(p.uniforms)) for (const x of [].concat(v)) expect(Number.isFinite(x)).toBe(true);
    }
  });
  it('tiers: nothing on low, grade and finish on medium, all four above, at most four', () => {
    expect(buildChain('low')).toEqual([]);
    expect(buildChain('medium').map((p) => p.name)).toEqual(['grade', 'finish']);
    expect(buildChain('high').map((p) => p.name)).toEqual(['optics', 'grade', 'fxaa', 'finish']);
    for (const t of Object.values(TIER_PASSES)) expect(t.length).toBeLessThanOrEqual(4);
  });
  it('the grade follows the game: Drift drains colour, low health and damage bring red, water tints', () => {
    const u = (g) => buildChain('high', g).find((p) => p.name === 'grade').uniforms;
    expect(u({}).drift).toBe(0); expect(u({ drift: 80 }).drift).toBeCloseTo(0.8);
    expect(u({ health: 100 }).lowHealth).toBe(0); expect(u({ health: 10 }).lowHealth).toBeGreaterThan(0.5);
    expect(u({ hurt: 1 }).hurt).toBe(1); expect(u({ hurt: 1, reduceFlash: true }).hurt).toBeLessThan(0.5);
    expect(u({ under: 2 }).under).toBe(1);
  });
  it('lens effects grow with Drift and damage, and the distortion setting removes them', () => {
    const o = (g) => buildChain('high', g).find((p) => p.name === 'optics').uniforms;
    expect(o({ drift: 100 }).aberration).toBeGreaterThan(o({}).aberration * 3);
    expect(o({ wet: 1 }).wet).toBe(1);
    expect(o({ wet: 1, drift: 100, distortion: false })).toMatchObject({ wet: 0, aberration: 0 });
  });
});
