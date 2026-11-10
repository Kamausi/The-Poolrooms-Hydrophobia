import { describe, it, expect } from 'vitest';
import { createDirector } from '../../src/director.js';
import { rng } from '../../src/math.js';

const run = (d, seconds, report = {}, dt = 0.1) => { const acts = []; for (let t = 0; t < seconds; t += dt) acts.push(...d.update(dt, report)); return acts; };

describe('pacing director', () => {
  it('rests, warns, then builds up and spawns', () => {
    const d = createDirector(rng(1), { relax: [10, 10] });
    expect(d.phase).toBe('relax');
    const acts = run(d, 12);
    expect(acts.some((a) => a.type === 'warn')).toBe(true);
    expect(['buildup', 'peak']).toContain(d.phase);
    expect(acts.some((a) => a.type === 'spawn')).toBe(true);
  });
  it('an omen holds a quiet director: no warning while it plays out', () => {
    const d = createDirector(rng(2), { relax: [4, 4] });
    d.omen(0.5, 30);
    expect(d.holding).toBe(true);
    const acts = run(d, 20);
    expect(acts.filter((a) => a.type === 'warn' || a.type === 'spawn')).toHaveLength(0);
    expect(d.phase).toBe('relax');
    expect(d.dread).toBeGreaterThan(0);
  });
  it('dread fades on its own and never spawns', () => {
    const d = createDirector(rng(3), { relax: [999, 999] });
    d.omen(1, 0);
    const acts = run(d, 60);
    expect(acts.some((a) => a.type === 'spawn')).toBe(false);
    expect(d.dread).toBeLessThan(1);
  });
  it('a crescendo starts pressure at once and ends in recovery when the fight is over', () => {
    const d = createDirector(rng(4), { relax: [30, 30] });
    d.crescendo();
    expect(d.phase).toBe('buildup');
    run(d, 40, { enemies: 3 });
    const acts = run(d, 30, { enemies: 0 });
    expect(acts.some((a) => a.type === 'recover')).toBe(true);
    expect(d.phase).toBe('relax');
  });
  it('a rescue in progress (busy) delays spawns', () => {
    const quiet = createDirector(rng(5), { relax: [0, 0] });
    const busy = createDirector(rng(5), { relax: [0, 0] });
    const a = run(quiet, 15).filter((x) => x.type === 'spawn').length;
    const b = run(busy, 15, { busy: 1 }).filter((x) => x.type === 'spawn').length;
    expect(b).toBeLessThan(a);
  });
});

describe('rng', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = rng(42), b = rng(42);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});
