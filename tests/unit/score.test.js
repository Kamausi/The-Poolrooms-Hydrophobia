import { describe, it, expect } from 'vitest';
import { award, hurt, incap, tick, spend, shot, debrief, ensureScore, FLOW_MAX, attendantVerdict } from '../../src/score.js';

describe('Expedition Score, FLOW and Service Credit', () => {
  it('skilled actions raise FLOW, and FLOW multiplies the next award', () => {
    const s = ensureScore({});
    const a = award(s, 'kill');
    expect(a.points).toBe(100);
    expect(s.flow).toBeGreaterThan(1);
    award(s, 'save'); award(s, 'gate');
    const b = award(s, 'kill');
    expect(b.points).toBeGreaterThan(100);
    expect(s.score).toBe(s.tally.points);
  });
  it('the signal rating and Service Credit are not multiplied', () => {
    const s = ensureScore({ flow: 4 });
    award(s, 'kill');
    expect(s.sectorScore).toBe(100);
    expect(s.credit).toBe(10);
    expect(s.score).toBe(400);
  });
  it('FLOW is capped, and damage knocks it down without resetting it', () => {
    const s = ensureScore({});
    for (let i = 0; i < 100; i++) award(s, 'save');
    expect(s.flow).toBe(FLOW_MAX);
    hurt(s, 20);
    expect(s.flow).toBeLessThan(FLOW_MAX);
    expect(s.flow).toBeGreaterThan(FLOW_MAX * 0.5);
    for (let i = 0; i < 100; i++) hurt(s, 50);
    expect(s.flow).toBeGreaterThanOrEqual(1);
  });
  it('quiet and exploration freeze FLOW; only idle time under pressure decays it', () => {
    const s = ensureScore({ flow: 5 });
    for (let t = 0; t < 600; t++) tick(s, 0.1, { pressure: false });
    expect(s.flow).toBe(5);
    for (let t = 0; t < 30; t++) tick(s, 0.1, { pressure: true });
    expect(s.flow).toBe(5); // a few seconds of grace
    for (let t = 0; t < 200; t++) tick(s, 0.1, { pressure: true });
    expect(s.flow).toBeLessThan(5);
    expect(s.flow).toBeGreaterThanOrEqual(1);
  });
  it('a crewmate going down halves the excess', () => {
    const s = ensureScore({ flow: 5 });
    incap(s);
    expect(s.flow).toBe(3);
  });
  it('credit is spent only when there is enough', () => {
    const s = ensureScore({ credit: 300 });
    expect(spend(s, 400)).toBe(false);
    expect(spend(s, 250)).toBe(true);
    expect(s.credit).toBe(50);
  });
  it('the debrief grades by what the sector asked, then starts a new tally', () => {
    const s = ensureScore({});
    for (let i = 0; i < 40; i++) { award(s, 'weak'); shot(s, true); }
    shot(s, false);
    const d = debrief(s, { par: 6000, raft: 95, crewIntact: true });
    expect(['S', 'A']).toContain(d.grade);
    expect(d.accuracy).toBeGreaterThan(0.9);
    expect(s.tally.points).toBe(0);
    const poor = debrief(ensureScore({}), { par: 6000, raft: 20, crewIntact: false });
    expect(['C', 'D']).toContain(poor.grade);
    // A careful exploration with nobody hurt is not marked down for a low score.
    const calm = debrief(ensureScore({}), { par: 6000, raft: 100, crewIntact: true, kind: 'explore' });
    expect(['A', 'B']).toContain(calm.grade);
    expect(attendantVerdict('A')).toMatch(/advanced circulation/);
  });
});

describe('DOUBLE FLOW', () => {
  it('pays twice while the window is open, and only then', () => {
    const a = award(ensureScore({ doubleT: 10 }), 'kill').points;
    const b = award(ensureScore({ doubleT: 0 }), 'kill').points;
    expect(a).toBe(b * 2);
  });
});

describe('early extraction', () => {
  it('keeps the points and credit, caps the grade at B, and the Attendant says so', () => {
    const play = () => { const s = ensureScore({}); for (let i = 0; i < 80; i++) { award(s, 'kill'); shot(s, true); } return s; };
    const full = debrief(play(), { par: 3000 }), left = debrief(play(), { par: 3000, early: true });
    expect(['S', 'A']).toContain(full.grade);
    expect(left.grade).toBe('B');
    expect(left.points).toBe(full.points);
    expect(left.early).toBe(true);
    expect(attendantVerdict(left.grade, true)).toMatch(/left before/);
    expect(attendantVerdict('B')).not.toMatch(/left before/);
  });
  it('does not raise a poor grade', () => { expect(debrief(ensureScore({}), { par: 6000, raft: 10, crewIntact: false, early: true }).grade).toMatch(/[CD]/); });
});
