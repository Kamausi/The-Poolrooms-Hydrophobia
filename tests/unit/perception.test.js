import { describe, it, expect } from 'vitest';
import { createPerceiver, sense } from '../../src/perception.js';

const run = (p, s, seconds, dt = 1 / 30) => { for (let t = 0; t < seconds; t += dt) sense(p, s, dt); return p.state; };

describe('perception', () => {
  it('a distant, unlit, silent player is not noticed; close is noticed at once', () => {
    expect(run(createPerceiver(), { seen: true, distance: 17.5, lit: 0 }, 1)).toBe('unaware');
    expect(run(createPerceiver(), { seen: true, distance: 2, lit: 0 }, 0.04)).toBe('aware');
  });
  it('seen in the open it goes from suspicious to aware; light makes it faster', () => {
    const dark = createPerceiver(), lit = createPerceiver();
    let tDark = 0, tLit = 0;
    while (sense(dark, { seen: true, distance: 9, lit: 0.1 }, 1 / 30) !== 'aware' && tDark < 20) tDark += 1 / 30;
    while (sense(lit, { seen: true, distance: 9, lit: 1 }, 1 / 30) !== 'aware' && tLit < 20) tLit += 1 / 30;
    expect(tLit).toBeLessThan(tDark); expect(tLit).toBeLessThan(2);
  });
  it('hears a shot through a wall, and remembers where it came from', () => {
    const p = createPerceiver();
    sense(p, { seen: false, distance: 8, noise: 1, at: [3, 0, 4] }, 0.2);
    expect(p.state).not.toBe('unaware'); expect(p.lastKnown).toEqual([3, 0, 4]);
  });
  it('an aware one holds on for a while after losing you, then cools to unaware', () => {
    const p = createPerceiver({ awareness: 1 });
    expect(run(p, { seen: false, distance: 30 }, 4)).toBe('aware');
    expect(run(p, { seen: false, distance: 30 }, 20)).toBe('unaware');
  });
});
