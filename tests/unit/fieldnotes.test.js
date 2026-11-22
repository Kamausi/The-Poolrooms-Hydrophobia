import { describe, it, expect } from 'vitest';
import { noteClaim, claimLine, claimSummary, KEEP } from '../../src/fieldnotes.js';

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
