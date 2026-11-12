import { describe, it, expect } from 'vitest';
import { createSpring, impulse, step, settled, createRig } from '../../src/spring.js';
import { createBudget, KINDS } from '../../src/pressure.js';
import { scoreSpawns, pickSpawn } from '../../src/spawnscore.js';

describe('springs', () => {
  it('an impulse moves it and it comes back to rest', () => {
    const s = createSpring({ stiffness: 200, damping: 0.6 });
    impulse(s, 3); step(s, 0.03); expect(s.x).toBeGreaterThan(0);
    for (let i = 0; i < 200; i++) step(s, 1 / 60);
    expect(settled(s)).toBe(true);
  });
  it('low damping overshoots, critical damping does not', () => {
    const ring = createSpring({ stiffness: 150, damping: 0.3 }), crit = createSpring({ stiffness: 150, damping: 1 });
    impulse(ring, 2); impulse(crit, 2); let minR = 0, minC = 0;
    for (let i = 0; i < 300; i++) { minR = Math.min(minR, step(ring, 1 / 60)); minC = Math.min(minC, step(crit, 1 / 60)); }
    expect(minR).toBeLessThan(-0.01); expect(minC).toBeGreaterThan(-0.001);
  });
  it('is stable on a long frame and frame-rate independent', () => {
    const a = createSpring({ stiffness: 400, damping: 0.5 }), b = createSpring({ stiffness: 400, damping: 0.5 });
    impulse(a, 5); impulse(b, 5);
    for (let i = 0; i < 30; i++) step(a, 1 / 30);
    for (let i = 0; i < 60; i++) step(b, 1 / 60);
    expect(Number.isFinite(step(createSpring({ stiffness: 900 }), 0.5))).toBe(true);
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.01);
  });
  it('a rig steps every channel and can be retuned', () => {
    const r = createRig({ pitch: { stiffness: 200 }, roll: { stiffness: 80, damping: 0.4 } });
    r.kick('pitch', 2); r.kick('roll', -1); r.step(0.05);
    expect(r.get('pitch')).toBeGreaterThan(0); expect(r.get('roll')).toBeLessThan(0);
    r.tune('pitch', { stiffness: 20 }); expect(r.springs.pitch.stiffness).toBe(20);
  });
});

describe('the pressure budget', () => {
  it('only so many may commit of each kind; a free slot goes to the next', () => {
    const b = createBudget();
    expect(b.request('a', 'melee')).toBe(true); expect(b.request('b', 'melee')).toBe(true); expect(b.request('c', 'melee')).toBe(false);
    expect(b.request('a', 'melee')).toBe(true); // already holding
    expect(b.request('g', 'grab')).toBe(true); expect(b.request('h', 'grab')).toBe(false);
  });
  it('a released slot cools down before the next commits, unless the attacker is alone', () => {
    const b = createBudget();
    b.request('a', 'melee'); b.request('b', 'melee'); b.release('a');
    expect(b.request('c', 'melee', 3)).toBe(false);
    b.tick(KINDS.melee.cool + 0.01); expect(b.request('c', 'melee', 3)).toBe(true);
    const lone = createBudget(); lone.request('x', 'grab'); lone.release('x'); expect(lone.request('y', 'grab', 1)).toBe(true);
  });
  it('deeper sectors can allow more; dead holders are swept', () => {
    const b = createBudget({ extra: { melee: 1 } }); expect(b.cap('melee')).toBe(3);
    b.request('a', 'melee'); b.request('b', 'melee'); b.sweep((id) => id !== 'a'); expect(b.count('melee')).toBe(1);
    expect(b.request('z', 'nonsense')).toBe(false);
  });
});

describe('spawn scoring', () => {
  const eye = [0, 0, 0], forward = [0, 0, -1];
  const at = (x, z, id) => ({ pos: [x, 0, z], id });
  it('never prefers a place in plain sight, or one right next to you', () => {
    const c = [at(0, -10, 'front-seen'), at(0, -2, 'close'), at(3, -12, 'hidden-ahead'), at(0, 12, 'hidden-behind')];
    const visible = (p) => p[0] === 0 && p[2] < 0;
    const r = scoreSpawns(c, { eye, forward, visible, random: () => 0 });
    expect(r[0].id).toBe('hidden-ahead');
    expect(r.find((x) => x.id === 'front-seen').score).toBeLessThan(0);
    expect(r.find((x) => x.id === 'close').score).toBeLessThan(r.find((x) => x.id === 'hidden-behind').score);
  });
  it('does not use the same place twice in a row, and returns null when everything is in sight', () => {
    const c = [at(4, -10, 'a'), at(-4, -10, 'b')], recent = new Map();
    const first = pickSpawn(c, { eye, forward, visible: () => false, recent, now: 0, random: () => 0 });
    const second = pickSpawn(c, { eye, forward, visible: () => false, recent, now: 1, random: () => 0 });
    expect(second.id).not.toBe(first.id);
    expect(pickSpawn(c, { eye, forward, visible: () => true, random: () => 0 })).toBeNull();
  });
});
