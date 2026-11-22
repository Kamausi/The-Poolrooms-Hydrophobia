import { describe, it, expect } from 'vitest';
import { noteClaim, claimLine, claimSummary, KEEP, noteReading, readingLine, KEEP_READINGS, casebook } from '../../src/fieldnotes.js';

describe('field notes', () => {
  it('keep what the facility said beside how many of you there were', () => {
    const notes = [];
    noteClaim(notes, { sector: 'THE WAVE HALL', said: 3, actual: 3, what: 'wait' });
    noteClaim(notes, { sector: 'THE WAVE HALL', said: 4, actual: 3, what: 'proceed' });
    expect(claimLine(notes[0])).toBe('THE WAVE HALL · "Three guests" · it asked you to wait · there were three of you');
    expect(claimLine(notes[1])).toBe('THE WAVE HALL · "Four guests" · it sent you somewhere · there were three of you');
    expect(claimLine({ sector: 'X', said: 2, actual: 1, what: 'lock' })).toMatch(/"Two guests" · it locked a door · you were alone$/);
    expect(claimSummary(notes)).toEqual({ total: 2, off: 1 });
  });
  it('keep only the latest claims', () => {
    const notes = [];
    for (let i = 0; i < KEEP + 5; i++) noteClaim(notes, { sector: `S${i}`, said: 2, actual: 2, what: 'wait' });
    expect(notes.length).toBe(KEEP);
    expect(notes[0].sector).toBe('S5');
  });
});

describe('readings', () => {
  it('a reading enters once; reading it again only adds a line when it says something different', () => {
    const rs = [];
    expect(noteReading(rs, { sector: 'THE WAVE HALL', key: 'sign 3', label: 'SIGN', text: '"NO DIVING"' })).not.toBeNull();
    expect(noteReading(rs, { sector: 'THE WAVE HALL', key: 'sign 3', label: 'SIGN', text: '"NO DIVING"' })).toBeNull();
    const changed = noteReading(rs, { sector: 'THE WAVE HALL', key: 'sign 3', label: 'SIGN', text: '"NO DIVING, 4417"' });
    expect(changed.again).toBe(true);
    expect(rs.length).toBe(2);
    expect(readingLine(rs[0])).toBe('THE WAVE HALL · SIGN · "NO DIVING"');
    expect(readingLine(changed)).toBe('THE WAVE HALL · SIGN (read again) · "NO DIVING, 4417"');
    // The same key in another attraction is another thing.
    expect(noteReading(rs, { sector: 'THE LAZY RIVER', key: 'sign 3', label: 'SIGN', text: '"NO DIVING"' })).not.toBeNull();
    for (let i = 0; i < KEEP_READINGS + 3; i++) noteReading(rs, { sector: 'S', key: `k${i}`, label: 'X', text: 't' });
    expect(rs.length).toBe(KEEP_READINGS);
  });
});

describe('one view by attraction', () => {
  it('puts the route, what was seen, read, counted and found for each attraction reached together, newest first', () => {
    const sectors = ['THE WELCOME POOLS', 'THE LAZY RIVER', 'THE WAVE HALL', 'THE SPLASH ZONE'];
    const cb = casebook({
      sectors, sectorIndex: 2,
      ledger: { changes: ['THE WAVE HALL: the signs are addressed to you', 'THE LAZY RIVER: a door was open later'], places: ['THE WAVE HALL: the basin'] },
      readings: [{ sector: 'THE WAVE HALL', label: 'SIGN', text: '"A"' }, { sector: 'THE WAVE HALL', label: 'SIGN', text: '"B"', again: true }],
      claims: [{ sector: 'THE LAZY RIVER', said: 3, actual: 3, what: 'wait' }],
      documents: [{ title: 'MAINTENANCE NOTICE · THE WAVE HALL', text: '' }, { title: 'ROUTE DIAGRAM', text: '' }],
    });
    expect(cb.map((c) => c.name)).toEqual(['THE WAVE HALL', 'THE LAZY RIVER', 'THE WELCOME POOLS']); // not the Splash Zone: not reached
    expect(cb[0].route).toBe('YOU ARE HERE');
    expect(cb[1].route).toBe('SURVEYED');
    expect(cb[0].seen).toEqual(['the basin', 'the signs are addressed to you']);
    expect(cb[0].read.map((r) => r.text)).toEqual(['"B"', '"A"']);
    expect(cb[0].documents).toEqual(['MAINTENANCE NOTICE · THE WAVE HALL']);
    expect(cb[1].counted.length).toBe(1);
    expect(cb[2].seen.length + cb[2].read.length + cb[2].counted.length).toBe(0);
  });
});
