// The behaviour layer over perception (src/pursuit.js): what an entity does with what it knows.
import { describe, it, expect } from 'vitest';
import { createPursuit, advance } from '../../src/pursuit.js';

const perc = (state, lastKnown, sinceSensed = 0) => ({ state, lastKnown, sinceSensed });
const run = (pu, p, at, seconds, dt = 0.1) => { for (let t = 0; t < seconds; t += dt) advance(pu, p, at, dt); return pu.mode; };

describe('pursuit', () => {
  it('pursues at full pace while it can sense you, toward where it senses you', () => {
    const pu = createPursuit({ home: [0, 0, 0] });
    expect(advance(pu, perc('aware', [5, 0, 5]), [0, 0, 0], 0.1)).toBe('pursue');
    expect(pu.goal).toEqual([5, 0, 5]); expect(pu.pace).toBe(1);
  });
  it('after losing you it goes only to the last place it sensed you, then searches around it, then goes home', () => {
    const pu = createPursuit({ home: [0, 0, 0] });
    advance(pu, perc('aware', [10, 0, 0]), [0, 0, 0], 0.1);
    // Lost for longer than it holds on: it still heads for [10,0,0], never for wherever you really are now.
    advance(pu, perc('aware', [10, 0, 0], 3), [5, 0, 0], 0.1);
    expect(pu.mode).toBe('pursue'); expect(pu.goal).toEqual([10, 0, 0]);
    advance(pu, perc('aware', [10, 0, 0], 3.1), [10, 0, 0.2], 0.1);
    expect(pu.mode).toBe('search');
    const g = pu.goal; expect(Math.hypot(g[0] - 10, g[2])).toBeCloseTo(2.5, 1); // circling the spot
    expect(run(pu, perc('unaware', [10, 0, 0], 9), [10, 0, 0], 6.5)).toBe('return');
    expect(pu.goal).toEqual([0, 0, 0]);
    expect(run(pu, perc('unaware', [10, 0, 0], 20), [0.1, 0, 0], 0.2)).toBe('unaware');
  });
  it('a suspicion makes it turn and hold, then walk over slowly, then look, then search', () => {
    const pu = createPursuit({ home: [0, 0, 0] });
    expect(advance(pu, perc('suspicious', [6, 0, 0]), [0, 0, 0], 0.1)).toBe('suspicious');
    expect(pu.pace).toBe(0);
    expect(run(pu, perc('suspicious', [6, 0, 0]), [0, 0, 0], 0.7)).toBe('investigate');
    expect(pu.pace).toBe(0.5); expect(pu.goal).toEqual([6, 0, 0]);
    expect(run(pu, perc('suspicious', [6, 0, 0]), [6, 0, 0.1], 0.2)).toBe('observe');
    expect(run(pu, perc('unaware', [6, 0, 0], 4), [6, 0, 0.1], 1.6)).toBe('search');
  });
  it('the Lifeguard warns before it pursues, once per encounter', () => {
    const pu = createPursuit({ home: [0, 0, 0], profile: 'lifeguard' });
    expect(advance(pu, perc('aware', [4, 0, 0]), [0, 0, 0], 0.1)).toBe('warn');
    expect(pu.pace).toBe(0);
    expect(run(pu, perc('aware', [4, 0, 0]), [0, 0, 0], 1.6)).toBe('pursue');
    // Lose it and find it again within the same search: no second warning.
    run(pu, perc('aware', [4, 0, 0], 5), [4, 0, 0], 0.3);
    expect(pu.mode).toBe('search');
    expect(advance(pu, perc('aware', [6, 0, 0]), [4, 0, 0], 0.1)).toBe('pursue');
  });
  it('a Bloom never warns', () => {
    expect(advance(createPursuit(), perc('aware', [1, 0, 1]), [0, 0, 0], 0.1)).toBe('pursue');
  });
});
