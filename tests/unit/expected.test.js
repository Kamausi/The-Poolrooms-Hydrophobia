import { describe, it, expect } from 'vitest';
import { reservation, sevenMark, SEVEN_MARKS, crewOnMark } from '../../src/expected.js';

describe('the facility expected you', () => {
  it('the reservation holds the party that set out, booked the week Crew Seven went down, and keeps the forgotten', () => {
    const r = reservation({ party: ['mars', 'dez', 'tubs', 'june'] });
    expect(r.count).toBe(4);
    expect(r.text).toMatch(/PARTY OF 4/);
    expect(r.text).toMatch(/TEAGUE · OKORO · FERRANTE · ABERNATHY/);
    expect(r.reading).toMatch(/WEEK CREW SEVEN WENT DOWN/);
    expect(r.reading).not.toMatch(/STILL LISTED/);
    const f = reservation({ party: ['mars', 'dez', 'tubs', 'june'], forgotten: ['tubs'] });
    expect(f.count).toBe(4);
    expect(f.reading).toMatch(/STILL LISTED: FERRANTE/);
  });
  it('each dock\'s Crew Seven mark is to the next crewmate in turn, only one who is here', () => {
    const all = ['mars', 'june', 'dez', 'tubs'];
    expect([0, 1, 2, 3].map((i) => sevenMark(i, all).to)).toEqual(['mars', 'june', 'dez', 'tubs']);
    expect(sevenMark(4, all).to).toBe('mars');
    expect(sevenMark(1, ['mars', 'dez']).to).toBe('dez');
    expect(sevenMark(0, [])).toBeNull();
    expect(sevenMark(0, all).from).toBe('Caleb');
    expect(sevenMark(1, all).text).toMatch(/^JUNE\n/);
    for (const id of Object.keys(SEVEN_MARKS)) expect(crewOnMark({ to: id }).length).toBeGreaterThan(10);
  });
});
