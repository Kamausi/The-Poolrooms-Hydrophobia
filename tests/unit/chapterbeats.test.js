import { describe, it, expect } from 'vitest';
import { BEATS, BEAT_AT, beatByTime, beatAt, floorAfter, allows, tickChapter, atLeast } from '../../src/chapterbeats.js';

describe('the reference chapter sequence', () => {
  it('five beats in the audit\'s order, by time, inside 12–18 minutes', () => {
    expect(BEATS).toEqual(['false-safety', 'mastery', 'suspicion', 'escalation', 'compromised']);
    expect(beatByTime(0)).toBe('false-safety');
    expect(beatByTime(BEAT_AT.suspicion + 1)).toBe('suspicion');
    expect(beatByTime(3600)).toBe('compromised');
    expect(BEAT_AT.compromised / 60).toBeLessThan(18);
    expect(BEAT_AT.compromised / 60).toBeGreaterThan(10);
  });
  it('what you have done raises the beat, never lowers it', () => {
    let f = floorAfter(undefined, 'dock');
    expect(beatAt(10, f)).toBe('mastery');
    f = floorAfter(f, 'decision');
    expect(beatAt(10, f)).toBe('escalation');
    expect(floorAfter('escalation', 'dock')).toBe('escalation');
    expect(beatAt(BEAT_AT.compromised, 'mastery')).toBe('compromised');
  });
  it('what each beat allows', () => {
    expect(allows('false-safety')).toEqual({ escalate: false, omens: false, lies: false, compromised: false });
    expect(allows('mastery').escalate && !allows('mastery').omens).toBe(true);
    expect(allows('suspicion').lies).toBe(true);
    expect(allows('compromised').compromised).toBe(true);
    expect(atLeast('escalation', 'suspicion')).toBe(true);
  });
  it('ticks only the reference chapter, and reports a beat once when it begins', () => {
    const other = {};
    expect(tickChapter(other, 1000)).toBeNull();
    expect(other.chapterT).toBeUndefined();
    const st = { custom: { chapter: true } };
    expect(tickChapter(st, 1)).toBeNull();
    expect(tickChapter(st, BEAT_AT.mastery)).toBe('mastery');
    expect(tickChapter(st, 1)).toBeNull();
    st.chapterFloor = 'escalation';
    expect(tickChapter(st, 0)).toBe('escalation');
    st.chapterFloor = 'false-safety';
    tickChapter(st, 0);
    expect(st.chapterBeat).toBe('escalation'); // never back
  });
});
