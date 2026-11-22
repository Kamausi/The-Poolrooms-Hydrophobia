import { describe, it, expect } from 'vitest';
import { createHabits, weigh, pickWeighted, ANSWERS, RAFT_ANSWERS, RAFT_SPEED } from '../../src/ai/habits.js';
import { rng } from '../../src/math.js';

const run = (frames, o) => { const h = createHabits(); for (let i = 0; i < frames; i++) h.observe({ dt: 1 / 30, ...o }); return h; };
const share = (habits, kind, kinds) => {
  const r = rng(9), w = weigh(kinds, habits); let n = 0;
  for (let i = 0; i < 2000; i++) if (pickWeighted(kinds, w, r) === kind) n++;
  return n / 2000;
};
const KINDS = ['handle', 'crack', 'lights', 'extraStep', 'drain', 'echo', 'name', 'silence'];

describe('habits', () => {
  it('a player who keeps scanning gets more things that happen outside the beam', () => {
    const calm = run(600, {}).h, scanner = run(600, { scanning: true }).h;
    expect(scanner.scanning).toBeGreaterThan(0.8);
    expect(share(scanner, 'lights', KINDS)).toBeGreaterThan(share(calm, 'lights', KINDS) * 1.8);
  });
  it('a player who rushes gets misdirection; one who lingers gets the slow omens', () => {
    const rusher = run(600, { speed: 6 }).h, lingerer = run(600, { still: true }).h;
    expect(share(rusher, 'name', KINDS)).toBeGreaterThan(share(lingerer, 'name', KINDS));
    expect(share(lingerer, 'silence', KINDS)).toBeGreaterThan(share(rusher, 'silence', KINDS));
  });
  it('after a hard fight the omens hold off, and the hold fades', () => {
    const h = createHabits();
    for (let i = 0; i < 30; i++) h.observe({ dt: 1 / 30, hurt: 2 });
    expect(h.recovery()).toBeGreaterThan(1.8);
    for (let i = 0; i < 30 * 60; i++) h.observe({ dt: 1 / 30 });
    expect(h.recovery()).toBeLessThan(1.2);
  });
  it('no weight ever drops a kind to zero, and no answer is an enemy', () => {
    const w = weigh(KINDS, run(600, { scanning: true }).h);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(1);
    for (const k of Object.keys(ANSWERS)) expect(['bloom', 'lifeguard', 'spawn'].includes(k)).toBe(false);
  });
  it('on the raft the same habits answer the raft\'s omens', () => {
    const kinds = ['lights', 'platform', 'footsteps', 'rub', 'beneath'];
    const top = (hb) => { const w = weigh(kinds, hb.h, RAFT_ANSWERS); return kinds[w.indexOf(Math.max(...w))]; };
    const scan = run(300, { scanning: true, speed: 6, fast: RAFT_SPEED }), rush = run(300, { speed: 12, fast: RAFT_SPEED }), slow = run(300, { still: true, speed: 0.5, fast: RAFT_SPEED });
    expect(['lights', 'footsteps']).toContain(top(scan));
    expect(top(rush)).toBe('platform');
    expect(['rub', 'beneath']).toContain(top(slow));
    expect(run(300, { speed: 6, fast: RAFT_SPEED }).h.rushing).toBeLessThan(0.05); // ordinary raft speed is not rushing
    for (const k of kinds) expect(RAFT_ANSWERS[k]).toBeDefined();
  });
});
