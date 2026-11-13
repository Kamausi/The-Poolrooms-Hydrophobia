import { describe, it, expect } from 'vitest';
import { TIERS, TIER_ORDER, thinning, resolveTier, tierRatio, createAutoTier } from '../../src/tiers.js';

const feed = (a, ms, seconds, scale) => { let last = null; for (let t = 0; t < seconds * 1000; t += ms) last = a.push(ms, scale) || last; return last; };

describe('quality tiers', () => {
  it('each tier draws at least as much as the one below it', () => {
    for (let i = 1; i < TIER_ORDER.length; i++) { const a = TIERS[TIER_ORDER[i - 1]], b = TIERS[TIER_ORDER[i]];
      for (const k of ['samples', 'ratioCap', 'ao', 'haze', 'hazeSteps', 'lights', 'bloom']) expect(b[k], `${TIER_ORDER[i]}.${k}`).toBeGreaterThanOrEqual(a[k]); }
    expect(TIERS.ultra.lights).toBeLessThanOrEqual(16); // the engine takes 16 point lights at most
    expect(TIERS.low.depth).toBe(false); expect(TIERS.medium.depth).toBe(true);
    for (const t of Object.values(TIERS)) { expect(t.hazeSteps).toBeGreaterThanOrEqual(8); expect(t.hazeSteps).toBeLessThanOrEqual(48); if (!t.depth) { expect(t.ao).toBe(0); expect(t.haze).toBe(0); } }
  });
  it('the URL wins, then the setting; Auto starts high with a GPU and low without', () => {
    expect(resolveTier({ forced: 'low', setting: 4 })).toEqual({ tier: 'low', auto: false });
    expect(resolveTier({ setting: 2 })).toEqual({ tier: 'medium', auto: false });
    expect(resolveTier({ setting: 0 })).toEqual({ tier: 'high', auto: true });
    expect(resolveTier({ setting: 0, software: true })).toEqual({ tier: 'low', auto: false });
    expect(resolveTier({ forced: 'nonsense' }).tier).toBe('high');
  });
  it('a tier is a pixel budget: the device ratio is capped', () => {
    expect(tierRatio('high', 3)).toBe(1.5); expect(tierRatio('medium', 3)).toBe(1); expect(tierRatio('ultra', 1)).toBe(1); expect(tierRatio('low', 3)).toBe(0.6);
  });
});

describe('automatic quality', () => {
  it('holds while the render scale still has room to fall', () => {
    const a = createAutoTier();
    expect(feed(a, 30, 20, 0.8)).toBeNull();
    expect(a.tier).toBe('high');
  });
  it('drops a tier after four bad seconds at the lowest scale, and keeps dropping to the floor', () => {
    const a = createAutoTier();
    expect(feed(a, 30, 4.5, 0.5)).toBe('medium');
    feed(a, 30, 30, 0.5);
    expect(a.tier).toBe('low');
  });
  it('comes back up only after a long very good stretch at full scale, and never above its ceiling', () => {
    const a = createAutoTier({ start: 'medium' });
    expect(feed(a, 8, 20, 1)).toBeNull();
    expect(feed(a, 8, 12, 1)).toBe('high');
    feed(a, 8, 120, 1);
    expect(a.tier).toBe('high');
  });
  it('ignores a hitch', () => { const a = createAutoTier(); feed(a, 30, 2.5, 0.5); a.push(900, 0.5); feed(a, 16, 5, 0.5); expect(a.tier).toBe('high'); });
  it('thins the costliest extras first as the render scale falls, and keeps the tier at full scale', () => {
    const full = thinning('high', 1);
    expect(full).toMatchObject({ step: 0, reflection: TIERS.high.reflection, reflectionEvery: 1, shadows: TIERS.high.shadows, hazeSteps: TIERS.high.hazeSteps, particles: 1 });
    const a = thinning('high', 0.8), b = thinning('high', 0.65), c = thinning('high', 0.5);
    expect(a.reflectionEvery).toBe(2); expect(a.reflection).toBe(TIERS.high.reflection);
    expect(b.reflection).toBeLessThan(TIERS.high.reflection); expect(b.hazeSteps).toBeLessThan(TIERS.high.hazeSteps);
    expect(c.reflection).toBe(0); expect(c.shadows).toBe(0);
    expect(c.particles).toBeLessThan(b.particles); expect(b.particles).toBeLessThan(a.particles);
    expect(thinning('ultra', 0.65).shadows).toBe(1);
    for (const t of ['low', 'medium', 'high', 'ultra']) for (const k of [1, 0.8, 0.65, 0.5]) expect(thinning(t, k).hazeSteps).toBeGreaterThanOrEqual(8); // the engine's floor
  });
});

