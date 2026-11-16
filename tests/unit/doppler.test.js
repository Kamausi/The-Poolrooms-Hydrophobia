import { describe, it, expect } from 'vitest';
import { dopplerRatio, velocity, SPEED_OF_SOUND as C } from '../../src/audio/doppler.js';

describe('doppler', () => {
  it('a source coming toward a still listener is higher by c / (c − v)', () => {
    expect(dopplerRatio([10, 0, 0], [-12, 0, 0], [0, 0, 0], [0, 0, 0])).toBeCloseTo(C / (C - 12), 9);
  });
  it('going away is lower; crossing side-on is unchanged', () => {
    expect(dopplerRatio([10, 0, 0], [12, 0, 0], [0, 0, 0], [0, 0, 0])).toBeLessThan(1);
    expect(dopplerRatio([10, 0, 0], [0, 0, 12], [0, 0, 0], [0, 0, 0])).toBeCloseTo(1, 9);
  });
  it('a listener moving toward a still source hears it higher by (c + v) / c', () => {
    expect(dopplerRatio([0, 0, -30], [0, 0, 0], [0, 0, 0], [0, 0, -8])).toBeCloseTo((C + 8) / C, 9);
  });
  it('is clamped and safe at zero distance', () => {
    expect(dopplerRatio([1, 0, 0], [-1e6, 0, 0], [0, 0, 0], [0, 0, 0])).toBe(1.25);
    expect(dopplerRatio([0, 0, 0], [5, 0, 0], [0, 0, 0], [0, 0, 0])).toBe(1);
    expect(velocity([0, 0, 0], [1, 2, 3], 0.5)).toEqual([2, 4, 6]);
    expect(velocity(null, [1, 2, 3], 0.5)).toEqual([0, 0, 0]);
  });
});
