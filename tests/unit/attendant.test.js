import { describe, it, expect } from 'vitest';
import { GATE_SECONDS, placeName, chooseDirective, judge, nextTrust, wrongCount, createLearning, TRUST_BEFORE_LIE, LEARNED_AFTER } from '../../src/ai/attendant.js';
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
});
