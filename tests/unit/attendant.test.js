import { describe, it, expect } from 'vitest';
import { chooseRoute, judgeRoute, GATE_SECONDS, placeName, chooseDirective, judge, nextTrust, wrongCount, createLearning, TRUST_BEFORE_LIE, LEARNED_AFTER, DOSE_GRACE } from '../../src/ai/attendant.js';
import { rng } from '../../src/math.js';

const place = { name: 'the north gallery', pos: [10, 0, 2] };
const many = (o, n = 500) => { const r = rng(4); return Array.from({ length: n }, () => chooseDirective({ random: r, place, guests: 3, ...o })); };

describe('attendant', () => {
  it('never lies in the first attraction, before trust is earned, or twice running', () => {
    expect(many({ sectorIndex: 0, trust: 5 }).some((d) => d.lie)).toBe(false);
    expect(many({ sectorIndex: 3, trust: TRUST_BEFORE_LIE - 1 }).some((d) => d.lie)).toBe(false);
    expect(many({ sectorIndex: 3, trust: 6, lastFalse: true }).some((d) => d.lie)).toBe(false);
    const trusted = many({ sectorIndex: 3, trust: TRUST_BEFORE_LIE });
    expect(trusted.some((d) => d.lie)).toBe(true);
    expect(trusted.some((d) => !d.lie)).toBe(true); // likely, never certain
  });
  it('a lie always has the wrong guest count, an honest instruction the right one', () => {
    for (const d of many({ sectorIndex: 4, trust: 4 })) {
      expect(d.lie ? d.count !== 3 : d.count === 3).toBe(true);
      expect(d.count).toBeGreaterThan(0);
      expect(d.text).toMatch(d.count === 3 ? /^Three guests/ : /^(Two|Four) guests/);
    }
    const r = rng(1);
    for (let i = 0; i < 50; i++) expect(wrongCount(1, r)).toBe(2);
  });
  it('waiting counts only if you stay; proceeding counts when you arrive; moving away is not a failure state', () => {
    const w = chooseDirective({ random: () => 0.1, guests: 2 });
    expect(w.kind).toBe('wait');
    expect(judge(w, { held: 4, t: 4 })).toBeNull();
    expect(judge(w, { held: 10, t: 10 })).toBe('complied');
    expect(judge(w, { held: 3, t: 3, moved: true })).toBe('ignored');
    const p = chooseDirective({ random: () => 0.9, guests: 2, place });
    expect(p.kind).toBe('proceed');
    expect(judge(p, { t: 5, distance: 2 })).toBe('complied');
    expect(judge(p, { t: 50, distance: 20 })).toBe('ignored');
    expect(nextTrust(2, 'complied')).toBe(3);
    expect(nextTrust(4, 'ignored')).toBe(0);
  });
  it('near the raft it closes the boarding gate; waiting it out is doing as told, trying to board is not', () => {
    const g = chooseDirective({ random: () => 0.5, guests: 2, nearExit: true, place });
    expect(g.kind).toBe('gate');
    expect(g.text).toMatch(/^Two guests, the boarding gate is closed/);
    expect(judge(g, { t: 5 })).toBeNull();
    expect(judge(g, { t: GATE_SECONDS })).toBe('complied');
    expect(judge(g, { t: 3, tried: true })).toBe('ignored');
    const lie = chooseDirective({ random: () => 0.5, guests: 2, nearExit: true, lie: true });
    expect(lie.lie && lie.count !== 2).toBe(true);
  });
  it('near a door you have opened it can lock it; waiting is doing as told, walking through is not', () => {
    const door = { name: 'code door' };
    const ds = Array.from({ length: 60 }, (_, i) => chooseDirective({ random: () => (i % 10) / 10, guests: 2, place, door }));
    expect(ds.some((d) => d.kind === 'lock')).toBe(true);
    expect(chooseDirective({ random: () => 0.5, guests: 2, place }).kind).not.toBe('lock'); // no door, no lock
    expect(chooseDirective({ random: () => 0.5, guests: 2, nearExit: true, door }).kind).toBe('gate'); // the raft first
    const l = chooseDirective({ random: () => 0.5, guests: 2, kind: 'lock', door });
    expect(l.text).toMatch(/^Two guests, the code door is locked/);
    expect(judge(l, { t: 5 })).toBeNull();
    expect(judge(l, { t: GATE_SECONDS })).toBe('complied');
    expect(judge(l, { t: 2, tried: true })).toBe('ignored');
    const lie = chooseDirective({ random: () => 0.5, guests: 2, kind: 'lock', door, lie: true });
    expect(lie.lie && lie.count !== 2).toBe(true);
  });
  it('near water it can run the dosing procedure; staying out is doing as told, being in the water after the grace is not', () => {
    const ds = Array.from({ length: 60 }, (_, i) => chooseDirective({ random: () => (i % 10) / 10, guests: 3, place, water: true }));
    expect(ds.some((d) => d.kind === 'dose')).toBe(true);
    expect(Array.from({ length: 30 }, (_, i) => chooseDirective({ random: () => (i % 10) / 10, guests: 3, place })).some((d) => d.kind === 'dose')).toBe(false);
    const d = chooseDirective({ random: () => 0.5, guests: 3, kind: 'dose', water: true });
    expect(d.text).toMatch(/^Three guests, please leave the water/);
    expect(d.grace).toBe(DOSE_GRACE);
    expect(judge(d, { t: 5 })).toBeNull();
    expect(judge(d, { t: GATE_SECONDS })).toBe('complied');
    expect(judge(d, { t: 8, tried: true })).toBe('ignored');
    const lie = chooseDirective({ random: () => 0.5, guests: 3, kind: 'dose', water: true, lie: true });
    expect(lie.lie && lie.count !== 3).toBe(true);
  });
  it('names places by compass as the survey map draws them (north is up)', () => {
    expect(placeName(0, -10)).toBe('the north gallery');
    expect(placeName(10, 2)).toBe('the east gallery');
    expect(placeName(-1, 8)).toBe('the south gallery');
    expect(placeName(-9, 3)).toBe('the west gallery');
  });
  it('one exception after the burst tell has been learned, and only one per dock', () => {
    const l = createLearning();
    for (let i = 0; i < LEARNED_AFTER - 1; i++) l.stepAway();
    expect(l.takeException()).toBe(false);
    l.stepAway();
    expect(l.takeException()).toBe(true);
    for (let i = 0; i < 10; i++) l.stepAway();
    expect(l.takeException()).toBe(false);
  });
  it('on the raft it names a channel: honest is the safest offered, false the riskiest with the wrong count', () => {
    const exits = [{ route: 'overflow', label: 'OVERFLOW' }, { route: 'public', label: 'PUBLIC ATTRACTION' }];
    const h = chooseRoute({ random: () => 0.5, guests: 3, exits, lie: false });
    expect(h.exit).toBe(1);
    expect(h.text).toBe('Three guests, please keep to the public attraction channel. The overflow channel is closed for cleaning.');
    const f = chooseRoute({ random: () => 0.5, guests: 3, exits, lie: true });
    expect(f.exit).toBe(0);
    expect(f.count).not.toBe(3);
    expect(judgeRoute(f, 0)).toBe('complied');
    expect(judgeRoute(f, 1)).toBe('ignored');
    expect(chooseRoute({ random: () => 0.5, guests: 3, exits: [{ route: 'maintenance', label: 'M' }, { route: 'overflow', label: 'O' }], lie: false }).exit).toBe(0);
    // Same rules as on foot: never false in the first attraction, before trust, or twice running.
    const r = rng(9);
    for (let i = 0; i < 200; i++) expect(chooseRoute({ random: r, guests: 2, exits, sectorIndex: 0, trust: 5 }).lie).toBe(false);
    for (let i = 0; i < 200; i++) expect(chooseRoute({ random: r, guests: 2, exits, sectorIndex: 3, trust: 5, lastFalse: true }).lie).toBe(false);
    expect(Array.from({ length: 200 }, () => chooseRoute({ random: r, guests: 2, exits, sectorIndex: 3, trust: 3 })).some((d) => d.lie)).toBe(true);
  });
});
