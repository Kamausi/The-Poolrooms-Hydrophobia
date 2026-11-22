import { describe, it, expect } from 'vitest';
import { CURVES, consider, utility, choose, TARGETING } from '../../src/ai/utility.js';

const T = (o) => ({ dist: 6, toPlayer: 6, committed: false, hp: 2, grabbing: false, ...o });

describe('utility', () => {
  it('curves map 0..1 and clamp', () => {
    for (const f of Object.values(CURVES)) { expect(f(-1)).toBeGreaterThanOrEqual(0); expect(f(2)).toBeLessThanOrEqual(1); }
    expect(CURVES.inverse(0.25)).toBeCloseTo(0.75);
    expect(CURVES.logistic(0.5)).toBeCloseTo(0.5);
  });
  it('a zero consideration vetoes the option', () => {
    expect(utility({ x: 0 }, [consider((o) => o.x, 0, 1)])).toBe(0);
  });
  it('compensation: more considerations at the same value do not sink the score as fast', () => {
    const c = consider(() => 0.6, 0, 1);
    const raw3 = 0.6 ** 3;
    expect(utility({}, [c, c, c])).toBeGreaterThan(raw3);
    expect(utility({}, [c, c, c])).toBeLessThanOrEqual(1);
  });
  it('the crew shoot what is holding someone first, then what is on the player', () => {
    const far = T({ dist: 3, toPlayer: 9 }), onYou = T({ dist: 8, toPlayer: 1, committed: true }), grab = T({ dist: 9, toPlayer: 2, grabbing: true });
    expect(choose([far, onYou, grab], TARGETING).option).toBe(grab);
    expect(choose([far, onYou], TARGETING).option).toBe(onYou);
  });
  it('out of range is never chosen; equal threats go to the nearly dead one', () => {
    expect(choose([T({ dist: 15 })], TARGETING)).toBeNull();
    const a = T({ hp: 3 }), b = T({ hp: 1 });
    expect(choose([a, b], TARGETING).option).toBe(b);
  });
});
