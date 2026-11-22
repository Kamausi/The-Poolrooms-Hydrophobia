import { describe, it, expect } from 'vitest';
import { noteClaim, claimLine, claimSummary, KEEP, noteReading, readingLine, KEEP_READINGS } from '../../src/fieldnotes.js';

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
