import { describe, it, expect } from 'vitest';
import { padTables, CHORDS, SELECT, chordLabel } from '../../src/padmap.js';

const M = { hop: 0, use: 2, burst: 4, boost: 5, dressing: 8, paddle: 10, lookback: 11, recharge: 12, patch: 13, ping: 14, cycle: 15 };

describe('controller tables by context', () => {
  it('on the raft look-back is held and patch is a hold', () => {
    const t = padTables('ride', M);
    expect(t.hold[11]).toBe('x'); expect(t.edge[11]).toBeUndefined(); expect(t.edge[13]).toBeUndefined(); expect(t.patchHeld).toBe(true);
  });
  it('on foot look-back opens the survey map and patch cycles the lamp', () => {
    const t = padTables('explore', M);
    expect(t.edge[11]).toBe('m'); expect(t.edge[13]).toBe('l'); expect(t.hold[11]).toBeUndefined(); expect(t.patchHeld).toBe(false);
  });
  it('the shared actions are the same in both, and follow a rebinding', () => {
    const a = padTables('ride', M), b = padTables('explore', M);
    for (const k of [0, 2, 4, 9, 12, 8, 15]) expect(a.edge[k]).toBe(b.edge[k]);
    expect(padTables('explore', { ...M, lookback: 3 }).edge[3]).toBe('m');
  });
  it('with dressing on Select, it fires on release and Select doubles as the chord button', () => {
    expect(padTables('ride', M).dressingOnRelease).toBe(true);
    expect(padTables('ride', M).edge[SELECT]).toBeUndefined();
    const moved = padTables('ride', { ...M, dressing: 14 });
    expect(moved.dressingOnRelease).toBe(false); expect(moved.edge[14]).toBe('h');
  });
  it('the chords cover the actions that have no button of their own', () => {
    const keys = Object.values(CHORDS).map(([k]) => k).sort();
    expect(keys).toEqual(['k', 'o', 't', 'y']);
    expect(chordLabel('helm')).toBe('Select + Y'); expect(chordLabel('hop')).toBeNull();
  });
});
